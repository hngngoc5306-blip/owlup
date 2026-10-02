import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES_COMMON = ['00', '15', '30', '45'];

// ─── PURE HELPERS (no Date objects, no timezone) ──────────────────────────────

/** Strip non-digits and keep max 4 from a "HH:mm" string → e.g. "12:00" → "1200" */
const digitsFrom24 = (val24: string): string =>
  (val24 || '').replace(/\D/g, '').slice(0, 4);

/**
 * 4-digit buffer → "HH:mm" string. NEVER uses Date. NEVER adds timezone.
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
 * Derive the text shown in the input field from the digit buffer.
 * Colon is always inserted between position 2 and 3. No Date object used.
 *   ""     → ""
 *   "1"    → "1:"
 *   "12"   → "12:"
 *   "123"  → "12:3"
 *   "1200" → "12:00"
 */
const bufToDisplay = (d: string): string => {
  if (!d || d.length === 0) return '';
  if (d.length === 1) return `${d}:`;
  if (d.length === 2) return `${d}:`;
  if (d.length === 3) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
};

/**
 * English 12h display. Only called on complete 4-digit values.
 */
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
 * Normalise any format the user might type → "HH:mm" (24h) or null.
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

  // 4. Raw digits: 1-4 digits
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
  if (digits.length === 4) {
    return digits4To24(digits);
  }
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
  // ── REFS (always current, no stale-closure issues) ──────────────────────────
  /** The digit buffer: 0–4 chars of digits only, e.g. "1200" for 12:00 */
  const bufRef = useRef<string>(digitsFrom24(value));
  /** Set to true during keyDown handling to suppress the subsequent onChange event */
  const keyHandledRef = useRef(false);
  /** True on first key press after focus – replaces existing content */
  const freshFocusRef = useRef(false);
  /** Timer ID for the select-all setTimeout so we can cancel it */
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── STATE (only for re-renders) ─────────────────────────────────────────────
  const [buf, setBufState] = useState<string>(() => digitsFrom24(value));
  const [isFocused, setIsFocused] = useState(false);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');

  // ── Source of truth: write to BOTH ref and state ────────────────────────────
  const setBuf = (newBuf: string) => {
    const d = newBuf.slice(0, 4);
    bufRef.current = d;
    setBufState(d);
  };

  // ── Derive display text from buffer (single source of truth) ────────────────
  const getDisplay = (d: string = bufRef.current): string => {
    if (d.length === 0) return '';
    if (d.length === 4 && isEn) {
      const v24 = digits4To24(d);
      if (v24) return formatDisplayString(v24, true);
    }
    return bufToDisplay(d);
  };

  // ── Sync input element's value imperatively (avoids React controlled-input
  //    artefacts where onChange fires with stale DOM state) ────────────────────
  useLayoutEffect(() => {
    if (inputRef.current && !isFocused) {
      inputRef.current.value = getDisplay();
    }
  });

  // ── Sync from external `value` prop when not focused ───────────────────────
  useEffect(() => {
    if (isFocused) return;
    if (!value) {
      setBuf('');
    } else {
      const norm = normalizeTimeString(value) || value;
      const d = digitsFrom24(norm);
      setBuf(d);
      if (norm.includes(':')) {
        const h = parseInt(norm.split(':')[0], 10);
        if (!isNaN(h)) setClockPeriod(h >= 12 ? 'PM' : 'AM');
      }
    }
  }, [value, isEn, isFocused]);

  // ── Close clock on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!isClockOpen) return;
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsClockOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [isClockOpen]);

  // ── Core: apply new digit buffer & propagate onChange ──────────────────────
  const applyBuf = (newBuf: string) => {
    const d = newBuf.slice(0, 4);
    setBuf(d);
    // Update the input element immediately (don't wait for next render)
    if (inputRef.current) inputRef.current.value = getDisplay(d);
    if (d.length === 4) {
      const v24 = digits4To24(d);
      if (v24) onChange(v24);
    } else if (d.length === 0) {
      onChange('');
    }
    // 1–3 digits: partial input, don't emit yet
  };

  // ── Step ±N minutes ─────────────────────────────────────────────────────────
  const stepTime = (deltaMinutes: number) => {
    const cur = (bufRef.current.length === 4 ? digits4To24(bufRef.current) : null)
      || normalizeTimeString(value) || '12:00';
    const [hStr, mStr] = cur.split(':');
    let total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    const v24 = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    const d = digitsFrom24(v24);
    setBuf(d);
    if (inputRef.current) inputRef.current.value = getDisplay(d);
    setClockPeriod(nh >= 12 ? 'PM' : 'AM');
    onChange(v24);
  };

  // ── Focus ───────────────────────────────────────────────────────────────────
  const handleFocus = () => {
    setIsFocused(true);
    freshFocusRef.current = true;
    keyHandledRef.current = false;
    // Cancel any pending select timer
    if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    selectTimerRef.current = setTimeout(() => {
      // Only select-all if the user hasn't started typing yet
      if (freshFocusRef.current && inputRef.current) {
        inputRef.current.select();
      }
      selectTimerRef.current = null;
    }, 50);
  };

  // ── Blur: finalise partial input ────────────────────────────────────────────
  const handleBlur = () => {
    setIsFocused(false);
    freshFocusRef.current = false;
    keyHandledRef.current = false;
    if (selectTimerRef.current) {
      clearTimeout(selectTimerRef.current);
      selectTimerRef.current = null;
    }

    const d = bufRef.current;

    if (d.length === 0) { onChange(''); return; }

    // 1–2 digits → treat entire value as hour
    if (d.length === 1 || d.length === 2) {
      const h = parseInt(d, 10);
      if (h >= 0 && h <= 23) {
        const v24 = `${String(h).padStart(2, '0')}:00`;
        const nd = digitsFrom24(v24);
        setBuf(nd);
        if (inputRef.current) inputRef.current.value = getDisplay(nd);
        onChange(v24);
      }
      return;
    }

    // 3 digits → HH:M where M is tens digit of minute ("123" → 12:30)
    if (d.length === 3) {
      const h = parseInt(d.slice(0, 2), 10);
      const mTens = parseInt(d.slice(2), 10);
      const m = mTens <= 5 ? mTens * 10 : mTens;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const nd = digitsFrom24(v24);
        setBuf(nd);
        if (inputRef.current) inputRef.current.value = getDisplay(nd);
        onChange(v24);
      }
      return;
    }

    // 4 digits → already complete
    if (d.length === 4) {
      const v24 = digits4To24(d);
      if (v24) {
        if (inputRef.current) inputRef.current.value = getDisplay(d);
        onChange(v24);
      }
    }
  };

  // ── Keyboard ────────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.currentTarget.blur(); return; }
    if (e.key === 'Escape') { setIsClockOpen(false); return; }

    // Digit 0–9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      keyHandledRef.current = true;  // Block subsequent handleChange

      const curBuf = bufRef.current;  // Always current (ref, not stale state)
      const input = e.currentTarget;
      const allSelected =
        input.selectionStart === 0 && input.selectionEnd === input.value.length;
      const reset = freshFocusRef.current || allSelected || curBuf.length >= 4;
      freshFocusRef.current = false;

      applyBuf(reset ? e.key : curBuf + e.key);

      // Clear the flag after this event loop tick
      setTimeout(() => { keyHandledRef.current = false; }, 0);
      return;
    }

    // Backspace – remove last digit, preserve colon structure
    if (e.key === 'Backspace') {
      e.preventDefault();
      keyHandledRef.current = true;
      freshFocusRef.current = false;

      const input = e.currentTarget;
      const allSelected =
        input.selectionStart === 0 && input.selectionEnd === input.value.length;
      if (allSelected || bufRef.current.length <= 1) {
        setBuf('');
        if (inputRef.current) inputRef.current.value = '';
        onChange('');
      } else {
        applyBuf(bufRef.current.slice(0, -1));
      }
      setTimeout(() => { keyHandledRef.current = false; }, 0);
      return;
    }

    // Delete – clear all
    if (e.key === 'Delete') {
      e.preventDefault();
      keyHandledRef.current = true;
      freshFocusRef.current = false;
      setBuf('');
      if (inputRef.current) inputRef.current.value = '';
      onChange('');
      setTimeout(() => { keyHandledRef.current = false; }, 0);
      return;
    }

    // 'h'/'H' – Vietnamese shorthand: "18h" → "18:00"
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      freshFocusRef.current = false;
      const d = bufRef.current;
      if (d.length === 1 || d.length === 2) {
        const h = parseInt(d, 10);
        if (h >= 0 && h <= 23) {
          const v24 = `${String(h).padStart(2, '0')}:00`;
          const nd = digitsFrom24(v24);
          setBuf(nd);
          if (inputRef.current) inputRef.current.value = getDisplay(nd);
          onChange(v24);
        }
      }
      return;
    }

    // ':' – pad single digit hour
    if (e.key === ':') {
      e.preventDefault();
      freshFocusRef.current = false;
      if (bufRef.current.length === 1) {
        const nd = bufRef.current.padStart(2, '0');
        setBuf(nd);
        if (inputRef.current) inputRef.current.value = getDisplay(nd);
      }
      return;
    }

    // Arrow up/down – step ±5 min
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepTime(e.key === 'ArrowUp' ? 5 : -5);
      return;
    }
  };

  // ── Paste ───────────────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        onRangeDetected(range.start, range.end);
        const d = digitsFrom24(range.start);
        setBuf(d);
        if (inputRef.current) inputRef.current.value = getDisplay(d);
        onChange(range.start);
        return;
      }
    }

    const norm = normalizeTimeString(pasted);
    if (norm) {
      const d = digitsFrom24(norm);
      setBuf(d);
      if (inputRef.current) inputRef.current.value = getDisplay(d);
      onChange(norm);
      return;
    }

    const d = pasted.replace(/\D/g, '').slice(0, 4);
    if (d) applyBuf(d);
  };

  // ── Cut ─────────────────────────────────────────────────────────────────────
  const handleCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    try { navigator.clipboard?.writeText(getDisplay()); } catch {}
    setBuf('');
    if (inputRef.current) inputRef.current.value = '';
    onChange('');
  };

  // ── onChange: ONLY fires on mobile IME / browser autocomplete.
  //    Desktop keyboard input is fully handled by handleKeyDown + e.preventDefault().
  //    We NEVER call normalizeTimeString here to avoid transforming partial "1:"→"01:00".
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If handleKeyDown already handled this input, ignore
    if (keyHandledRef.current) return;

    const raw = e.target.value;

    // Range detection (for paste-like scenarios)
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        const d = digitsFrom24(range.start);
        setBuf(d);
        onChange(range.start);
        return;
      }
    }

    // Extract digits only – do NOT normalise here to avoid "1:" → "01:00"
    const d = raw.replace(/\D/g, '').slice(0, 4);
    if (d !== bufRef.current) {
      applyBuf(d);
    }
  };

  // ── Select from clock picker ─────────────────────────────────────────────────
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
    const d = digitsFrom24(v24);
    setBuf(d);
    if (inputRef.current) inputRef.current.value = getDisplay(d);
    setClockPeriod(parseInt(v24.split(':')[0], 10) >= 12 ? 'PM' : 'AM');
    onChange(v24);
    setIsClockOpen(false);
  };

  // ── Clock Popover ─────────────────────────────────────────────────────────────
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal =
      (bufRef.current.length === 4 ? digits4To24(bufRef.current) : null) ||
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

  // ── Shared input props ────────────────────────────────────────────────────────
  // NOTE: We use defaultValue + ref management instead of value= to prevent
  // React's controlled-input reconciliation from fighting our manual DOM updates.
  const inputProps = {
    ref: inputRef,
    type: 'text' as const,
    defaultValue: getDisplay(),
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onCut: handleCut,
    onPaste: handlePaste,
    placeholder,
    autoComplete: 'off',
    spellCheck: false,
    inputMode: 'numeric' as const,
  };

  // ─── Variant: Compact ────────────────────────────────────────────────────────
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

  // ─── Variant: Underline ──────────────────────────────────────────────────────
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

  // ─── Variant: Box (Default) ──────────────────────────────────────────────────
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
