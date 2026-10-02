import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';

export interface TimePickerInputProps {
  value: string; // Chuẩn lưu trữ 24h: "HH:mm", ví dụ: "18:00", "09:30"
  onChange: (value: string) => void;
  onRangeDetected?: (start: string, end: string) => void;
  isEn?: boolean;
  className?: string;
  variant?: 'box' | 'underline' | 'compact';
  placeholder?: string;
}

// Bảng số giờ 24h (Tiếng Việt)
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// Bảng số giờ 12h (Tiếng Anh)
const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

// Bảng số phút thông dụng
const MINUTES_COMMON = ['00', '15', '30', '45'];

/**
 * Chuẩn hóa các định dạng thời gian người dùng gõ bằng bàn phím:
 * - "18" -> "18:00"
 * - "18h" -> "18:00"
 * - "18h30" -> "18:30"
 * - "9h" -> "09:00"
 * - "9h15" -> "09:15"
 * - "6pm" -> "18:00"
 * - "1200" -> "12:00"
 * - "1130" -> "11:30"
 * - "0905" -> "09:05"
 * - "2359" -> "23:59"
 * - "0000" -> "00:00"
 * - "18:00" -> "18:00"
 * Nếu giờ/phút không hợp lệ (như 25:00 hay 18:80), trả về null để hệ thống hiển thị cảnh báo lỗi màu đỏ.
 */
