import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
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
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value = '',
  onChange,
  isEn = false,
  className = '',
  variant = 'box',
}) => {
  const splitValue = (v: string): [string, string] => {
    const n = v ? normalizeTimeString(v) : null;
    return n ? (n.split(':') as [string, string]) : ['', ''];
  };

  const [pickHour, setPickHour] = useState<string>(() => splitValue(value)[0]);
  const [pickMinute, setPickMinute] = useState<string>(() => splitValue(value)[1]);

  useEffect(() => {
    const [h, m] = splitValue(value);
    setPickHour(h);
    setPickMinute(m);
  }, [value]);

  const emit = (v24: string) => {
    onChange(v24);
  };

  // Step ±N minutes
  const stepTime = (deltaMinutes: number) => {
    let curH = parseInt(pickHour, 10);
    if (isNaN(curH)) {
      const norm = normalizeTimeString(value);
      curH = norm ? parseInt(norm.split(':')[0], 10) : 12;
    }
    let curM = parseInt(pickMinute, 10);
    if (isNaN(curM)) {
      const norm = normalizeTimeString(value);
      curM = norm ? parseInt(norm.split(':')[1], 10) : 0;
    }
    let total = curH * 60 + curM + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    setPickHour(nh);
    setPickMinute(nm);
    emit(`${nh}:${nm}`);
  };

  const renderSingleInput = (fontSizeClass: string, widthClass: string) => {
    const selectClass = `${fontSizeClass} font-heading font-bold tabular-nums text-center bg-transparent outline-none p-0 appearance-none cursor-pointer text-[#1F2937] dark:text-white hover:text-[#007b4d] dark:hover:text-[#62D2FB] focus:text-[#007b4d] dark:focus:text-[#62D2FB] transition-colors`;
    const commit = (h: string, m: string) => emit(`${h}:${m}`);
    return (
      <div className="flex items-center">
        <div className={`${widthClass} flex items-center justify-center tracking-wider`}>
          <select
            aria-label={isEn ? 'Hour' : 'Giờ'}
            value={pickHour}
            onChange={(e) => {
              const h = e.target.value;
              const m = pickMinute || '00';
              setPickHour(h);
              setPickMinute(m);
              commit(h, m);
            }}
            className={selectClass}
          >
            {!pickHour && <option value="" disabled>--</option>}
            {HOURS_24.map((h) => (
              <option key={h} value={h} className="text-base text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                {h}
              </option>
            ))}
          </select>
          <span className={`${fontSizeClass} font-heading font-bold text-[#1F2937] dark:text-white px-0.5 select-none`}>
            :
          </span>
          <select
            aria-label={isEn ? 'Minute' : 'Phút'}
            value={pickMinute}
            onChange={(e) => {
              const m = e.target.value;
              const h = pickHour || '00';
              setPickHour(h);
              setPickMinute(m);
              commit(h, m);
            }}
            className={selectClass}
          >
            {!pickMinute && <option value="" disabled>--</option>}
            {MINUTES_60.map((m) => (
              <option key={m} value={m} className="text-base text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                {m}
              </option>
            ))}
          </select>
        </div>
        {isEn && pickHour && (
          <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-[#007b4d] dark:text-[#62D2FB] select-none">
            {parseInt(pickHour, 10) >= 12 ? 'PM' : 'AM'}
          </span>
        )}
      </div>
    );
  };

  // ─── Variant: Compact ─────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        className={`relative inline-flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-[#1F2937] dark:text-white focus-within:border-[#4CB28E] dark:focus-within:border-[#62D2FB] focus-within:ring-1 focus-within:ring-[#4CB28E] transition-all ${className}`}
      >
        {renderSingleInput('text-sm sm:text-base', 'w-16 sm:w-20')}
      </div>
    );
  }

  // ─── Variant: Underline ───────────────────────────────────────────────────────
  if (variant === 'underline') {
    return (
      <div
        className={`relative w-full flex items-center justify-between border-b border-slate-300 dark:border-slate-500 pb-1 ${className}`}
      >
        {renderSingleInput('text-2xl sm:text-3xl', 'w-28 sm:w-36')}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => stepTime(5)}
              className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stepTime(-5)}
              className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Variant: Box (Default) ───────────────────────────────────────────────────
  return (
    <div
      className={`relative flex-1 flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm focus-within:border-[#007b4d] dark:focus-within:border-[#62D2FB] focus-within:ring-2 focus-within:ring-[#007b4d]/20 transition-all ${className}`}
    >
      {renderSingleInput('text-base sm:text-lg', 'w-20 sm:w-24')}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => stepTime(5)}
            className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stepTime(-5)}
            className="hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-0.5 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
