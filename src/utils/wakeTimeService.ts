import { UserProfile } from '../types';

/**
 * Service to manage date association, retrieval, persistence, and rollover
 * for Today's Wake-up Time and Tomorrow's Wake-up Time.
 */

const STORAGE_KEYS = {
  WAKE_RECORDS: 'owlup_wake_records',
  TODAY_WAKE: 'owlup_wakeup_today',
  TODAY_WAKE_DATE: 'owlup_wakeup_today_date',
  TOMORROW_WAKE: 'owlup_tomorrow_waketime',
  TOMORROW_WAKE_DATE: 'owlup_tomorrow_wake_date',
  LEGACY_WAKE: 'owlup_waketime',
  LATEST_WAKE: 'owlup_latest_waketime',
  SCHEDULE_APPLIED: 'owlup_schedule_applied',
  SCHEDULE_DATE: 'owlup_schedule_date',
  LAST_ACTIVE: 'owlup_last_active_date',
};

/**
 * Formats a Date object into a local calendar ISO string "YYYY-MM-DD".
 * Strictly uses local year, month, and day (never UTC) to prevent timezone drift.
 */
export const getLocalDateStr = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns tomorrow's Date relative to the given date in local time.
 * Handles month-end, year-end, leap years natively.
 */
export const getTomorrowDate = (d: Date = new Date()): Date => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
};

export const getTomorrowDateStr = (d: Date = new Date()): string => {
  return getLocalDateStr(getTomorrowDate(d));
};

/**
 * Returns yesterday's Date relative to the given date in local time.
 */
export const getYesterdayDate = (d: Date = new Date()): Date => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
};

export const getYesterdayDateStr = (d: Date = new Date()): string => {
  return getLocalDateStr(getYesterdayDate(d));
};

/**
 * Formats a Date or YYYY-MM-DD string into human-readable local date format.
 * EN: "October 4"
 * VI: "4 tháng 10"
 */
export const formatDisplayDate = (dateInput: Date | string, isEn: boolean): string => {
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return '';
  if (isEn) {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } else {
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
  }
};

/**
 * Retrieves the persisted map of { [dateStr: string]: wakeTimeStr }
 */
export const getWakeRecords = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WAKE_RECORDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Persists a wake time associated with a specific calendar date (YYYY-MM-DD)
 */
export const saveWakeRecord = (dateStr: string, timeStr: string): void => {
  if (!dateStr || !timeStr) return;
  try {
    const records = getWakeRecords();
    records[dateStr] = timeStr;
    localStorage.setItem(STORAGE_KEYS.WAKE_RECORDS, JSON.stringify(records));
  } catch {}
};

export interface WakeInfo {
  time: string | null;
  dateStr: string;
  date: Date;
  displayDate: string;
  source: 'onboarding' | 'yesterday_schedule' | 'record' | 'none';
}

/**
 * Retrieves Today's Wake-up Time:
 * - For new users: answer to onboarding "What time did you wake up today?"
 * - For existing users: value planned in yesterday's Sleep Schedule for today
 * - From persisted wake records for today's date
 * If unavailable, returns null without substituting tomorrow's planned wake time.
 */
export const getTodayWakeInfo = (
  currentDate: Date = new Date(),
  userProfile?: UserProfile | null,
  isEn: boolean = true
): WakeInfo => {
  const todayStr = getLocalDateStr(currentDate);
  const todayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const displayDate = formatDisplayDate(todayDate, isEn);

  // 1. Check date-indexed records
  const records = getWakeRecords();
  if (records[todayStr]) {
    return {
      time: records[todayStr],
      dateStr: todayStr,
      date: todayDate,
      displayDate,
      source: 'record',
    };
  }

  // 2. Check onboarding answer for new users (stored for today's date)
  const storedWakeToday = localStorage.getItem(STORAGE_KEYS.TODAY_WAKE);
  const storedWakeTodayDate = localStorage.getItem(STORAGE_KEYS.TODAY_WAKE_DATE);
  if (storedWakeToday && storedWakeTodayDate === todayStr) {
    saveWakeRecord(todayStr, storedWakeToday);
    return {
      time: storedWakeToday,
      dateStr: todayStr,
      date: todayDate,
      displayDate,
      source: 'onboarding',
    };
  }

  // 3. Check profile wakeUpToday if date matches todayStr
  if (userProfile?.wakeUpToday && userProfile?.wakeUpTodayDate === todayStr) {
    saveWakeRecord(todayStr, userProfile.wakeUpToday);
    return {
      time: userProfile.wakeUpToday,
      dateStr: todayStr,
      date: todayDate,
      displayDate,
      source: 'onboarding',
    };
  }

  // 4. Check if yesterday's sleep schedule planned a wake time for todayStr
  const tomorrowWake = localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE);
  const tomorrowWakeDate = localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE_DATE);
  if (tomorrowWake && tomorrowWakeDate === todayStr) {
    saveWakeRecord(todayStr, tomorrowWake);
    return {
      time: tomorrowWake,
      dateStr: todayStr,
      date: todayDate,
      displayDate,
      source: 'yesterday_schedule',
    };
  }

  // No record available for today
  return {
    time: null,
    dateStr: todayStr,
    date: todayDate,
    displayDate,
    source: 'none',
  };
};