export const normalizeTimeString = (raw: string): string | null => {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  // 1. 12-hour AM/PM: e.g. '6pm', '6:30 pm', '11am', '12am', '12pm'
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([ap]m)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const mStr = ampmMatch[2];
    const m = mStr ? parseInt(mStr, 10) : 0;
    const isPM = ampmMatch[3] === 'pm';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }

  // 2. Vietnamese 'h' notation: 18h -> 18:00, 18h30 -> 18:30, 9h -> 09:00, 9h15 -> 09:15
  const hMatch = s.match(/^(\d{1,2})\s*h\s*(\d{0,2})$/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const mStr = hMatch[2];
    const m = mStr ? (mStr.length === 1 ? parseInt(mStr.padEnd(2, '0'), 10) : parseInt(mStr, 10)) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }

  // 3. Colon notation: '18:00', '09:30', '18:', '9:05'
  if (s.includes(':')) {
    const [hStr, mStr = ''] = s.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(m) && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }

  // 4. Raw digits (chỉ số): e.g. "18" -> 18:00, "9" -> 09:00, "1200" -> 12:00, "1130" -> 11:30
  const digits = s.replace(/\D/g, '');
  if (digits.length === 1 || digits.length === 2) {
    const h = parseInt(digits, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  } else if (digits.length === 3) {
    const h = parseInt(digits.slice(0, 1), 10);
    const m = parseInt(digits.slice(1), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } else if (digits.length === 4) {
    const h = parseInt(digits.slice(0, 2), 10);
    const m = parseInt(digits.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return null;
};

/**
 * Phát hiện dải giờ (ví dụ: "11h - 18h", "11-18h", "11:00 - 18:00", "11h đến 18h")
 */
export const parseTimeRangeString = (raw: string): { start: string; end: string } | null => {
  if (!raw) return null;
  const s = raw.trim();
  const match = s.match(/^(\d{1,2}(?::\d{2}|h\d{0,2})?)\s*(?:-|–|—|to|đến)\s*(\d{1,2}(?::\d{2}|h\d{0,2})?)$/i);
  if (!match) return null;

  const parseSingle = (part: string) => {
    return normalizeTimeString(part);
  };

  const start = parseSingle(match[1]);
  const end = parseSingle(match[2]);
  if (start && end) return { start, end };
  return null;
};

/**
 * Định dạng hiển thị thời gian:
 * - Tiếng Việt: 24h chuẩn (ví dụ "18:00")
 * - Tiếng Anh: 12h với AM/PM (ví dụ "06:00 PM")
 */
export const formatDisplayString = (val24: string, isEn: boolean): string => {
  if (!val24 || !val24.includes(':')) return val24 || '';
  if (!isEn) return val24; // Tiếng Việt giữ nguyên 24h
  const [hStr, mStr = ''] = val24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || h < 0 || h > 23) return val24;
  if (isNaN(m)) return `${hStr}:`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Định dạng chuỗi nhập thời gian theo quy chuẩn:
 * - Người dùng nhập >= 4 chữ số thì ở trước dấu ":" chỉ ghi nhận 2 số.
 * - Sau 2 số đầu tiên thì tự động chuyển 2 số tiếp theo ra sau dấu ":".
 * - Sau ":" ghi nhận 2 số theo thứ tự số nhập trước rồi tới số nhập sau.
 * - Tổng cả ô chỉ ghi nhận đúng 4 số (HH:mm).
 */
export const formatTimeDigits = (raw: string, isEn: boolean = false): { formatted: string; cursorOffset: number } => {
  if (!raw) return { formatted: ':', cursorOffset: 0 };
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length === 0) return { formatted: ':', cursorOffset: 0 };
  if (d.length === 1) return { formatted: `${d}:`, cursorOffset: 1 };
  if (d.length === 2) return { formatted: `${d}:`, cursorOffset: 3 };
  if (d.length === 3) return { formatted: `${d.slice(0, 2)}:${d.slice(2)}`, cursorOffset: 4 };
  const val24 = `${d.slice(0, 2)}:${d.slice(2, 4)}`;
  return { formatted: isEn ? formatDisplayString(val24, true) : val24, cursorOffset: 5 };
};

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value = '',
  onChange,
  onRangeDetected,
  isEn = false,
  className = '',
  variant = 'box',
  placeholder = '--:--',
}) => {
  const extractDigits = (v: string): string => {
    if (!v) return '';
    return v.replace(/\D/g, '').slice(0, 4);
  };

  const [digits, setDigits] = useState<string>(() => extractDigits(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isClockOpen, setIsClockOpen] = useState<boolean>(false);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');
  const isFreshFocusRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState<string>(() => {
    if (!value) return '';
    return isEn ? formatDisplayString(value, true) : value;
  });

  // Đồng bộ khi prop `value` thay đổi từ ngoài khi user không focus
  useEffect(() => {
    if (!isFocused) {
      if (!value) {
        setDigits('');
        setText('');
      } else {
        const norm = normalizeTimeString(value);
        const cleanVal = norm || value;
        const d = cleanVal.replace(/\D/g, '').slice(0, 4);
        setDigits(d);
        setText(isEn ? formatDisplayString(cleanVal, true) : cleanVal);
        if (cleanVal.includes(':')) {
          const h = parseInt(cleanVal.split(':')[0], 10);
          if (!isNaN(h)) {
            setClockPeriod(h >= 12 ? 'PM' : 'AM');
          }
        }
      }
    }
  }, [value, isEn, isFocused]);

  // Click outside listener đóng clock popover
  useEffect(() => {
    if (!isClockOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsClockOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClockOpen]);

  const applyDigits = (newDigits: string) => {
    const clamped = newDigits.slice(0, 4);
    setDigits(clamped);

    if (clamped.length === 0) {
      setText(':');
      onChange('');
      return;
    }

    if (clamped.length === 1 || clamped.length === 2) {
      setText(`${clamped}:`);
      onChange(`${clamped}:`);
      return;
    }

    if (clamped.length === 3) {
      setText(`${clamped.slice(0, 2)}:${clamped.slice(2)}`);
      onChange(`${clamped.slice(0, 2)}:${clamped.slice(2)}`);
      return;
    }

    if (clamped.length === 4) {
      const val24 = `${clamped.slice(0, 2)}:${clamped.slice(2, 4)}`;
      setText(isEn ? formatDisplayString(val24, true) : val24);
      onChange(val24);
      return;
    }
  };

  // Nút tăng/giảm nhanh 5 phút
  const stepTime = (deltaMinutes: number) => {
    const current = normalizeTimeString(text || value || '12:00') || '12:00';
    const [hStr, mStr] = current.split(':');
    let h = parseInt(hStr || '12', 10);
    let m = parseInt(mStr || '0', 10);
    let totalMins = (h * 60 + m + deltaMinutes + 1440) % 1440;
    const newH = Math.floor(totalMins / 60);
    const newM = totalMins % 60;
    const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    const newD = formatted.replace(/\D/g, '');
    setDigits(newD);
    setText(isEn ? formatDisplayString(formatted, true) : formatted);
    onChange(formatted);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    isFreshFocusRef.current = true;
    if (!text || text === '--:--' || text === ':') {
      setText(':');
      setDigits('');
    }
    // Select toàn bộ text để user gõ là thay thế ngay lập tức
    setTimeout(() => {
      inputRef.current?.select();
    }, 20);
  };

  const handleBlur = () => {
    setIsFocused(false);
    isFreshFocusRef.current = false;

    if (!digits || digits.length === 0) {
      setText('');
      onChange('');
      return;
    }

    // 1 hoặc 2 chữ số: Đại diện cho GIỜ (ví dụ "18" -> "18:00", "9" -> "09:00")
    if (digits.length === 1 || digits.length === 2) {
      const h = digits.padStart(2, '0');
      const val24 = `${h}:00`;
      setDigits(`${h}00`);
      setText(isEn ? formatDisplayString(val24, true) : val24);
      onChange(val24);
      return;
    }

    // 3 chữ số: ví dụ "183" -> "18:30", "180" -> "18:00"
    if (digits.length === 3) {
      const h = digits.slice(0, 2);
      const mDigit = digits.slice(2);
      const m = parseInt(mDigit, 10) <= 5 ? `${mDigit}0` : `0${mDigit}`;
      const val24 = `${h}:${m}`;
      setDigits(`${h}${m}`);
      setText(isEn ? formatDisplayString(val24, true) : val24);
      onChange(val24);
      return;
    }

    // 4 chữ số: HH:mm (ví dụ "1200" -> "12:00", "2359" -> "23:59")
    if (digits.length === 4) {
      const val24 = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
      setText(isEn ? formatDisplayString(val24, true) : val24);
      onChange(val24);
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'Escape') {
      setIsClockOpen(false);
      return;
    }

    // 1. Phím số (0-9):
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const input = e.currentTarget;
      const isAllSelected = (input.selectionStart === 0 && input.selectionEnd === input.value.length);
      const startFresh = isFreshFocusRef.current || isAllSelected || digits.length >= 4;
      isFreshFocusRef.current = false;

      if (startFresh) {
        applyDigits(e.key);
      } else {
        applyDigits(digits + e.key);
      }
      return;
    }

    // 2. Phím Backspace: Giữ nguyên dấu ':'
    if (e.key === 'Backspace') {
      e.preventDefault();
      isFreshFocusRef.current = false;
      const input = e.currentTarget;
      const isAllSelected = (input.selectionStart === 0 && input.selectionEnd === input.value.length);
      if (isAllSelected || digits.length <= 1) {
        setDigits('');
        setText(':');
        onChange('');
      } else {
        applyDigits(digits.slice(0, -1));
      }
      return;
    }

    // 3. Phím Delete:
    if (e.key === 'Delete') {
      e.preventDefault();
      isFreshFocusRef.current = false;
      setDigits('');
      setText(':');
      onChange('');
      return;
    }

    // 4. Phím 'h' hoặc 'H' (tiếng Việt: gõ 18h -> 18:00):
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      isFreshFocusRef.current = false;
      if (digits.length === 1 || digits.length === 2) {
        const h = digits.padStart(2, '0');
        const val24 = `${h}:00`;
        setDigits(`${h}00`);
        setText(isEn ? formatDisplayString(val24, true) : val24);
        onChange(val24);
      }
      return;
    }

    // 5. Phím ':'
    if (e.key === ':') {
      e.preventDefault();
      isFreshFocusRef.current = false;
      if (digits.length === 1) {
        const h = digits.padStart(2, '0');
        setDigits(h);
        setText(`${h}:`);
      }
      return;
    }

    // 6. Phím mũi tên Lên/Xuống
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        onRangeDetected(range.start, range.end);
        setText(isEn ? formatDisplayString(range.start, true) : range.start);
        onChange(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm) {
      const d = norm.replace(/\D/g, '');
      setDigits(d);
      setText(isEn ? formatDisplayString(norm, true) : norm);
      onChange(norm);
      return;
    }

    const pastedDigits = pasted.replace(/\D/g, '').slice(0, 4);
    if (pastedDigits) {
      applyDigits(pastedDigits);
    }
  };

  const handleCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (text) {
      try {
        navigator.clipboard?.writeText(text);
      } catch {}
    }
    setDigits('');
    setText(':');
    onChange('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        setText(isEn ? formatDisplayString(range.start, true) : range.start);
        onChange(range.start);
        return;
      }
    }

    if (/^\d{1,2}\s*h/i.test(raw) || /[ap]m$/i.test(raw.trim())) {
      const norm = normalizeTimeString(raw);
      if (norm) {
        const d = norm.replace(/\D/g, '');
        setDigits(d);
        setText(isEn ? formatDisplayString(norm, true) : norm);
        onChange(norm);
        return;
      }
    }

    if (raw.includes(':')) {
      const [hPart, mPart = ''] = raw.split(':');
      const hDigits = hPart.replace(/\D/g, '').slice(0, 2);
      const mDigits = mPart.replace(/\D/g, '').slice(0, 2);
      applyDigits(hDigits + mDigits);
      return;
    }

    const rawDigits = raw.replace(/\D/g, '').slice(0, 4);
    applyDigits(rawDigits);
  };

  // Chọn từ bảng đồng hồ
  const selectTimeFromClock = (hStr: string, mStr: string = '00', period?: 'AM' | 'PM') => {
    let final24 = '';
    const activePeriod = period || clockPeriod;
    if (isEn) {
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      if (activePeriod === 'PM' && h < 12) h += 12;
      if (activePeriod === 'AM' && h === 12) h = 0;
      final24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      final24 = `${hStr}:${mStr}`;
    }
    const d = final24.replace(/\D/g, '');
    setDigits(d);
    setText(isEn ? formatDisplayString(final24, true) : final24);
    onChange(final24);
    setIsClockOpen(false);
  };

  // Bảng chọn đồng hồ (Clock Popover)
  const renderClockPicker = () => {
    if (!isClockOpen) return null;

    const currentNorm = normalizeTimeString(text || value || '12:00') || '12:00';
    const [curH, curM] = currentNorm.split(':');

    return (
      <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl w-80 max-w-[95vw] animate-fade-in left-0 sm:left-auto sm:right-0 top-full">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#007b4d] dark:text-[#62D2FB]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isEn ? "12H Clock Picker" : "Bảng Đồng Hồ 24 Giờ"}
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

        {/* Chuyển đổi AM / PM (chỉ hiện cho tiếng Anh) */}
        {isEn && (
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setClockPeriod('AM')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                clockPeriod === 'AM'
                  ? 'bg-[#007b4d] dark:bg-[#62D2FB] text-white dark:text-[#0E172A] border-transparent shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              AM (Sáng)
            </button>
            <button
              type="button"
              onClick={() => setClockPeriod('PM')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                clockPeriod === 'PM'
                  ? 'bg-[#007b4d] dark:bg-[#62D2FB] text-white dark:text-[#0E172A] border-transparent shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              PM (Chiều/Tối)
            </button>
          </div>
        )}

        {/* Lựa chọn GIỜ */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
            <span>{isEn ? "Select Hour" : "Chọn Giờ (00 - 23)"}</span>
            <span className="text-[#007b4d] dark:text-[#62D2FB] font-medium">{isEn ? "Click to set" : "Bấm số để chọn"}</span>
          </div>
          <div className={`grid gap-1 ${isEn ? 'grid-cols-4' : 'grid-cols-6'}`}>
            {(isEn ? HOURS_12 : HOURS_24).map((h) => {
              const isSelected = isEn
                ? (parseInt(curH) % 12 === 0 ? 12 : parseInt(curH) % 12) === parseInt(h)
                : curH === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => selectTimeFromClock(h, curM || '00', clockPeriod)}
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

        {/* Lựa chọn PHÚT */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {isEn ? "Select Minute" : "Chọn Phút"}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MINUTES_COMMON.map((m) => {
              const isSelected = curM === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectTimeFromClock(curH || '12', m, clockPeriod)}
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

  // 1. Variant: Compact
  if (variant === 'compact') {
    return (
      <div ref={containerRef} className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onCut={handleCut}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={`w-28 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-sans text-base font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] focus:ring-1 focus:ring-[#4CB28E] transition-all tabular-nums ${className}`}
        />
        {renderClockPicker()}
      </div>
    );
  }

  // 2. Variant: Underline
  if (variant === 'underline') {
    return (
      <div ref={containerRef} className="relative w-full flex items-center justify-between border-b border-slate-300 dark:border-slate-500 pb-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onCut={handleCut}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={`w-full bg-transparent px-1 py-1 font-heading text-2xl sm:text-3xl font-bold text-[#1F2937] dark:text-white focus:outline-none focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors tabular-nums tracking-tight ${className}`}
        />
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Nút mũi tên tăng giảm */}
          <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => stepTime(5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => stepTime(-5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          {/* Icon đồng hồ mở bảng chọn */}
          <button
            type="button"
            onClick={() => setIsClockOpen(!isClockOpen)}
            title={isEn ? "Open clock picker" : "Mở bảng đồng hồ chọn giờ"}
            className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {renderClockPicker()}
      </div>
    );
  }

  // 3. Variant: Box (Default)
  return (
    <div
      ref={containerRef}
      className={`relative flex-1 flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 shadow-sm focus-within:border-[#007b4d] dark:focus-within:border-[#62D2FB] focus-within:ring-2 focus-within:ring-[#007b4d]/20 transition-all ${className}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onCut={handleCut}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none font-heading text-lg font-bold text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors p-0 tracking-wider tabular-nums"
      />
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {/* Nút mũi tên tăng giảm nhanh */}
        <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => stepTime(5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => stepTime(-5)} className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Icon chiếc đồng hồ mở bảng chọn */}
        <button
          type="button"
          onClick={() => setIsClockOpen(!isClockOpen)}
          title={isEn ? "Open clock picker" : "Mở bảng đồng hồ chọn giờ"}
          className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1 rounded-lg transition-colors cursor-pointer"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>
      {renderClockPicker()}
    </div>
  );
};
