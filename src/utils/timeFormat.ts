/**
 * Format a time, time string, Date, or time range for display in 24-hour clock format (HH:mm).
 * - Both English and Vietnamese use the strict 24-hour format (00:00 - 23:59), absolutely NO AM/PM.
 *
 * Internal storage must always be standard 24h ("HH:mm").
 */
export const formatDisplayTime = (
  timeInput: string | Date | number | undefined | null,
  _isEn?: boolean
): string => {
  if (timeInput === undefined || timeInput === null || timeInput === '') {
    return '';
  }

  // If input is a Date object
  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return '--:--';
    const h = timeInput.getHours();
    const m = timeInput.getMinutes();
    const mStr = String(m).padStart(2, '0');
    return `${String(h).padStart(2, '0')}:${mStr}`;
  }

  // If input is numeric minutes (0 - 1440)
  if (typeof timeInput === 'number') {
    const totalMins = Math.round(timeInput);
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const mStr = String(m).padStart(2, '0');
    return `${String(h).padStart(2, '0')}:${mStr}`;
  }

  const str = String(timeInput).trim();
  if (!str) return '';

  // Regex to match "HH:mm" or "H:mm" optionally followed by AM/PM
  // Matches e.g. "07:30", "7:30", "11:00 PM", "11:00PM", "07:30 am", "14:20"
  return str.replace(/(\d{1,2}):(\d{1,2})(?:\s*([AaPp][Mm]))?/g, (_match, hStr, mStr, ampm) => {
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    // If AM/PM is already specified in the input string, convert to standard 24h hour first
    if (ampm) {
      const isPM = ampm.toUpperCase() === 'PM';
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
    }

    h = Math.max(0, Math.min(23, h));
    const padM = String(isNaN(m) ? 0 : Math.max(0, Math.min(59, m))).padStart(2, '0');

    // Strict 24-hour clock (no AM, no PM, strictly 00:00 - 23:59)
    return `${String(h).padStart(2, '0')}:${padM}`;
  });
};

/**
 * Normalizes user-typed time string or raw numeric digits to standard 24h "HH:mm".
 * Rules:
 * 1 digit: "6" -> "06:00", "9" -> "09:00"
 * 2 digits: HOURS -> "06" -> "06:00", "09" -> "09:00", "14" -> "14:00"
 * 3 digits: HMM (first digit hour, last two digits minutes) -> "600" -> "06:00", "615" -> "06:15", "930" -> "09:30"
 * 4 digits: HHMM -> "0600" -> "06:00", "1430" -> "14:30", "0006" -> "00:06"
 * with ':' : "6:15" -> "06:15", "06:15" -> "06:15", "00:06" -> "00:06"
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

  // 3. Colon notation: "18:00", "9:05", "18:", "6:15", "06:15", "00:06"
  if (s.includes(':')) {
    const colonMatch = s.match(/^(\d{1,2})\s*:\s*(\d{0,2})$/);
    if (colonMatch) {
      const h = parseInt(colonMatch[1], 10);
      const m = colonMatch[2] ? parseInt(colonMatch[2], 10) : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return null;
  }

  // 4. Raw digits: 1–4 digits
  if (/^\d{1,4}$/.test(s)) {
    // 1 or 2 digits: HOURS
    if (s.length === 1 || s.length === 2) {
      const h = parseInt(s, 10);
      if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
      return null;
    }

    // 3 digits: HMM (first digit = hour, last two digits = minutes)
    if (s.length === 3) {
      const h = parseInt(s.slice(0, 1), 10);
      const m = parseInt(s.slice(1, 3), 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      return null;
    }

    // 4 digits: HHMM
    if (s.length === 4) {
      const h = parseInt(s.slice(0, 2), 10);
      const m = parseInt(s.slice(2, 4), 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      return null;
    }
  }

  return null;
};

/**
 * Normalizes any time string (whether 12h "02:30 PM", 24h "14:30", or raw digits "600") to standard "HH:mm".
 */
export const toStandard24h = (timeStr: string): string => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const norm = normalizeTimeString(clean);
  if (norm) return norm;

  const match = clean.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return clean;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm) {
    const isPM = ampm.toUpperCase() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
  }
  h = Math.max(0, Math.min(23, h));
  const padM = String(isNaN(m) ? 0 : Math.max(0, Math.min(59, m))).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${padM}`;
};
