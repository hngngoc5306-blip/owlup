import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';
import { normalizeTimeString } from '../utils/timeFormat';
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
const digitsFrom24 = (val24: string, isEn: boolean = false): string => {
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


/** Detect range strings like "11h - 18h", "11:00 - 18:00", "11 đến 18" */
const parseTimeRangeString = (raw: string): { start: string; end: string } | null => {
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
 * Sequential format:
 *   ""    -> "" (placeholder --:--)
 *   "1"   -> "1 :"
 *   "12"  -> "12 :"
 *   "120" -> "12:0"
 *   "1200"-> "12:00"
 */
const getDisplayState = (d: string): string => {
  if (!d || d.length === 0) return '';
  if (d.length === 1) return `${d} :`;
  if (d.length === 2) return `${d} :`;
  if (d.length === 3) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
};

/**
 * Calculates correct cursor caret position based on current raw digits.
 */
const getTargetCursor = (d: string): number => {
  if (!d || d.length === 0) return 0;
  if (d.length === 1) return 1; // "1| :"
  if (d.length === 2) return 4; // "12 :|"
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

  // Synchronous refs as the single authoritative source of truth during typing
  const rawDigitsRef = useRef<string>(digitsFrom24(value, isEn));
  const isFocusedRef = useRef<boolean>(false);
  const freshFocusRef = useRef<boolean>(false);

  // React state for triggers and re-renders
  const [rawDigits, setRawDigits] = useState<string>(() => digitsFrom24(value, isEn));
  const [, setIsFocused] = useState<boolean>(false);

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

  // Convert 4-digit buffer to 24h string with period support (does NOT alter user digits)
  const to24 = (d4: string, p: 'AM' | 'PM' = period): string | null => {
    if (d4.length !== 4) return null;
    let h = parseInt(d4.slice(0, 2), 10);
    const m = parseInt(d4.slice(2, 4), 10);
    if (isNaN(h) || isNaN(m)) return null;
    const maxH = isEn ? 12 : 23;
    if (h < 0 || h > maxH || m < 0 || m > 59) return null;
    if (isEn) {
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const emit = (v24: string) => {
    onChange(v24);
  };

  const applyTime = (val: string) => {
    const d = digitsFrom24(val, isEn);
    rawDigitsRef.current = d;
    setRawDigits(d);
    const newDisp = getDisplayState(d);
    if (inputRef.current) {
      inputRef.current.value = newDisp;
    }
    if (val && val.includes(':')) {
      const h = parseInt(val.split(':')[0], 10);
      if (!isNaN(h)) {
        const p = h >= 12 ? 'PM' : 'AM';
        setPeriod(p);
        setClockPeriod(p);
      }
    }
  };

  // Sync state from external value prop ONLY when user is NOT actively typing
  useEffect(() => {
    if (!isFocusedRef.current) {
      applyTime(value);
    }
  }, [value, isEn]);

  // Synchronize DOM value after render if not focused
  useLayoutEffect(() => {
    if (inputRef.current && !isFocusedRef.current) {
      inputRef.current.value = getDisplayState(rawDigitsRef.current);
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

  // Synchronous digit handler — immune to rapid typing race conditions
  const handleDigitInput = (digit: string) => {
    const input = inputRef.current;
    const selStart = input?.selectionStart ?? 0;
    const selEnd = input?.selectionEnd ?? 0;
    const curDisp = getDisplayState(rawDigitsRef.current);
    const allSelected = selStart === 0 && selEnd >= curDisp.length && curDisp.length > 0;

    let nextDigits: string;
    if (freshFocusRef.current || allSelected || rawDigitsRef.current.length >= 4) {
      freshFocusRef.current = false;
      nextDigits = digit;
    } else {
      nextDigits = rawDigitsRef.current + digit;
    }

    rawDigitsRef.current = nextDigits;
    const newDisp = getDisplayState(nextDigits);

    if (input) {
      input.value = newDisp;
      const curPos = getTargetCursor(nextDigits);
      input.setSelectionRange(curPos, curPos);
    }

    setRawDigits(nextDigits);

    // Commit valid time only on 4 complete digits (does not silently alter invalid digits)
    if (nextDigits.length === 4) {
      const v24 = to24(nextDigits, period);
      if (v24) {
        emit(v24);
      }
    }
  };

  // Step ±N minutes
  const stepTime = (deltaMinutes: number) => {
    let curH = 12;
    let curM = 0;
    const d = rawDigitsRef.current;
    if (d.length >= 2) curH = parseInt(d.slice(0, 2), 10) || 0;
    if (d.length === 4) curM = parseInt(d.slice(2, 4), 10) || 0;
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
    applyTime(v24);
    emit(v24);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    setIsFocused(true);
    freshFocusRef.current = true;
    e.currentTarget.select();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    setIsFocused(false);
    freshFocusRef.current = false;

    const d = rawDigitsRef.current;
    if (d.length === 0) {
      emit('');
      return;
    }

    const norm = normalizeTimeString(d);
    if (norm) {
      let v24 = norm;
      if (isEn) {
        const [hStr, mStr] = norm.split(':');
        let h = parseInt(hStr, 10);
        const maxH = 12;
        if (h <= maxH) {
          if (period === 'PM' && h < 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          v24 = `${String(h).padStart(2, '0')}:${mStr}`;
        }
      }
      applyTime(v24);
      emit(v24);
      return;
    }

    // Revert invalid entry on blur to external prop value
    applyTime(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Digits 0-9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handleDigitInput(e.key);
      return;
    }

    // Enter
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }

    // Escape
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

    // Colon or ArrowRight: advance past hours
    if (e.key === ':' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (rawDigitsRef.current.length === 1) {
        const nextDigits = '0' + rawDigitsRef.current;
        rawDigitsRef.current = nextDigits;
        const newDisp = getDisplayState(nextDigits);
        if (inputRef.current) {
          inputRef.current.value = newDisp;
          const curPos = getTargetCursor(nextDigits);
          inputRef.current.setSelectionRange(curPos, curPos);
        }
        setRawDigits(nextDigits);
      } else if (rawDigitsRef.current.length === 2) {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(4, 4);
        }
      }
      return;
    }

    // Vietnamese shorthand "18h"
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      if (rawDigitsRef.current.length >= 1) {
        let h = parseInt(rawDigitsRef.current.slice(0, 2), 10);
        const maxH = isEn ? 12 : 23;
        if (!isNaN(h) && h >= 0 && h <= maxH) {
          let v24 = `${String(h).padStart(2, '0')}:00`;
          if (isEn) {
            if (period === 'PM' && h < 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            v24 = `${String(h).padStart(2, '0')}:00`;
          }
          applyTime(v24);
          emit(v24);
        }
      }
      return;
    }

    // Backspace: natural sequential deletion
    if (e.key === 'Backspace') {
      e.preventDefault();
      freshFocusRef.current = false;
      const input = inputRef.current;
      const selStart = input?.selectionStart ?? 0;
      const selEnd = input?.selectionEnd ?? 0;
      const curDisp = getDisplayState(rawDigitsRef.current);
      const allSelected = selStart === 0 && selEnd >= curDisp.length && curDisp.length > 0;

      if (allSelected) {
        rawDigitsRef.current = '';
        if (input) input.value = '';
        setRawDigits('');
        emit('');
        return;
      }

      if (rawDigitsRef.current.length > 0) {
        const nextDigits = rawDigitsRef.current.slice(0, -1);
        rawDigitsRef.current = nextDigits;
        const newDisp = getDisplayState(nextDigits);
        if (input) {
          input.value = newDisp;
          const curPos = getTargetCursor(nextDigits);
          input.setSelectionRange(curPos, curPos);
        }
        setRawDigits(nextDigits);
        if (nextDigits.length === 0) {
          emit('');
        }
      }
      return;
    }

    // Delete key: clear input
    if (e.key === 'Delete') {
      e.preventDefault();
      freshFocusRef.current = false;
      rawDigitsRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
      setRawDigits('');
      emit('');
      return;
    }
  };

  // Fallback for mobile IME / browser autofill / pasted content
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // 1. Range detection
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        applyTime(range.start);
        emit(range.start);
        return;
      }
    }

    // 2. Full time string pasted / autofilled
    const norm = normalizeTimeString(raw);
    if (norm && (raw.includes('h') || raw.includes('pm') || raw.includes('am') || raw.includes(':') || raw.length > 5)) {
      applyTime(norm);
      emit(norm);
      return;
    }

    // 3. Digits extraction (mobile IME / autofill)
    const clean = raw.replace(/\D/g, '').slice(0, 4);
    rawDigitsRef.current = clean;
    const newDisp = getDisplayState(clean);
    if (inputRef.current) {
      inputRef.current.value = newDisp;
      const curPos = getTargetCursor(clean);
      inputRef.current.setSelectionRange(curPos, curPos);
    }
    setRawDigits(clean);

    if (clean.length === 4) {
      const v24 = to24(clean, period);
      if (v24) emit(v24);
    } else if (clean.length === 0) {
      emit('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        e.preventDefault();
        onRangeDetected(range.start, range.end);
        applyTime(range.start);
        emit(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm) {
      e.preventDefault();
      applyTime(norm);
      emit(norm);
      return;
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus();
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
    applyTime(v24);
    setPeriod(chosenPeriod);
    setClockPeriod(chosenPeriod);
    emit(v24);
    setIsClockOpen(false);
  };

  // Clock popover
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal =
      normalizeTimeString(rawDigitsRef.current) ||
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
          defaultValue={display}
          onChange={handleChange}
          onPaste={handlePaste}
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
              if (rawDigitsRef.current.length === 4) {
                const v24 = to24(rawDigitsRef.current, nextP);
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
