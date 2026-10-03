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
const digitsFrom24 = (val24: string): string =>
  (val24 || '').replace(/\D/g, '').slice(0, 4);

/**
 * 4-digit buffer → "HH:mm". No Date, no timezone.
 * "1200" → "12:00", "0905" → "09:05", "2359" → "23:59"
 * Returns null if HH > 23 or MM > 59.
 */
const digits4To24 = (d: string): string | null => {
  if (d.length !== 4) return null;
  const h = parseInt(d.slice(0, 2), 10);
  const m = parseInt(d.slice(2, 4), 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Derive display text from digit buffer. Colon always at position 2|3.
 *   ""     → ""
 *   "1"    → "1"      (no colon until 2+ digits to avoid cursor jumping)
 *   "12"   → "12:"
 *   "123"  → "12:3"
 *   "1200" → "12:00"
 *
 * NOTE: Single digit shows WITHOUT colon to avoid the "allSelected" trap
 * where selectionEnd = len("1:") = 2 ≡ allSelected = true on next keypress.
 */
const bufToDisplay = (d: string): string => {
  if (!d || d.length === 0) return '';
  if (d.length === 1) return d;           // "1"  — no colon yet
  if (d.length === 2) return `${d}:`;    // "12:"
  if (d.length === 3) return `${d.slice(0, 2)}:${d.slice(2)}`; // "12:3"
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;                  // "12:00"
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive initial display from external value prop
  const getInitialDisplay = (v: string): string => {
    if (!v) return '';
    const norm = normalizeTimeString(v) || v;
    return isEn ? formatDisplayString(norm, true) : norm;
  };

  // State: single source of truth for the controlled input
  const [display, setDisplay] = useState<string>(() => getInitialDisplay(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isClockOpen, setIsClockOpen] = useState<boolean>(false);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');

  // Tracks whether the user just focused the field (for clean replacement on first digit)
  const isFreshFocusRef = useRef<boolean>(false);
  const nextCursorRef = useRef<number | null>(null);
  const isComposingRef = useRef<boolean>(false);

  // Synchronously set cursor selection immediately after React renders
  useLayoutEffect(() => {
    if (inputRef.current && nextCursorRef.current !== null) {
      const pos = nextCursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      nextCursorRef.current = null;
    }
  });

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    processInput(e.currentTarget.value);
  };

  // Sync display from external `value` prop when NOT focused
  useEffect(() => {
    if (!isFocused) {
      if (!value) {
        setDisplay('');
      } else {
        const norm = normalizeTimeString(value) || value;
        setDisplay(isEn ? formatDisplayString(norm, true) : norm);
        if (norm.includes(':')) {
          const h = parseInt(norm.split(':')[0], 10);
          if (!isNaN(h)) setClockPeriod(h >= 12 ? 'PM' : 'AM');
        }
      }
    }
  }, [value, isEn, isFocused]);

  // Close clock popover on click outside
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

  // Step ±N minutes
  const stepTime = (deltaMinutes: number) => {
    const cur =
      normalizeTimeString(display) ||
      normalizeTimeString(value) ||
      '12:00';
    const [hStr, mStr] = cur.split(':');
    let total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    const v24 = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    setDisplay(isEn ? formatDisplayString(v24, true) : v24);
    setClockPeriod(nh >= 12 ? 'PM' : 'AM');
    onChange(v24);
  };

  // Focus: select all text so user can replace cleanly
  const handleFocus = () => {
    setIsFocused(true);
    isFreshFocusRef.current = true;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    });
  };

  const handleClick = () => {
    // If clicking inside an already focused input, don't trigger fresh replacement
    if (!isFreshFocusRef.current) {
      isFreshFocusRef.current = false;
    }
  };

  // Blur: validate and finalize partial or full input
  const handleBlur = () => {
    setIsFocused(false);
    isFreshFocusRef.current = false;

    if (!display || display.trim() === '') {
      setDisplay('');
      onChange('');
      return;
    }

    const norm = normalizeTimeString(display);
    if (norm) {
      setDisplay(isEn ? formatDisplayString(norm, true) : norm);
      onChange(norm);
      return;
    }

    // Fallback: extract digits
    const digits = display.replace(/\D/g, '');
    if (digits.length === 0) {
      setDisplay('');
      onChange('');
      return;
    }

    let h = 0;
    let m = 0;
    if (digits.length <= 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2), 10) * 10;
      if (m > 59) m = 59;
    } else {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
    }

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setDisplay(isEn ? formatDisplayString(v24, true) : v24);
      onChange(v24);
    } else {
      // Revert to valid value if input was unparseable
      const fallback = value ? (isEn ? formatDisplayString(value, true) : value) : '';
      setDisplay(fallback);
    }
  };

  // Keyboard navigation & special keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Escape') {
      setIsClockOpen(false);
      return;
    }

    // Arrow keys
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }

    // Backspace handling
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      // If all text is selected
      if (start === 0 && end === display.length && display.length > 0) {
        e.preventDefault();
        setDisplay('');
        nextCursorRef.current = 0;
        onChange('');
        isFreshFocusRef.current = false;
        return;
      }

      // If display ends with ':' (e.g. "11:") and cursor is at or after colon
      if (start === end && start >= display.length - 1 && display.endsWith(':')) {
        e.preventDefault();
        // Remove both colon and preceding digit (e.g. "11:" -> "1")
        const next = display.slice(0, -2);
        setDisplay(next);
        nextCursorRef.current = next.length;
        isFreshFocusRef.current = false;
        return;
      }
    }

    // Delete key when all selected
    if (e.key === 'Delete') {
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (start === 0 && end === display.length && display.length > 0) {
        e.preventDefault();
        setDisplay('');
        nextCursorRef.current = 0;
        onChange('');
        isFreshFocusRef.current = false;
        return;
      }
    }

    // Vietnamese shorthand "18h"
    if (e.key === 'h' || e.key === 'H') {
      const digits = display.replace(/\D/g, '');
      if (digits.length >= 1 && digits.length <= 2) {
        e.preventDefault();
        const h = parseInt(digits, 10);
        if (h >= 0 && h <= 23) {
          const v24 = `${String(h).padStart(2, '0')}:00`;
          const disp = isEn ? formatDisplayString(v24, true) : v24;
          setDisplay(disp);
          nextCursorRef.current = disp.length;
          onChange(v24);
          isFreshFocusRef.current = false;
          return;
        }
      }
    }
  };

  // Core input processor: pure digit stream, robust against colon displacement and IME composition
  const processInput = (raw: string) => {
    // 1. Range detection: e.g. "11 - 18", "11:00 - 18:00", "11h - 18h"
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        const disp = isEn ? formatDisplayString(range.start, true) : range.start;
        setDisplay(disp);
        nextCursorRef.current = disp.length;
        onChange(range.start);
        return;
      }
    }

    // 2. Empty input
    if (!raw || raw.trim() === '') {
      setDisplay('');
      nextCursorRef.current = 0;
      onChange('');
      return;
    }

    // 3. Shorthand "18h", "18:h", or "18h30"
    const hMatch = raw.trim().toLowerCase().match(/^(\d{1,2}):?\s*h\s*(\d{0,2})$/);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      const mRaw = hMatch[2];
      const m = mRaw ? (mRaw.length === 1 ? parseInt(mRaw + '0', 10) : parseInt(mRaw, 10)) : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const disp = isEn ? formatDisplayString(v24, true) : v24;
        setDisplay(disp);
        nextCursorRef.current = disp.length;
        onChange(v24);
        return;
      }
    }

    // 4. English AM/PM typing
    if (isEn && /[ap]m/i.test(raw)) {
      const norm = normalizeTimeString(raw);
      if (norm) {
        const disp = formatDisplayString(norm, true);
        setDisplay(disp);
        nextCursorRef.current = disp.length;
        onChange(norm);
        return;
      }
    }

    // 5. Explicit single-digit hour with colon: e.g. "9:" -> "09:"
    const clean = raw.replace(/[^0-9:]/g, '');
    if (clean.includes(':')) {
      const parts = clean.split(':');
      let hPart = parts[0];
      const mPart = parts.slice(1).join('').replace(/\D/g, '');

      if (hPart.length === 1 && (raw.endsWith(':') || raw.includes(':'))) {
        hPart = '0' + hPart;
        const d = (hPart + mPart).slice(0, 4);
        let disp = '';
        let cursor = 3;
        if (d.length === 2) {
          disp = `${d}:`;
          cursor = 3;
        } else if (d.length === 3) {
          disp = `${d.slice(0, 2)}:${d.slice(2)}`;
          cursor = 4;
        } else if (d.length === 4) {
          disp = `${d.slice(0, 2)}:${d.slice(2, 4)}`;
          cursor = 5;
        }
        setDisplay(disp);
        nextCursorRef.current = cursor;
        if (d.length === 4) {
          const h = parseInt(d.slice(0, 2), 10);
          const m = parseInt(d.slice(2, 4), 10);
          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (isEn) {
              const enDisp = formatDisplayString(v24, true);
              setDisplay(enDisp);
              nextCursorRef.current = enDisp.length;
            }
            onChange(v24);
          }
        }
        return;
      }
    }

    // 6. Sequential digit stream (pure digits, immune to colon displacement)
    const digits = clean.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 0) {
      setDisplay('');
      nextCursorRef.current = 0;
      return;
    }
    if (digits.length === 1) {
      setDisplay(digits);
      nextCursorRef.current = 1;
      return;
    }
    if (digits.length === 2) {
      const disp = `${digits}:`;
      setDisplay(disp);
      nextCursorRef.current = 3;
      return;
    }
    if (digits.length === 3) {
      const disp = `${digits.slice(0, 2)}:${digits.slice(2)}`;
      setDisplay(disp);
      nextCursorRef.current = 4;
      return;
    }
    if (digits.length === 4) {
      const h = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      const formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
      let disp = formatted;
      let v24: string | null = null;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        v24 = formatted;
        if (isEn) disp = formatDisplayString(formatted, true);
      }
      setDisplay(disp);
      nextCursorRef.current = disp.length;
      if (v24) onChange(v24);
      return;
    }
  };

  // Main input handler: sequential digit typing, range detection, paste handling
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    if (isComposingRef.current) {
      setDisplay(raw);
      return;
    }

    // Fresh focus replacement: if field has an existing 4+ char value (e.g. "07:00")
    // and user types a single digit immediately after focusing, start fresh with that digit.
    if (isFreshFocusRef.current) {
      isFreshFocusRef.current = false;
      const lastChar = raw.slice(-1);
      if (/^[0-9]$/.test(lastChar) && display.length >= 4) {
        raw = lastChar;
      }
    }

    processInput(raw);
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        onRangeDetected(range.start, range.end);
        setDisplay(isEn ? formatDisplayString(range.start, true) : range.start);
        onChange(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm) {
      setDisplay(isEn ? formatDisplayString(norm, true) : norm);
      onChange(norm);
      return;
    }

    const digits = pasted.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 4) {
      const h = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const v24 = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
        setDisplay(isEn ? formatDisplayString(v24, true) : v24);
        onChange(v24);
      }
    }
  };

  // Cut handler
  const handleCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    try { navigator.clipboard?.writeText(display); } catch {}
    setDisplay('');
    onChange('');
  };

  // Clock picker selection
  const selectFromClock = (hStr: string, mStr: string = '00', period?: 'AM' | 'PM') => {
    let v24: string;
    const p = period ?? clockPeriod;
    if (isEn) {
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      v24 = `${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}`;
    }
    setDisplay(isEn ? formatDisplayString(v24, true) : v24);
    setClockPeriod(parseInt(v24.split(':')[0], 10) >= 12 ? 'PM' : 'AM');
    onChange(v24);
    setIsClockOpen(false);
  };

  // Clock popover
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal =
      normalizeTimeString(display) ||
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

  // Shared controlled input props
  const inputProps = {
    ref: inputRef,
    type: 'text' as const,
    value: display,
    onChange: handleChange,
    onFocus: handleFocus,
    onClick: handleClick,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onCut: handleCut,
    onPaste: handlePaste,
    placeholder,
    autoComplete: 'off',
    spellCheck: false,
    inputMode: 'numeric' as const,
  };

  // ─── Variant: Compact ─────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div ref={containerRef} className="relative inline-flex items-center">
        <input
          {...inputProps}
          className={`w-28 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-sans text-base font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:focus:border-[#62D2FB] focus:ring-1 focus:ring-[#4CB28E] transition-all tabular-nums ${className}`}
        />
        {renderClockPicker()}
      </div>
    );
  }

  // ─── Variant: Underline ───────────────────────────────────────────────────────
  if (variant === 'underline') {
    return (
      <div ref={containerRef} className="relative w-full flex items-center justify-between border-b border-slate-300 dark:border-slate-500 pb-1">
        <input
          {...inputProps}
          className={`w-full bg-transparent px-1 py-1 font-heading text-2xl sm:text-3xl font-bold text-[#1F2937] dark:text-white focus:outline-none focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors tabular-nums tracking-tight ${className}`}
        />
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
      className={`relative flex-1 flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 shadow-sm focus-within:border-[#007b4d] dark:focus-within:border-[#62D2FB] focus-within:ring-2 focus-within:ring-[#007b4d]/20 transition-all ${className}`}
    >
      <input
        {...inputProps}
        className="w-full bg-transparent outline-none font-heading text-lg font-bold text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors p-0 tracking-wider tabular-nums"
      />
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
