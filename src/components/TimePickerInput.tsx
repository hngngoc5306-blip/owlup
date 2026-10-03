import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';

export interface TimePickerInputProps {
  value: string; // Stored as 24h "HH:mm", e.g. "18:00", "09:30"
  onChange: (value: string) => void;
  onRangeDetected?: (start: string, end: string) => void;
  isEn?: boolean;
  className?: string;
  variant?: 'box' | 'underline' | 'compact';
  placeholder?: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES_COMMON = ['00', '15', '30', '45'];

// ─── PURE HELPERS (no Date objects, no timezone) ──────────────────────────────

/** Strip non-digits from "HH:mm" → max 4 digit string. "12:00" → "1200" */
export const digitsFrom24 = (val24: string): string =>
  (val24 || '').replace(/\D/g, '').slice(0, 4);

/**
 * 4-digit buffer → "HH:mm". No Date, no timezone.
 * "1200" → "12:00", "0905" → "09:05", "2359" → "23:59"
 * Returns null if HH > 23 or MM > 59.
 */
export const digits4To24 = (d: string): string | null => {
  if (d.length !== 4) return null;
  const h = parseInt(d.slice(0, 2), 10);
  const m = parseInt(d.slice(2, 4), 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** English 12h display. Only for complete 4-digit values. */
export const formatDisplayString = (val24: string, isEn: boolean): string => {
  if (!val24 || !val24.includes(':')) return val24 || '';
  if (!isEn) return val24;
  const [hStr, mStr = '00'] = val24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || h < 0 || h > 23 || isNaN(m)) return val24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Normalise any user-typed format → "HH:mm" (24h) or null.
 * NEVER uses Date objects.
 */
export const normalizeTimeString = (raw: string): string | null => {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  // 1. AM/PM: "6pm", "6:30pm", "6:30 pm", "12am"
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([ap]m)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPM = ampmMatch[3] === 'pm';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  // 2. Vietnamese "h": "18h" → "18:00", "18h30" → "18:30"
  const hMatch = s.match(/^(\d{1,2})\s*h\s*(\d{0,2})$/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const mRaw = hMatch[2];
    const m = mRaw ? (mRaw.length === 1 ? parseInt(mRaw + '0', 10) : parseInt(mRaw, 10)) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  // 3. Colon notation: "18:00", "9:05", "18:"
  if (s.includes(':')) {
    const [hStr, mStr = '00'] = s.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(m) && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  // 4. Raw digits: 1–4 digits
  const digits = s.replace(/\D/g, '');
  if (digits.length === 1 || digits.length === 2) {
    const h = parseInt(digits, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    return null;
  }
  if (digits.length === 3) {
    const h = parseInt(digits.slice(0, 1), 10);
    const m = parseInt(digits.slice(1), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }
  if (digits.length === 4) return digits4To24(digits);
  return null;
};

/** Detect range strings like "11h - 18h", "11:00 - 18:00", "11 đến 18" */
export const parseTimeRangeString = (raw: string): { start: string; end: string } | null => {
  if (!raw) return null;
  const match = raw
    .trim()
    .match(/^(\d{1,2}(?::\d{2}|h\d{0,2})?)[\s]*(?:-|–|—|to|đến)[\s]*(\d{1,2}(?::\d{2}|h\d{0,2})?)$/i);
  if (!match) return null;
  const start = normalizeTimeString(match[1]);
  const end = normalizeTimeString(match[2]);
  if (start && end) return { start, end };
  return null;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value = '',
  onChange,
  onRangeDetected,
  isEn = false,
  className = '',
  variant = 'box',
  placeholder = '--:--',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  // Helper to parse external 24h string into { h, m, p }
  const parseVal = (v: string): { h: string; m: string; p: 'AM' | 'PM' } => {
    if (!v) return { h: '', m: '', p: 'PM' };
    const norm = normalizeTimeString(v) || v;
    if (norm.includes(':')) {
      const [hStr, mStr = '00'] = norm.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      if (isNaN(h)) return { h: '', m: '', p: 'PM' };
      const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
      if (isEn) {
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return {
          h: String(h12).padStart(2, '0'),
          m: String(m).padStart(2, '0'),
          p,
        };
      }
      return {
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        p,
      };
    }
    return { h: '', m: '', p: 'PM' };
  };

  const initial = parseVal(value);
  const [hour, setHour] = useState<string>(initial.h);
  const [minute, setMinute] = useState<string>(initial.m);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.p);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>(initial.p);
  const isInteractingRef = useRef(false);

  // Sync state from external `value` prop when user is not actively editing
  useEffect(() => {
    if (!isInteractingRef.current) {
      const parsed = parseVal(value);
      setHour(parsed.h);
      setMinute(parsed.m);
      setPeriod(parsed.p);
      setClockPeriod(parsed.p);
    }
  }, [value, isEn]);

  // Close clock popover on outside click
  useEffect(() => {
    if (!isClockOpen) return;
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsClockOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [isClockOpen]);

  // Emit 24h string to parent
  const emit = (hStr: string, mStr: string, p: 'AM' | 'PM' = period) => {
    if (hStr.length === 2 && mStr.length === 2) {
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (isNaN(h) || isNaN(m)) return;
      if (isEn) {
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
      }
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange(v24);
      }
    } else if (!hStr && !mStr) {
      onChange('');
    }
  };

  // Step ±N minutes
  const stepTime = (deltaMinutes: number) => {
    const curH = parseInt(hour, 10) || 0;
    const curM = parseInt(minute, 10) || 0;
    let h24 = curH;
    if (isEn) {
      if (period === 'PM' && h24 < 12) h24 += 12;
      if (period === 'AM' && h24 === 12) h24 = 0;
    }
    let total = h24 * 60 + curM + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    const v24 = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    const parsed = parseVal(v24);
    setHour(parsed.h);
    setMinute(parsed.m);
    setPeriod(parsed.p);
    setClockPeriod(parsed.p);
    onChange(v24);
  };

  // Hour input change
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Check for range detection (pasted)
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        const parsed = parseVal(range.start);
        setHour(parsed.h);
        setMinute(parsed.m);
        setPeriod(parsed.p);
        onChange(range.start);
        return;
      }
    }

    // Check for full time string pasted (e.g. "18:00" or "18h30")
    const norm = normalizeTimeString(raw);
    if (norm && norm.includes(':')) {
      const parsed = parseVal(norm);
      setHour(parsed.h);
      setMinute(parsed.m);
      setPeriod(parsed.p);
      emit(parsed.h, parsed.m, parsed.p);
      return;
    }

    const clean = raw.replace(/\D/g, '');
    if (clean.length === 0) {
      setHour('');
      emit('', minute);
      return;
    }

    if (clean.length === 1) {
      const num = parseInt(clean, 10);
      // In 24h mode, hours are 00-23. If user types 3-9, it can never have a 2nd digit.
      // Auto-pad to "03", "04", ... "09" and advance to minute!
      if (!isEn && num >= 3 && num <= 9) {
        const padded = '0' + clean;
        setHour(padded);
        minuteRef.current?.focus();
        minuteRef.current?.select();
        emit(padded, minute);
      } else if (isEn && num >= 2 && num <= 9) {
        // In 12h mode, hours are 01-12. If user types 2-9, auto-pad to "02".."09"
        const padded = '0' + clean;
        setHour(padded);
        minuteRef.current?.focus();
        minuteRef.current?.select();
        emit(padded, minute);
      } else {
        setHour(clean);
      }
      return;
    }

    // 2 or more digits:
    let h = parseInt(clean.slice(0, 2), 10);
    if (!isEn && h > 23) h = 23;
    if (isEn && h > 12) h = 12;
    const hStr = String(h).padStart(2, '0');
    setHour(hStr);

    // If more digits were typed (e.g. typing fast "1120" into hour field):
    if (clean.length >= 3) {
      let m = parseInt(clean.slice(2, 4), 10);
      if (m > 59) m = 59;
      const mStr = String(m).padStart(2, '0');
      setMinute(mStr);
      emit(hStr, mStr);
      minuteRef.current?.focus();
      return;
    }

    // Advance to minute
    minuteRef.current?.focus();
    minuteRef.current?.select();
    emit(hStr, minute);
  };

  // Hour key navigation
  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Escape') {
      setIsClockOpen(false);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }
    if (e.key === ':' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (hour.length === 1) {
        const padded = '0' + hour;
        setHour(padded);
        emit(padded, minute);
      }
      minuteRef.current?.focus();
      minuteRef.current?.select();
      return;
    }
    // Vietnamese shorthand "18h"
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      if (hour) {
        let h = parseInt(hour, 10);
        if (!isEn && h > 23) h = 23;
        if (isEn && h > 12) h = 12;
        const hStr = String(h).padStart(2, '0');
        setHour(hStr);
        setMinute('00');
        emit(hStr, '00');
      }
    }
  };

