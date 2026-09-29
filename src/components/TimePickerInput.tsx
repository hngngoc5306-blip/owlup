import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerInputProps {
  value: string; // 24h format "HH:mm", e.g. "15:00", "07:30"
  onChange: (value: string) => void;
  isEn?: boolean;
  className?: string;
  variant?: 'box' | 'underline' | 'compact';
  placeholder?: string;
}

/**
 * Format 24h time ("HH:mm") to display components
 */
export const format24hToDisplay = (
  val: string,
  isEn: boolean
): { text: string; period: 'AM' | 'PM' } => {
  if (!val || val === '--:--') {
    return { text: '', period: 'AM' };
  }
  const parts = val.split(':');
  if (parts.length < 2 || parts[0] === '' || parts[1] === '') {
    return { text: '', period: 'AM' };
  }
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let displayH = h;
  if (isEn) {
    displayH = h % 12 === 0 ? 12 : h % 12;
  }

  return {
    text: `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    period,
  };
};

/**
 * Vietnamese 24-Hour Input: Pure 24h format (00:00 - 23:59), absolutely NO AM/PM
 */
const Vietnamese24hInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  variant?: 'box' | 'underline';
  placeholder?: string;
}> = ({ value = '', onChange, className = '', variant = 'box', placeholder = '00:00' }) => {
  const [text, setText] = useState<string>(value || '');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync from parent value when not actively typing
  useEffect(() => {
    if (!isFocused) {
      setText(value || '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9:]/g, '').slice(0, 5);
    setText(cleaned);

    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      if (parts.length === 2 && parts[0] !== '' && parts[1].length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          onChange(formatted);
        }
      }
    } else if (cleaned.length === 4) {
      const h = parseInt(cleaned.slice(0, 2), 10);
      const m = parseInt(cleaned.slice(2, 4), 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setText(formatted);
        onChange(formatted);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!text.trim()) {
      onChange('');
      return;
    }
    const digits = text.replace(/[^0-9]/g, '');
    let h = 0;
    let m = 0;

    if (text.includes(':')) {
      const parts = text.split(':');
      h = parseInt(parts[0], 10) || 0;
      if (parts[1]) {
        m = parts[1].length === 1 ? parseInt(parts[1], 10) * 10 : parseInt(parts[1].slice(0, 2), 10);
      }
    } else if (digits.length === 1 || digits.length === 2) {
      const num = parseInt(digits, 10);
      if (num <= 23) {
        h = num;
        m = 0;
      } else {
        h = parseInt(digits[0], 10);
        m = parseInt(digits[1], 10) * 10;
      }
    } else if (digits.length === 3) {
      h = parseInt(digits[0], 10);
      m = parseInt(digits.slice(1, 3), 10);
    } else if (digits.length >= 4) {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
    }

    h = Math.max(0, Math.min(23, h));
    m = Math.max(0, Math.min(59, m));
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setText(formatted);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = text || value || '12:00';
      const [hStr, mStr] = current.split(':');
      let h = parseInt(hStr || '12', 10);
      let m = parseInt(mStr || '0', 10);
      let totalMins = h * 60 + m;
      const step = 5;
      if (e.key === 'ArrowUp') {
        totalMins = (Math.floor(totalMins / step) * step + step) % 1440;
      } else {
        totalMins = (Math.ceil(totalMins / step) * step - step + 1440) % 1440;
      }
      const newH = Math.floor(totalMins / 60);
      const newM = totalMins % 60;
      const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      setText(formatted);
      onChange(formatted);
    }
  };

  if (variant === 'compact') {
    return (
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-24 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-sans text-base font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] focus:ring-1 focus:ring-[#4CB28E] transition-all tabular-nums ${className}`}
        maxLength={5}
      />
    );
  }

  if (variant === 'underline') {
    return (
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-transparent border-b border-slate-300 dark:border-slate-500 px-1 py-1 font-heading text-2xl sm:text-3xl font-bold text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] transition-colors tabular-nums tracking-tight ${className}`}
      />
    );
  }

  return (
    <div className={`flex-1 flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 shadow-sm focus-within:border-[#4CB28E] dark:focus-within:border-[#62D2FB] focus-within:ring-2 focus-within:ring-[#4CB28E]/20 transition-all ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none font-heading text-lg font-bold text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors p-0 tracking-wider tabular-nums"
        maxLength={5}
      />
      <Clock className="w-5 h-5 text-slate-400 shrink-0 pointer-events-none ml-2" />
    </div>
  );
};

/**
 * English 12-Hour Input: 12-hour AM/PM format (e.g. 03:45 PM)
 */
const English12hInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  variant?: 'box' | 'underline' | 'compact';
}> = ({ value = '', onChange, className = '', variant = 'box' }) => {
  if (variant === 'compact') {
    return (
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-36 min-w-[136px] text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 font-sans text-base font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] focus:ring-1 focus:ring-[#4CB28E] transition-all cursor-pointer dark:[color-scheme:dark] ${className}`}
      />
    );
  }

  if (variant === 'underline') {
    return (
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent border-b border-slate-300 dark:border-slate-500 px-1 py-1 font-heading text-2xl sm:text-3xl font-bold text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] transition-colors cursor-pointer dark:[color-scheme:dark] tabular-nums tracking-tight ${className}`}
      />
    );
  }

  return (
    <input
      type="time"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`flex-1 bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 font-heading text-lg font-bold text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB] focus:ring-2 focus:ring-[#4CB28E]/20 shadow-sm transition-all cursor-pointer dark:[color-scheme:dark] ${className}`}
    />
  );
};

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value = '',
  onChange,
  isEn = false,
  className = '',
  variant = 'box',
  placeholder = '--:--',
}) => {
  if (isEn) {
    return (
      <English12hInput
        value={value}
        onChange={onChange}
        className={className}
        variant={variant}
      />
    );
  }

  return (
    <Vietnamese24hInput
      value={value}
      onChange={onChange}
      className={className}
      variant={variant}
      placeholder={placeholder === '--:--' ? '00:00' : placeholder}
    />
  );
};
