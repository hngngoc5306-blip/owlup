/**
 * Format a time, time string, Date, or time range for display.
 * - Vietnamese (isEn = false): Pure 24-hour clock (00:00 - 23:59), absolutely NO AM/PM.
 * - English (isEn = true): 12-hour clock with AM/PM (e.g., 11:00 PM, 07:00 AM, 12:30 PM).
 *
 * Internal storage must always be standard 24h ("HH:mm").
 */
export const formatDisplayTime = (
  timeInput: string | Date | number | undefined | null,
  isEn: boolean
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
    if (!isEn) {
      return `${String(h).padStart(2, '0')}:${mStr}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${mStr}\u00A0${period}`;
  }

  // If input is numeric minutes (0 - 1440)
  if (typeof timeInput === 'number') {
    const totalMins = Math.round(timeInput);
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const mStr = String(m).padStart(2, '0');
    if (!isEn) {
      return `${String(h).padStart(2, '0')}:${mStr}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${mStr}\u00A0${period}`;
  }

  const str = String(timeInput).trim();
  if (!str) return '';

  // Regex to match "HH:mm" or "H:mm" optionally followed by AM/PM
  // Matches e.g. "07:30", "7:30", "11:00 PM", "11:00PM", "07:30 am", "14:20"
  return str.replace(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/g, (_match, hStr, mStr, ampm) => {
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

    if (!isEn) {
      // Vietnamese: STRICT 24-hour clock (no AM, no PM, strictly 00:00 - 23:59)
      return `${String(h).padStart(2, '0')}:${padM}`;
    }

    // English: 12-hour clock with AM/PM (e.g. 03:45 PM, 07:30 AM)
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${padM}\u00A0${period}`;
  });
};

/**
 * Normalizes any time string (whether 12h "02:30 PM" or 24h "14:30") to standard "HH:mm".
 */
export const toStandard24h = (timeStr: string): string => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
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