  // Minute input change
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Check for range detection
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        const parsed = parseVal(range.start);
        setHour(parsed.h);
        setMinute(parsed.m);
        setPeriod(parsed.p);
        onChange(range.start);
        return;
      }
    }

    // Check for full time string pasted
    const norm = normalizeTimeString(raw);
    if (norm && norm.includes(':')) {
      const parsed = parseVal(norm);
      setHour(parsed.h);
      setMinute(parsed.m);
      setPeriod(parsed.p);
      emit(parsed.h, parsed.m, parsed.p);
      return;
    }

    const clean = raw.replace(/\D/g, '');
    if (clean.length === 0) {
      setMinute('');
      emit(hour, '');
      return;
    }

    if (clean.length === 1) {
      const num = parseInt(clean, 10);
      // Minutes tens can only be 0-5. If user types 6-9, auto-pad to "06".."09"
      if (num >= 6) {
        const padded = '0' + clean;
        setMinute(padded);
        emit(hour, padded);
      } else {
        setMinute(clean);
      }
      return;
    }

    // 2 or more digits:
    let m = parseInt(clean.slice(0, 2), 10);
    if (m > 59) m = 59;
    const mStr = String(m).padStart(2, '0');
    setMinute(mStr);
    emit(hour, mStr);
  };

  // Minute key navigation
  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Escape') {
      setIsClockOpen(false);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }
    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if ((input.selectionStart ?? 0) === 0) {
        e.preventDefault();
        hourRef.current?.focus();
        hourRef.current?.select();
        return;
      }
    }
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (minute.length === 0 || (start === 0 && end === minute.length)) {
        e.preventDefault();
        setMinute('');
        hourRef.current?.focus();
        return;
      }
    }
  };

  // Blur handlers
  const handleHourBlur = () => {
    isInteractingRef.current = false;
    if (hour.length === 1) {
      const padded = '0' + hour;
      setHour(padded);
      emit(padded, minute);
    }
  };

  const handleMinuteBlur = () => {
    isInteractingRef.current = false;
    if (minute.length === 1) {
      const padded = minute.padStart(2, '0');
      setMinute(padded);
      emit(hour, padded);
    }
  };

  // Global paste handler on container
  const handleContainerPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        e.preventDefault();
        onRangeDetected(range.start, range.end);
        const parsed = parseVal(range.start);
        setHour(parsed.h);
        setMinute(parsed.m);
        setPeriod(parsed.p);
        onChange(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm && norm.includes(':')) {
      e.preventDefault();
      const parsed = parseVal(norm);
      setHour(parsed.h);
      setMinute(parsed.m);
      setPeriod(parsed.p);
      emit(parsed.h, parsed.m, parsed.p);
      return;
    }
  };

  // Container click: focuses appropriate input
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'SPAN') {
      if (!hour) {
        hourRef.current?.focus();
      } else if (!minute) {
        minuteRef.current?.focus();
      } else {
        hourRef.current?.focus();
        hourRef.current?.select();
      }
    }
  };

  // Clock picker selection
  const selectFromClock = (hStr: string, mStr: string = '00', p?: 'AM' | 'PM') => {
    const chosenPeriod = p ?? clockPeriod;
    let v24: string;
    if (isEn) {
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      if (chosenPeriod === 'PM' && h < 12) h += 12;
      if (chosenPeriod === 'AM' && h === 12) h = 0;
      v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      v24 = `${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}`;
    }
    const parsed = parseVal(v24);
    setHour(parsed.h);
    setMinute(parsed.m);
    setPeriod(parsed.p);
    setClockPeriod(parsed.p);
    onChange(v24);
    setIsClockOpen(false);
  };

  // Clock popover
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal =
      (hour && minute ? `${hour}:${minute}` : null) ||
      normalizeTimeString(value) ||
      '12:00';
    const [curH, curM] = curVal.split(':');

    return (
      <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl w-80 max-w-[95vw] animate-fade-in left-0 sm:left-auto sm:right-0 top-full">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#007b4d] dark:text-[#62D2FB]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isEn ? '12H Clock Picker' : 'Bảng Đồng Hồ 24 Giờ'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsClockOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AM/PM (English only) */}
        {isEn && (
          <div className="flex gap-2 mb-3">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setClockPeriod(p)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  clockPeriod === p
                    ? 'bg-[#007b4d] dark:bg-[#62D2FB] text-white dark:text-[#0E172A] border-transparent shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {p === 'AM' ? 'AM (Sáng)' : 'PM (Chiều/Tối)'}
              </button>
            ))}
          </div>
        )}

        {/* Hour grid */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
            <span>{isEn ? 'Select Hour' : 'Chọn Giờ (00–23)'}</span>
            <span className="text-[#007b4d] dark:text-[#62D2FB] font-medium">
              {isEn ? 'Click to set' : 'Bấm để chọn'}
            </span>
          </div>
          <div className={`grid gap-1 ${isEn ? 'grid-cols-4' : 'grid-cols-6'}`}>
            {(isEn ? HOURS_12 : HOURS_24).map((h) => {
              const isSelected = isEn
                ? (parseInt(curH, 10) % 12 === 0 ? 12 : parseInt(curH, 10) % 12) === parseInt(h, 10)
                : curH === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => selectFromClock(h, curM || '00', clockPeriod)}
                  className={`py-1.5 rounded-xl text-xs font-bold tabular-nums transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#007b4d] dark:bg-[#62D2FB] text-white dark:text-[#0E172A] shadow-sm scale-105'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-[#62D2FB]/20 text-slate-700 dark:text-slate-300 hover:text-[#007b4d] dark:hover:text-[#62D2FB]'
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minute grid */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {isEn ? 'Select Minute' : 'Chọn Phút'}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MINUTES_COMMON.map((m) => {
              const isSelected = curM === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectFromClock(curH || '12', m, clockPeriod)}
                  className={`py-1.5 rounded-xl text-xs font-bold tabular-nums transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm scale-105'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600'
                  }`}
                >
                  :{m}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Placeholders for segments
  const placeholderParts = placeholder.includes(':') ? placeholder.split(':') : ['--', '--'];
  const hPlaceholder = placeholderParts[0] || '--';
  const mPlaceholder = placeholderParts[1] || '--';

  // Render inputs with PERMANENT colon (never deleted, never missing, fixed from start to finish)
  const renderSegments = (sizeClass: string, colonSizeClass: string, isUnderline = false) => (
    <div className={`flex items-center gap-0.5 font-heading font-bold tabular-nums ${isUnderline ? 'w-full' : ''}`}>
      <input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        value={hour}
        onChange={handleHourChange}
        onKeyDown={handleHourKeyDown}
        onFocus={() => {
          isInteractingRef.current = true;
          hourRef.current?.select();
        }}
        onBlur={handleHourBlur}
        placeholder={hPlaceholder}
        maxLength={4}
        autoComplete="off"
        spellCheck={false}
        className={`${sizeClass} text-center bg-transparent outline-none p-0 tracking-wider text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors`}
      />
      <span className={`font-bold select-none text-slate-400 dark:text-slate-500 ${colonSizeClass} px-0.5`}>
        :
      </span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        value={minute}
        onChange={handleMinuteChange}
        onKeyDown={handleMinuteKeyDown}
        onFocus={() => {
          isInteractingRef.current = true;
          minuteRef.current?.select();
        }}
        onBlur={handleMinuteBlur}
        placeholder={mPlaceholder}
        maxLength={2}
        autoComplete="off"
        spellCheck={false}
        className={`${sizeClass} text-center bg-transparent outline-none p-0 tracking-wider text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors`}
      />
      {isEn && (
        <button
          type="button"
          onClick={() => {
            const nextP = period === 'AM' ? 'PM' : 'AM';
            setPeriod(nextP);
            setClockPeriod(nextP);
            emit(hour, minute, nextP);
          }}
          className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-[#007b4d] dark:text-[#62D2FB] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none"
        >
          {period}
        </button>
      )}
    </div>
  );

  // ─── Variant: Compact ─────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onPaste={handleContainerPaste}
        className={`relative inline-flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-[#1F2937] dark:text-white focus-within:border-[#4CB28E] dark:focus-within:border-[#62D2FB] focus-within:ring-1 focus-within:ring-[#4CB28E] transition-all ${className}`}
      >
        {renderSegments('w-6 sm:w-7 text-sm sm:text-base', 'text-sm sm:text-base')}
        {renderClockPicker()}
      </div>
    );
  }

  // ─── Variant: Underline ───────────────────────────────────────────────────────
  if (variant === 'underline') {
    return (
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onPaste={handleContainerPaste}
        className={`relative w-full flex items-center justify-between border-b border-slate-300 dark:border-slate-500 pb-1 ${className}`}
      >
        {renderSegments('w-9 sm:w-11 text-2xl sm:text-3xl', 'text-2xl sm:text-3xl', true)}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => stepTime(5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => stepTime(-5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsClockOpen(!isClockOpen)}
            title={isEn ? 'Open clock picker' : 'Mở bảng đồng hồ'}
            className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {renderClockPicker()}
      </div>
    );
  }

  // ─── Variant: Box (Default) ───────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onPaste={handleContainerPaste}
      className={`relative flex-1 flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm focus-within:border-[#007b4d] dark:focus-within:border-[#62D2FB] focus-within:ring-2 focus-within:ring-[#007b4d]/20 transition-all ${className}`}
    >
      {renderSegments('w-7 sm:w-8 text-base sm:text-lg', 'text-base sm:text-lg')}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => stepTime(5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => stepTime(-5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsClockOpen(!isClockOpen)}
          title={isEn ? 'Open clock picker' : 'Mở bảng đồng hồ'}
          className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1 rounded-lg transition-colors cursor-pointer"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>
      {renderClockPicker()}
    </div>
  );
};