/**
 * Retrieves Tomorrow's Wake-up Time:
 * - Must come from TODAY'S Sleep Schedule in response to "What is the latest time you need to wake up tomorrow?"
 * - Associated with tomorrow's calendar date
 * - If not configured in today's sleep schedule, returns null without generating fake time
 */
export const getTomorrowWakeInfo = (
  currentDate: Date = new Date(),
  isEn: boolean = true
): WakeInfo => {
  const todayStr = getLocalDateStr(currentDate);
  const tomorrowDate = getTomorrowDate(currentDate);
  const tomorrowStr = getLocalDateStr(tomorrowDate);
  const displayDate = formatDisplayDate(tomorrowDate, isEn);

  // Must check if today's sleep schedule has been applied
  const applied = localStorage.getItem(STORAGE_KEYS.SCHEDULE_APPLIED) === 'true';
  const scheduleDate = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DATE);

  if (applied && scheduleDate === todayStr) {
    const tomorrowWake =
      localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE) ||
      localStorage.getItem(STORAGE_KEYS.LATEST_WAKE);
    const tomorrowWakeDate = localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE_DATE);

    if (tomorrowWake && (!tomorrowWakeDate || tomorrowWakeDate === tomorrowStr)) {
      return {
        time: tomorrowWake,
        dateStr: tomorrowStr,
        date: tomorrowDate,
        displayDate,
        source: 'record',
      };
    }

    const records = getWakeRecords();
    if (records[tomorrowStr]) {
      return {
        time: records[tomorrowStr],
        dateStr: tomorrowStr,
        date: tomorrowDate,
        displayDate,
        source: 'record',
      };
    }
  }

  return {
    time: null,
    dateStr: tomorrowStr,
    date: tomorrowDate,
    displayDate,
    source: 'none',
  };
};

/**
 * Saves tomorrow's wake-up time configured in today's Sleep Schedule
 */
export const recordTomorrowWakePlan = (
  wakeTime: string,
  currentDate: Date = new Date()
): void => {
  const todayStr = getLocalDateStr(currentDate);
  const tomorrowStr = getTomorrowDateStr(currentDate);

  localStorage.setItem(STORAGE_KEYS.TOMORROW_WAKE, wakeTime);
  localStorage.setItem(STORAGE_KEYS.TOMORROW_WAKE_DATE, tomorrowStr);
  localStorage.setItem(STORAGE_KEYS.LATEST_WAKE, wakeTime);
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_APPLIED, 'true');
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_DATE, todayStr);

  saveWakeRecord(tomorrowStr, wakeTime);
};

/**
 * Handles midnight date rollover:
 * - Tomorrow's planned wake time for newTodayStr becomes new today's wake reference
 * - Tomorrow's wake time is cleared until the user sets a new sleep schedule
 */
export const handleDateRolloverWakeState = (
  newTodayStr: string,
  userProfile?: UserProfile | null
): { todayWake: string | null; tomorrowWake: string | null } => {
  const records = getWakeRecords();
  let newTodayWake: string | null = records[newTodayStr] || null;

  if (!newTodayWake) {
    const tomorrowWake = localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE);
    const tomorrowWakeDate = localStorage.getItem(STORAGE_KEYS.TOMORROW_WAKE_DATE);
    if (tomorrowWake && tomorrowWakeDate === newTodayStr) {
      newTodayWake = tomorrowWake;
    }
  }

  if (newTodayWake) {
    localStorage.setItem(STORAGE_KEYS.TODAY_WAKE, newTodayWake);
    localStorage.setItem(STORAGE_KEYS.TODAY_WAKE_DATE, newTodayStr);
    localStorage.setItem(STORAGE_KEYS.LEGACY_WAKE, newTodayWake);
    saveWakeRecord(newTodayStr, newTodayWake);
  } else if (userProfile?.wakeUpToday && userProfile?.wakeUpTodayDate === newTodayStr) {
    newTodayWake = userProfile.wakeUpToday;
    localStorage.setItem(STORAGE_KEYS.TODAY_WAKE, newTodayWake);
    localStorage.setItem(STORAGE_KEYS.TODAY_WAKE_DATE, newTodayStr);
    localStorage.setItem(STORAGE_KEYS.LEGACY_WAKE, newTodayWake);
    saveWakeRecord(newTodayStr, newTodayWake);
  }

  // Clear tomorrow's wake-up time until user configures today's schedule
  localStorage.removeItem(STORAGE_KEYS.TOMORROW_WAKE);
  localStorage.removeItem(STORAGE_KEYS.TOMORROW_WAKE_DATE);
  localStorage.removeItem(STORAGE_KEYS.LATEST_WAKE);

  return {
    todayWake: newTodayWake,
    tomorrowWake: null,
  };
};
