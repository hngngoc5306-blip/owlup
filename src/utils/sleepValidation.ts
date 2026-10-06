export interface SleepScheduleValidation {
  isValid: boolean;
  errorKey?: 'bedtime_past' | 'duration_too_short' | 'duration_too_long' | 'nap_conflict' | 'invalid_format';
  messageEn?: string;
  messageVi?: string;
  bedContMins: number;
  wakeContMins: number;
  sleepDurationMins: number;
}

export const validateSleepSchedule = (
  bedtimeStr: string,
  wakeTimeStr: string,
  currentTime: Date,
  napStartStr?: string,
  napDurationStr?: string
): SleepScheduleValidation => {
  const isTimeFormatValid = (t?: string) => {
    if (!t || t === '--:--' || !t.includes(':')) return false;
    const [h, m] = t.split(':').map(Number);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  if (!isTimeFormatValid(bedtimeStr) || !isTimeFormatValid(wakeTimeStr)) {
    return {
      isValid: false,
      errorKey: 'invalid_format',
      messageEn: 'Please enter a valid bedtime and wake-up time (HH:mm format).',
      messageVi: 'Vui lòng nhập giờ đi ngủ và giờ thức dậy hợp lệ (định dạng HH:mm).',
      bedContMins: 0,
      wakeContMins: 0,
      sleepDurationMins: 0,
    };
  }

  const curH = currentTime.getHours();
  const curM = currentTime.getMinutes();
  const curMins = curH * 60 + curM;

  const [bedH, bedM] = bedtimeStr.split(':').map(Number);
  const rawBedMins = bedH * 60 + bedM;

  const [wakeH, wakeM] = wakeTimeStr.split(':').map(Number);
  const rawWakeMins = wakeH * 60 + wakeM;

  // ── 1. Bedtime Tonight Continuous Minutes ──────────────────────────────────
  // Bedtime Tonight must represent the next occurrence of selected bedtime after current time.
  // It must not be in the past when user submits the sleep plan.
  let bedContMins = rawBedMins;

  if (curMins >= 12 * 60) {
    // Current time is 12:00 - 23:59 (afternoon/evening/night)
    if (bedH < 12) {
      // Bedtime after midnight belongs to next calendar day (tomorrow morning, e.g. 01:00)
      bedContMins = rawBedMins + 24 * 60;
    } else {
      // Bedtime is tonight (e.g. 23:00)
      bedContMins = rawBedMins;
    }
  } else if (curMins < 6 * 60) {
    // Current time is 00:00 - 05:59 (early morning / post-midnight)
    if (bedH < 12) {
      // Bedtime is early this morning (e.g. 02:00)
      bedContMins = rawBedMins;
    } else {
      // Bedtime is tonight later in the day (e.g. 23:00)
      bedContMins = rawBedMins;
    }
  } else {
    // Current time is 06:00 - 11:59 (daytime morning)
    if (bedH < 6) {
      // Bedtime after midnight belongs to next calendar day (tomorrow at 01:00)
      bedContMins = rawBedMins + 24 * 60;
    } else {
      // Bedtime is tonight
      bedContMins = rawBedMins;
    }
  }

  // Check if bedtime has already passed
  // Example: Current time = 20:00, User selects 18:00 -> invalid, because that bedtime has already passed.
  if (bedContMins <= curMins) {
    const curTimeFormatted = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
    return {
      isValid: false,
      errorKey: 'bedtime_past',
      messageEn: `Bedtime tonight (${bedtimeStr}) has already passed (current time: ${curTimeFormatted}). Please select a future bedtime.`,
      messageVi: `Giờ đi ngủ đêm nay (${bedtimeStr}) đã trôi qua so với giờ hiện tại (${curTimeFormatted}). Vui lòng chọn giờ ngủ sau thời điểm hiện tại.`,
      bedContMins,
      wakeContMins: 0,
      sleepDurationMins: 0,
    };
  }

  // ── 2. Wake-up Tomorrow Morning Continuous Minutes ─────────────────────────
  // Wake-up Tomorrow Morning must always represent the intended wake-up time
  // on the next calendar day relative to the current sleep plan.
  let wakeContMins = rawWakeMins;
  if (curMins >= 12 * 60) {
    // Today is day 0, tomorrow morning is day 1 (+1440 mins)
    wakeContMins = rawWakeMins + 24 * 60;
  } else if (curMins < 6 * 60) {
    // Current time is early morning. Wake-up is tomorrow morning or later today:
    while (wakeContMins <= bedContMins) {
      wakeContMins += 24 * 60;
    }
  } else {
    // Daytime morning (06:00 - 11:59). Tomorrow morning is day 1 (+1440 mins).
    wakeContMins = rawWakeMins + 24 * 60;
  }

  // Ensure wake time is strictly after bedtime
  while (wakeContMins <= bedContMins) {
    wakeContMins += 24 * 60;
  }

  const sleepDurationMins = wakeContMins - bedContMins;

  // Enforce minimum biological sleep duration (at least 4.0 hours)
  if (sleepDurationMins < 4 * 60) {
    const durHours = (sleepDurationMins / 60).toFixed(1);
    return {
      isValid: false,
      errorKey: 'duration_too_short',
      messageEn: `Wake-up time tomorrow morning must allow at least 4.0 hours of sleep (current: ${durHours} hrs). Please adjust bedtime or wake-up time.`,
      messageVi: `Giờ thức dậy sáng mai phải đảm bảo giấc ngủ ít nhất 4.0 giờ (hiện tại: ${durHours} giờ). Vui lòng điều chỉnh lại giờ đi ngủ hoặc giờ thức dậy.`,
      bedContMins,
      wakeContMins,
      sleepDurationMins,
    };
  }

  // Enforce realistic sleep duration cap (max 14 hours)
  if (sleepDurationMins > 14 * 60) {
    const durHours = (sleepDurationMins / 60).toFixed(1);
    return {
      isValid: false,
      errorKey: 'duration_too_long',
      messageEn: `Sleep duration (${durHours} hrs) exceeds standard sleep limits (max 14 hrs). Please verify your wake-up time.`,
      messageVi: `Thời lượng ngủ (${durHours} giờ) vượt quá giới hạn chu kỳ ngủ (tối đa 14 giờ). Vui lòng kiểm tra lại giờ thức dậy.`,
      bedContMins,
      wakeContMins,
      sleepDurationMins,
    };
  }

  // ── 3. Nap Validation (if nap duration > 0) ─────────────────────────────────
  const parsedNap = parseInt(napDurationStr || '0') || 0;
  if (parsedNap > 0 && napStartStr && isTimeFormatValid(napStartStr)) {
    const [napH, napM] = napStartStr.split(':').map(Number);
    const rawNapMins = napH * 60 + napM;
    const napEnd = rawNapMins + parsedNap;

    let diffToBed = bedContMins - napEnd;
    if (diffToBed < 0 && bedContMins < 24 * 60) diffToBed += 24 * 60;

    if (diffToBed < 3 * 60) {
      return {
        isValid: false,
        errorKey: 'nap_conflict',
        messageEn: 'Power nap must end at least 3 hours before bedtime to protect your deep night sleep.',
        messageVi: 'Chợp mắt phải kết thúc ít nhất 3 tiếng trước giờ đi ngủ để bảo vệ giấc ngủ đêm sâu.',
        bedContMins,
        wakeContMins,
        sleepDurationMins,
      };
    }
  }

  return {
    isValid: true,
    bedContMins,
    wakeContMins,
    sleepDurationMins,
  };
};
