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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES_COMMON = ['00', '15', '30', '45'];

// ─── PURE HELPERS ─────────────────────────────────────────────────────────────

/**
 * Trích xuất tối đa 4 chữ số từ chuỗi "HH:mm" (bỏ ":" và ký tự khác).
 * "12:00" → "1200", "09:05" → "0905"
 */
const digitsFrom24 = (val24: string): string =>
  val24.replace(/\D/g, '').slice(0, 4);

/**
 * Chuyển 4 chữ số sang chuỗi 24h "HH:mm".
 * KHÔNG dùng Date object, KHÔNG cộng/trừ timezone.
 * "1200" → "12:00", "0905" → "09:05", "2359" → "23:59"
 */
const digits4To24 = (d: string): string | null => {
  if (d.length !== 4) return null;
  const h = parseInt(d.slice(0, 2), 10);
  const m = parseInt(d.slice(2, 4), 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Chuyển buffer digit (0–4 ký tự) thành text hiển thị trong ô input.
 * Luôn giữ dấu ":" cố định.
 *   ""     → ""
 *   "1"    → "1:"
 *   "12"   → "12:"
 *   "123"  → "12:3"
 *   "1200" → "12:00"
 */
const digitsToDisplay = (d: string): string => {
  if (d.length === 0) return '';
  if (d.length === 1) return `${d}:`;
  if (d.length === 2) return `${d}:`;
  if (d.length === 3) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
};

/**
 * Định dạng hiển thị cho tiếng Anh (12h AM/PM).
 * Input phải là chuỗi 24h hợp lệ "HH:mm".
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
 * Chuẩn hóa mọi định dạng user có thể gõ → chuỗi 24h "HH:mm" hoặc null.
 * Hỗ trợ: "1200", "12:00", "18h", "18h30", "6pm", "6:30pm"
 * KHÔNG dùng Date object.
 */
export const normalizeTimeString = (raw: string): string | null => {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  // 1. 12h AM/PM: "6pm", "6:30pm", "6:30 pm", "12am"
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

  // 2. Vietnamese "h" notation: "18h" → "18:00", "18h30" → "18:30"
  const hMatch = s.match(/^(\d{1,2})\s*h\s*(\d{0,2})$/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const mRaw = hMatch[2];
    // "18h3" → minute = 30 (single digit after h means tens digit)
    const m = mRaw
      ? mRaw.length === 1
        ? parseInt(mRaw + '0', 10)
        : parseInt(mRaw, 10)
      : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  // 3. Colon notation: "18:00", "9:5", "18:"
  if (s.includes(':')) {
    const [hStr, mStr = '00'] = s.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(m) && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  // 4. Raw digits only
  const digits = s.replace(/\D/g, '');
  if (digits.length === 1 || digits.length === 2) {
    const h = parseInt(digits, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    return null;
  }
  if (digits.length === 3) {
    // Ambiguous – treat as H:MM (e.g. "930" → "09:30")
    const h = parseInt(digits.slice(0, 1), 10);
    const m = parseInt(digits.slice(1), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }
  if (digits.length === 4) {
    // HHMM: first 2 = hour, last 2 = minute
    const h = parseInt(digits.slice(0, 2), 10);
    const m = parseInt(digits.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return null;
  }

  return null;
};

/**
 * Phát hiện dải giờ dạng "11h - 18h", "11:00 - 18:00", "11 đến 18" …
 */
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
  // ── CORE STATE: digit buffer (0–4 chars, digits only, no colon) ──
  const [buf, setBuf] = useState<string>(() => digitsFrom24(value));
  const [isFocused, setIsFocused] = useState(false);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');
  const freshFocus = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Displayed text is always DERIVED from buf (single source of truth)
  const displayText = (): string => {
    if (buf.length === 0) return '';
    const raw = digitsToDisplay(buf);
    // For English 12h display only when we have a complete 4-digit value
    if (isEn && buf.length === 4) {
      const v24 = digits4To24(buf);
      if (v24) return formatDisplayString(v24, true);
    }
    return raw;
  };

  // ── Sync from external prop when not focused ──
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

  // ── Close clock on outside click ──
  useEffect(() => {
    if (!isClockOpen) return;
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsClockOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [isClockOpen]);

  // ── Apply a new digit buffer and emit onChange ──
  const applyBuf = (newBuf: string) => {
    const d = newBuf.slice(0, 4);
    setBuf(d);
    if (d.length === 4) {
      const v24 = digits4To24(d);
      if (v24) onChange(v24);
      // Don't emit partial/invalid values — keep last valid value
    } else if (d.length === 0) {
      onChange('');
    }
    // For partial input (1–3 digits), don't emit yet
  };

  // ── Step time ±N minutes ──
  const stepTime = (deltaMinutes: number) => {
    const base = (buf.length === 4 ? digits4To24(buf) : null) || normalizeTimeString(value) || '12:00';
    const [hStr, mStr] = base.split(':');
    let total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    const v24 = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    const d = digitsFrom24(v24);
    setBuf(d);
    setClockPeriod(nh >= 12 ? 'PM' : 'AM');
    onChange(v24);
  };

  // ── Focus ──
  const handleFocus = () => {
    setIsFocused(true);
    freshFocus.current = true;
    setTimeout(() => inputRef.current?.select(), 10);
  };

  // ── Blur: finalise partial input ──
  const handleBlur = () => {
    setIsFocused(false);
    freshFocus.current = false;

    if (buf.length === 0) {
      onChange('');
      return;
    }

    // 1 or 2 digits → treat as hour
    if (buf.length === 1 || buf.length === 2) {
      const h = parseInt(buf, 10);
      if (h >= 0 && h <= 23) {
        const v24 = `${String(h).padStart(2, '0')}:00`;
        const d = digitsFrom24(v24);
        setBuf(d);
        onChange(v24);
      }
      return;
    }

    // 3 digits → H:MM (e.g. "123" → 12:30 — first digit = 1, but HH convention:
    // treat as HH:M where M is tens digit of minute)
    if (buf.length === 3) {
      const h = parseInt(buf.slice(0, 2), 10);
      const mTens = parseInt(buf.slice(2), 10);
      // "123" → h=12, mTens=3 → minute = 30
      const m = mTens <= 5 ? mTens * 10 : mTens; // single tens digit of minute
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const v24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setBuf(digitsFrom24(v24));
        onChange(v24);
      }
      return;
    }

    // 4 digits → already valid (applyBuf handles onChange)
    if (buf.length === 4) {
      const v24 = digits4To24(buf);
      if (v24) onChange(v24);
    }
  };

  // ── Keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.currentTarget.blur(); return; }
    if (e.key === 'Escape') { setIsClockOpen(false); return; }

    // Digits 0–9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const input = e.currentTarget;
      const allSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      const reset = freshFocus.current || allSelected || buf.length >= 4;
      freshFocus.current = false;
      applyBuf(reset ? e.key : buf + e.key);
      return;
    }

    // Backspace – remove last digit, keep colon structure
    if (e.key === 'Backspace') {
      e.preventDefault();
      freshFocus.current = false;
      const input = e.currentTarget;
      const allSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      if (allSelected || buf.length <= 1) {
        setBuf('');
        onChange('');
      } else {
        applyBuf(buf.slice(0, -1));
      }
      return;
    }

    // Delete – clear all
    if (e.key === 'Delete') {
      e.preventDefault();
      freshFocus.current = false;
      setBuf('');
      onChange('');
      return;
    }

    // 'h' or 'H' – finalise hour (Vietnamese shorthand)
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      freshFocus.current = false;
      if (buf.length === 1 || buf.length === 2) {
        const h = parseInt(buf, 10);
        if (h >= 0 && h <= 23) {
          const v24 = `${String(h).padStart(2, '0')}:00`;
          setBuf(digitsFrom24(v24));
          onChange(v24);
        }
      }
      return;
    }

    // ':' – pad hour with leading zero if single digit
    if (e.key === ':') {
      e.preventDefault();
      freshFocus.current = false;
      if (buf.length === 1) {
        setBuf(buf.padStart(2, '0'));
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

  // ── Paste ──
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Range detection
    if (onRangeDetected) {
      const range = parseTimeRangeString(pasted);
      if (range) {
        onRangeDetected(range.start, range.end);
        setBuf(digitsFrom24(range.start));
        onChange(range.start);
        return;
      }
    }

    // Single time
    const norm = normalizeTimeString(pasted);
    if (norm) {
      setBuf(digitsFrom24(norm));
      onChange(norm);
      return;
    }

    // Fallback: raw digits
    const d = pasted.replace(/\D/g, '').slice(0, 4);
    if (d) applyBuf(d);
  };

  // ── Cut ──
  const handleCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    try { navigator.clipboard?.writeText(displayText()); } catch {}
    setBuf('');
    onChange('');
  };

  // ── handleChange: blocked — all input goes through handleKeyDown ──
  // We MUST supply an onChange to avoid React warning, but it does nothing
  // because onKeyDown + e.preventDefault() intercepts all key presses.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only fires on IME / mobile soft keyboard input that bypasses keyDown.
    // In that case, re-parse raw value.
    const raw = e.target.value;

    // Range
    if (onRangeDetected) {
      const range = parseTimeRangeString(raw);
      if (range) {
        onRangeDetected(range.start, range.end);
        setBuf(digitsFrom24(range.start));
        onChange(range.start);
        return;
      }
    }

    // Normalise whatever the user typed
    const norm = normalizeTimeString(raw);
    if (norm) {
      setBuf(digitsFrom24(norm));
      onChange(norm);
      return;
    }

    // Fallback: extract digits
    const d = raw.replace(/\D/g, '').slice(0, 4);
    if (d !== buf) applyBuf(d);
  };

  // ── Select from clock picker ──
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
    setBuf(digitsFrom24(v24));
    setClockPeriod(parseInt(v24.split(':')[0], 10) >= 12 ? 'PM' : 'AM');
    onChange(v24);
    setIsClockOpen(false);
  };

  // ── Clock Popover ──
  const renderClockPicker = () => {
    if (!isClockOpen) return null;
    const curVal = (buf.length === 4 ? digits4To24(buf) : null) || normalizeTimeString(value) || '12:00';
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

        {/* AM/PM toggle (English only) */}
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
              {isEn ? 'Click to set' : 'Bấm số để chọn'}
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

  // ── Shared input props ──
  const inputProps = {
    ref: inputRef,
    type: 'text' as const,
    value: displayText(),
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onCut: handleCut,
    onPaste: handlePaste,
    placeholder,
    autoComplete: 'off',
    inputMode: 'numeric' as const,
  };

  // ─── Variant: Compact ───────────────────────────────────────────────────────
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

  // ─── Variant: Underline ─────────────────────────────────────────────────────
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
            title={isEn ? 'Open clock picker' : 'Mở bảng đồng hồ chọn giờ'}
            className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {renderClockPicker()}
      </div>
    );
  }

  // ─── Variant: Box (Default) ─────────────────────────────────────────────────
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
          title={isEn ? 'Open clock picker' : 'Mở bảng đồng hồ chọn giờ'}
          className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-1 rounded-lg transition-colors cursor-pointer"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>
      {renderClockPicker()}
    </div>
  );
};
