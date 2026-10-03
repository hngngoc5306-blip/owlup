import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
export const digitsFrom24 = (val24: string, isEn: boolean = false): string => {
  if (!val24) return '';
  const norm = normalizeTimeString(val24) || val24;
  if (!norm.includes(':')) return norm.replace(/\D/g, '').slice(0, 4);
  const [hStr, mStr = '00'] = norm.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return '';
  if (isEn) {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}${String(m).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
};

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

/**
 * Derives display string purely from rawDigits buffer.
 * Permanent colon ':' is preserved throughout the entry lifecycle.
 */
export const getDisplayState = (d: string): string => {
  if (!d || d.length === 0) return '';
  if (d.length === 1) return `${d} :`;
  if (d.length === 2) return `${d}:`;
  if (d.length === 3) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
};

/**
 * Calculates correct cursor caret position based on current raw digits.
 */
export const getTargetCursor = (d: string): number => {
  if (!d || d.length === 0) return 0;
  if (d.length === 1) return 1; // "1| :"
  if (d.length === 2) return 3; // "12:|"
  if (d.length === 3) return 4; // "12:0|"
  return 5;                     // "12:00|"
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
  const inputRef = useRef<HTMLInputElement>(null);
  const isFreshFocusRef = useRef(false);
  const nextCursorRef = useRef<number | null>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [rawDigits, setRawDigits] = useState<string>(() => digitsFrom24(value, isEn));

  const getInitialPeriod = (): 'AM' | 'PM' => {
    if (!value) return 'PM';
    const norm = normalizeTimeString(value) || value;
    if (norm.includes(':')) {
      const h = parseInt(norm.split(':')[0], 10);
      if (!isNaN(h)) return h >= 12 ? 'PM' : 'AM';
    }
    return 'PM';
  };

  const [period, setPeriod] = useState<'AM' | 'PM'>(getInitialPeriod);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>(getInitialPeriod);
  const [isClockOpen, setIsClockOpen] = useState(false);

  // Sync state from external value prop when user is not actively editing
  useEffect(() => {
    if (!isFocused) {
      const d = digitsFrom24(value, isEn);
      setRawDigits(d);
      if (value && value.includes(':')) {
        const h = parseInt(value.split(':')[0], 10);
        if (!isNaN(h)) {
          const p = h >= 12 ? 'PM' : 'AM';
          setPeriod(p);
          setClockPeriod(p);
        }
      }
    }
  }, [value, isEn, isFocused]);

  // Synchronize cursor position smoothly without fighting user clicks
  useLayoutEffect(() => {
    if (inputRef.current && isFocused && nextCursorRef.current !== null) {
      const pos = nextCursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      nextCursorRef.current = null;
    }
  });

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

  // Convert 4-digit buffer to 24h string with period support
  const to24 = (d4: string, p: 'AM' | 'PM' = period): string | null => {
    let h = parseInt(d4.slice(0, 2), 10);
    const m = parseInt(d4.slice(2, 4), 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (isEn) {
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
    }
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  };

  const emit = (v24: string) => {
    onChange(v24);
  };

  // Step ±N minutes
  const stepTime = (deltaMinutes: number) => {
    let curH = 12;
    let curM = 0;
    if (rawDigits.length >= 2) curH = parseInt(rawDigits.slice(0, 2), 10) || 0;
    if (rawDigits.length === 4) curM = parseInt(rawDigits.slice(2, 4), 10) || 0;
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
    const d = digitsFrom24(v24, isEn);
    const p: 'AM' | 'PM' = nh >= 12 ? 'PM' : 'AM';
    setRawDigits(d);
    setPeriod(p);
    setClockPeriod(p);
    emit(v24);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    isFreshFocusRef.current = true;
    e.currentTarget.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    isFreshFocusRef.current = false;

    if (rawDigits.length === 0) {
      emit('');
      return;
    }

    if (rawDigits.length === 1 || rawDigits.length === 2) {
      let h = parseInt(rawDigits, 10);
      if (!isNaN(h)) {
        if (h > 23) h = 23;
        const v24 = `${String(h).padStart(2, '0')}:00`;
        setRawDigits(digitsFrom24(v24, isEn));
        emit(v24);
        return;
      }
    }

    if (rawDigits.length === 3) {
      let h = parseInt(rawDigits.slice(0, 2), 10);
      const mTens = parseInt(rawDigits.slice(2), 10);
      const m = mTens <= 5 ? mTens * 10 : mTens;
      if (!isNaN(h) && !isNaN(m)) {
        if (h > 23) h = 23;
        const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setRawDigits(digitsFrom24(v24, isEn));
        emit(v24);
        return;
      }
    }

    if (rawDigits.length === 4) {
      const v24 = to24(rawDigits);
      if (v24) {
        emit(v24);
        return;
      }
    }

    // Fallback: revert to external prop value
    setRawDigits(digitsFrom24(value, isEn));
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
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }

    // Colon or ArrowRight: advance past hours
    if (e.key === ':' || e.key === 'ArrowRight') {
      if (rawDigits.length === 1) {
        e.preventDefault();
        const next = '0' + rawDigits;
        setRawDigits(next);
        nextCursorRef.current = 3;
      } else if (rawDigits.length === 2) {
        e.preventDefault();
        nextCursorRef.current = 3;
      }
      return;
    }

    // Vietnamese shorthand "18h"
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      if (rawDigits.length >= 1) {
        let h = parseInt(rawDigits.slice(0, 2), 10);
        if (h > 23) h = 23;
        const v24 = `${String(h).padStart(2, '0')}:00`;
        setRawDigits(digitsFrom24(v24, isEn));
        emit(v24);
      }
      return;
    }

    // Backspace: natural sequential deletion
    if (e.key === 'Backspace') {
      const input = inputRef.current;
      const start = input?.selectionStart ?? 0;
      const end = input?.selectionEnd ?? 0;
      const display = getDisplayState(rawDigits);

      if (start === 0 && end >= display.length && display.length > 0) {
        e.preventDefault();
        setRawDigits('');
        nextCursorRef.current = 0;
        emit('');
        return;
      }

      if (rawDigits.length > 0) {
        e.preventDefault();
        const next = rawDigits.slice(0, -1);
        setRawDigits(next);
        nextCursorRef.current = getTargetCursor(next);
        if (next.length === 0) {
          emit('');
        }
      }
      return;
    }

    // Delete key: clear input
    if (e.key === 'Delete') {
      e.preventDefault();
      setRawDigits('');
      nextCursorRef.current = 0;
      emit('');
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // 1. Range detection pasted
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        setRawDigits(digitsFrom24(range.start, isEn));
        emit(range.start);
        return;
      }
    }

    // 2. Full time string pasted
    const norm = normalizeTimeString(raw);
    if (norm && norm.includes(':') && (raw.includes('h') || raw.includes('pm') || raw.includes('am') || raw.length > 5)) {
      setRawDigits(digitsFrom24(norm, isEn));
      emit(norm);
      return;
    }

    // 3. Fresh focus typing over existing completed time
    if (isFreshFocusRef.current) {
      isFreshFocusRef.current = false;
      const lastChar = raw.slice(-1);
      if (/^[0-9]$/.test(lastChar) && rawDigits.length >= 4) {
        setRawDigits(lastChar);
        nextCursorRef.current = getTargetCursor(lastChar);
        return;
      }
    }
    isFreshFocusRef.current = false;

    // 4. Sequential digit extraction
    let clean = raw.replace(/\D/g, '').slice(0, 4);
    if (clean.length === 0) {
      setRawDigits('');
      nextCursorRef.current = 0;
      emit('');
      return;
    }

    // Validate hour range
    if (clean.length >= 2) {
      let h = parseInt(clean.slice(0, 2), 10);
      const maxH = isEn ? 12 : 23;
      if (h > maxH) {
        h = maxH;
        clean = String(h).padStart(2, '0') + clean.slice(2);
      }
    }

    // Validate minute range
    if (clean.length === 4) {
      let m = parseInt(clean.slice(2, 4), 10);
      if (m > 59) {
        m = 59;
        clean = clean.slice(0, 2) + String(m).padStart(2, '0');
      }
    }

    setRawDigits(clean);
    nextCursorRef.current = getTargetCursor(clean);

    // Commit ONLY when 4 digits are completed!
    if (clean.length === 4) {
      const v24 = to24(clean);
      if (v24) {
        emit(v24);
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus();
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        e.preventDefault();
        onRangeDetected(range.start, range.end);
        setRawDigits(digitsFrom24(range.start, isEn));
        emit(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm && norm.includes(':')) {
      e.preventDefault();
      setRawDigits(digitsFrom24(norm, isEn));
      emit(norm);
      return;
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
    setRawDigits(digitsFrom24(v24, isEn));
    setPeriod(chosenPeriod);
    setClockPeriod(chosenPeriod);
    emit(v24);
    setIsClockOpen(false);
  };

  // Clock popover
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal =
      (rawDigits.length >= 2 ? `${rawDigits.slice(0, 2)}:${rawDigits.slice(2, 4) || '00'}` : null) ||
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

  const renderSingleInput = (fontSizeClass: string, widthClass: string) => {
    const display = getDisplayState(rawDigits);
    return (
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || '--:--'}
          autoComplete="off"
          spellCheck={false}
          className={`${fontSizeClass} ${widthClass} font-heading font-bold tabular-nums text-center bg-transparent outline-none p-0 tracking-wider text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors`}
        />
        {isEn && (
          <button
            type="button"
            onClick={() => {
              const nextP = period === 'AM' ? 'PM' : 'AM';
              setPeriod(nextP);
              setClockPeriod(nextP);
              if (rawDigits.length === 4) {
                const v24 = to24(rawDigits, nextP);
                if (v24) emit(v24);
              }
            }}
            className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-[#007b4d] dark:text-[#62D2FB] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none"
          >
            {period}
          </button>
        )}
      </div>
    );
  };

  // ─── Variant: Compact ─────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onPaste={handleContainerPaste}
        className={`relative inline-flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-[#1F2937] dark:text-white focus-within:border-[#4CB28E] dark:focus-within:border-[#62D2FB] focus-within:ring-1 focus-within:ring-[#4CB28E] transition-all ${className}`}
      >
        {renderSingleInput('text-sm sm:text-base', 'w-16 sm:w-20')}
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
        {renderSingleInput('text-2xl sm:text-3xl', 'w-28 sm:w-36')}
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
      {renderSingleInput('text-base sm:text-lg', 'w-20 sm:w-24')}
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
