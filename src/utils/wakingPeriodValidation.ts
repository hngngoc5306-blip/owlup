import { UserProfile } from '../types';
import { formatDisplayTime } from './timeFormat';
import { getLocalDateStr, getTodayWakeInfo, getWakeRecords } from './wakeTimeService';

export interface WakingPeriod {
  wakeTime: string; // 'HH:mm'
  bedtime: string;  // 'HH:mm'
  wakeDate: Date;
  bedDate: Date;
  isOvernight: boolean; // true if bedtime falls on next calendar day (e.g. 01:00 AM)
  displayWake: string;
  displayBed: string;
}

export type WakingValidationStatus = 
  | 'valid'
  | 'before_wakeup'
  | 'after_bedtime'
  | 'exceeds_waking_period'
  | 'missing_sleep_data';

export interface WakingValidationResult {
  isValid: boolean;
  status: WakingValidationStatus;
  message: string;
  messageEn: string;
  messageVi: string;
  wakingPeriod?: WakingPeriod | null;
}

const parseMins = (t: string): number => {
  if (!t) return 0;
  const clean = t.replace(/[^0-9:]/g, '');
  const [h, m] = clean.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Retrieves the user's wake-up time and bedtime for a specific calendar date,
 * constructing full Date objects for wakeDate and bedDate.
 */
export const getWakingPeriodForDate = (
  date: Date = new Date(),
  customWakeTime?: string | null,
  customBedtime?: string | null,
  userProfile?: UserProfile | null,
  isEn: boolean = true
): WakingPeriod | null => {
  const dateStr = getLocalDateStr(date);
  const todayStr = getLocalDateStr(new Date());

  // 1. Resolve wake-up time for this date
  let resolvedWake: string | null = customWakeTime || null;

  if (!resolvedWake) {
    const records = getWakeRecords();
    if (records[dateStr]) {
      resolvedWake = records[dateStr];
    } else if (dateStr === todayStr) {
      const todayInfo = getTodayWakeInfo(date, userProfile, isEn);
      resolvedWake = todayInfo.time;
      if (!resolvedWake) {
        resolvedWake = localStorage.getItem('owlup_wakeup_today') || localStorage.getItem('owlup_waketime');
      }
    } else {
      resolvedWake = records[dateStr] || null;
    }
  }

  // Profile fallbacks
  if (!resolvedWake && userProfile?.wakeUpToday && userProfile?.wakeUpTodayDate === dateStr) {
    resolvedWake = userProfile.wakeUpToday;
  }
  if (!resolvedWake && userProfile?.usualWakeTime) {
    resolvedWake = userProfile.usualWakeTime;
  }

  // 2. Resolve bedtime for this date
  let resolvedBed: string | null = customBedtime || null;
  if (!resolvedBed) {
    resolvedBed = localStorage.getItem('owlup_bedtime') || userProfile?.bedtime || userProfile?.usualBedtime || null;
  }

  if (!resolvedWake || !resolvedBed) {
    return null;
  }

  const [wh, wm] = resolvedWake.split(':').map(Number);
  const [bh, bm] = resolvedBed.split(':').map(Number);

  const baseYear = date.getFullYear();
  const baseMonth = date.getMonth();
  const baseDay = date.getDate();

  const wakeDate = new Date(baseYear, baseMonth, baseDay, wh || 0, wm || 0, 0, 0);

  const wakeMins = (wh || 0) * 60 + (wm || 0);
  const bedMins = (bh || 0) * 60 + (bm || 0);

  // If bedtime is <= wake time (e.g. wake 08:00, bedtime 01:00), bedtime falls on next day
  const isOvernight = bedMins <= wakeMins;
  const bedDate = new Date(
    baseYear,
    baseMonth,
    baseDay + (isOvernight ? 1 : 0),
    bh || 0,
    bm || 0,
    0,
    0
  );

  return {
    wakeTime: resolvedWake,
    bedtime: resolvedBed,
    wakeDate,
    bedDate,
    isOvernight,
    displayWake: formatDisplayTime(resolvedWake, isEn),
    displayBed: formatDisplayTime(resolvedBed, isEn),
  };
};

export const getEventDateForTime = (
  timeMins: number,
  baseDate: Date,
  wakeMins: number,
  bedMins: number,
  isOvernight: boolean
): Date => {
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth();
  const baseDay = baseDate.getDate();

  const h = Math.floor(timeMins / 60) % 24;
  const m = timeMins % 60;

  if (isOvernight) {
    const nightCutoffMins = Math.min(wakeMins - 60, bedMins + 3 * 60);
    if (timeMins <= nightCutoffMins) {
      return new Date(baseYear, baseMonth, baseDay + 1, h, m, 0, 0);
    } else {
      return new Date(baseYear, baseMonth, baseDay, h, m, 0, 0);
    }
  } else {
    if (timeMins <= 4 * 60) {
      return new Date(baseYear, baseMonth, baseDay + 1, h, m, 0, 0);
    } else {
      return new Date(baseYear, baseMonth, baseDay, h, m, 0, 0);
    }
  }
};

/**
 * Validates an event with a start and end time (duration) against the user's waking period.
 */
export const validateIntervalEventInWakingPeriod = (params: {
  start: string;
  end: string;
  baseDate?: Date;
  wakeTime?: string | null;
  bedtime?: string | null;
  userProfile?: UserProfile | null;
  isEn?: boolean;
}): WakingValidationResult => {
  const {
    start,
    end,
    baseDate = new Date(),
    wakeTime,
    bedtime,
    userProfile,
    isEn = true,
  } = params;

  if (!start || !end) {
    return {
      isValid: true,
      status: 'valid',
      message: '',
      messageEn: '',
      messageVi: '',
    };
  }

  const wakingPeriod = getWakingPeriodForDate(baseDate, wakeTime, bedtime, userProfile, isEn);

  if (!wakingPeriod) {
    const msgEn = "Please configure your sleep schedule (wake-up time and bedtime) to define your waking hours.";
    const msgVi = "Vui lòng cài đặt lịch ngủ (giờ thức dậy và giờ đi ngủ) để xác định khoảng thời gian thức.";
    return {
      isValid: false,
      status: 'missing_sleep_data',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod: null,
    };
  }

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = (sh || 0) * 60 + (sm || 0);
  const endMins = (eh || 0) * 60 + (em || 0);
  const { wakeDate, bedDate, isOvernight, displayWake, displayBed, bedtime: bedStr, wakeTime: wakeStr } = wakingPeriod;
  const bedMins = parseMins(bedStr);
  const wakeMins = parseMins(wakeStr);

  const startDate = getEventDateForTime(startMins, baseDate, wakeMins, bedMins, isOvernight);
  let endDate = getEventDateForTime(endMins, baseDate, wakeMins, bedMins, isOvernight);

  if (endDate.getTime() <= startDate.getTime() && endMins < startMins) {
    // Crosses midnight relative to start
    endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const wakeMs = wakeDate.getTime();
  const bedMs = bedDate.getTime();

  if (startMs < wakeMs && endMs > bedMs) {
    const msgEn = "This event extends beyond your waking hours. Please adjust its start or end time.";
    const msgVi = "Thời lượng sự kiện vượt quá khoảng thời gian thức của bạn. Vui lòng điều chỉnh giờ bắt đầu hoặc giờ kết thúc.";
    return {
      isValid: false,
      status: 'exceeds_waking_period',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod,
    };
  }

  if (startMs < wakeMs) {
    const msgEn = `This event is scheduled before your wake-up time. Please choose a time between ${displayWake} and ${displayBed} to continue.`;
    const msgVi = `Sự kiện này diễn ra trước giờ thức dậy của bạn. Vui lòng chọn thời gian từ ${displayWake} đến ${displayBed} để tiếp tục.`;
    return {
      isValid: false,
      status: 'before_wakeup',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod,
    };
  }

  if (endMs > bedMs) {
    const msgEn = `This event is scheduled after your bedtime. Please adjust the time to fall within your waking hours (${displayWake} - ${displayBed}).`;
    const msgVi = `Sự kiện này diễn ra sau giờ đi ngủ của bạn. Vui lòng điều chỉnh thời gian trong khoảng thời gian thức (${displayWake} - ${displayBed}).`;
    return {
      isValid: false,
      status: 'after_bedtime',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod,
    };
  }

  return {
    isValid: true,
    status: 'valid',
    message: '',
    messageEn: '',
    messageVi: '',
    wakingPeriod,
  };
};

/**
 * Validates an instantaneous event (e.g., Caffeine Consumption) against the user's waking period.
 */
export const validateInstantEventInWakingPeriod = (params: {
  time?: string | null;
  timestamp?: Date | string | null;
  baseDate?: Date;
  wakeTime?: string | null;
  bedtime?: string | null;
  userProfile?: UserProfile | null;
  isEn?: boolean;
}): WakingValidationResult => {
  const {
    time,
    timestamp,
    baseDate = new Date(),
    wakeTime,
    bedtime,
    userProfile,
    isEn = true,
  } = params;

  let effectiveBaseDate = baseDate;
  let eventDate: Date | null = null;

  if (timestamp) {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (!isNaN(d.getTime())) {
      eventDate = d;
      effectiveBaseDate = d;
    }
  }

  const wakingPeriod = getWakingPeriodForDate(effectiveBaseDate, wakeTime, bedtime, userProfile, isEn);

  if (!wakingPeriod) {
    const msgEn = "Please configure your sleep schedule (wake-up time and bedtime) to define your waking hours.";
    const msgVi = "Vui lòng cài đặt lịch ngủ (giờ thức dậy và giờ đi ngủ) để xác định khoảng thời gian thức.";
    return {
      isValid: false,
      status: 'missing_sleep_data',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod: null,
    };
  }

  const { wakeDate, bedDate, isOvernight, displayWake, displayBed, bedtime: bedStr } = wakingPeriod;
  const bedMins = parseMins(bedStr);

  if (!eventDate) {
    if (!time || !time.includes(':')) {
      return {
        isValid: true,
        status: 'valid',
        message: '',
        messageEn: '',
        messageVi: '',
        wakingPeriod,
      };
    }

    const [eh, em] = time.split(':').map(Number);
    const evtMins = (eh || 0) * 60 + (em || 0);
    const wakeMins = parseMins(wakingPeriod.wakeTime);

    eventDate = getEventDateForTime(evtMins, effectiveBaseDate, wakeMins, bedMins, isOvernight);
  }

  const eventMs = eventDate.getTime();
  const wakeMs = wakeDate.getTime();
  const bedMs = bedDate.getTime();

  if (eventMs < wakeMs) {
    if (timestamp) {
      const prevDate = new Date(effectiveBaseDate.getFullYear(), effectiveBaseDate.getMonth(), effectiveBaseDate.getDate() - 1);
      const prevWakingPeriod = getWakingPeriodForDate(prevDate, wakeTime, bedtime, userProfile, isEn);
      if (prevWakingPeriod && prevWakingPeriod.isOvernight) {
        if (eventMs >= prevWakingPeriod.wakeDate.getTime() && eventMs <= prevWakingPeriod.bedDate.getTime()) {
          return {
            isValid: true,
            status: 'valid',
            message: '',
            messageEn: '',
            messageVi: '',
            wakingPeriod: prevWakingPeriod,
          };
        }
      }
    }

    const msgEn = `This event is scheduled before your wake-up time. Please choose a time between ${displayWake} and ${displayBed} to continue.`;
    const msgVi = `Sự kiện này diễn ra trước giờ thức dậy của bạn. Vui lòng chọn thời gian từ ${displayWake} đến ${displayBed} để tiếp tục.`;
    return {
      isValid: false,
      status: 'before_wakeup',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod,
    };
  }

  if (eventMs > bedMs) {
    const msgEn = `This event is scheduled after your bedtime. Please adjust the time to fall within your waking hours (${displayWake} - ${displayBed}).`;
    const msgVi = `Sự kiện này diễn ra sau giờ đi ngủ của bạn. Vui lòng điều chỉnh thời gian trong khoảng thời gian thức (${displayWake} - ${displayBed}).`;
    return {
      isValid: false,
      status: 'after_bedtime',
      message: isEn ? msgEn : msgVi,
      messageEn: msgEn,
      messageVi: msgVi,
      wakingPeriod,
    };
  }

  return {
    isValid: true,
    status: 'valid',
    message: '',
    messageEn: '',
    messageVi: '',
    wakingPeriod,
  };
};
