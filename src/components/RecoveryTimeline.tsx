import React, { useState, useRef } from 'react';
import { AppLanguage, UserProfile, DayRecoveryGoal } from '../types';
import { formatDisplayTime } from '../utils/timeFormat';
import { getDrinkIcon } from './CaffeineAdvisor';
import { Trash2, AlertCircle } from 'lucide-react';
import { isEventConflictingWithMainSleep } from '../utils/wakingPeriodValidation';
import {
  getTodayWakeInfo,
  getTomorrowWakeInfo,
  getTomorrowDate,
  formatDisplayDate,
  getLocalDateStr
} from '../utils/wakeTimeService';

interface RecoveryTimelineProps {
  isNight: boolean;
  language?: AppLanguage;
  userProfile?: UserProfile | null;
  bedtime?: string;
  wakeTime?: string;
  todayWakeTime?: string;
  tomorrowWakeTime?: string;
  currentTime?: Date;
  totalSleepHours?: string;
  currentGoal?: string;
  commitments?: { title: string; start: string; end: string }[];
  caffeineLog?: any[];
  napStart?: string;
  napDuration?: string;
  onUpdateRecoveryGoal?: (goal: DayRecoveryGoal) => void;
  onUpdateBedtime?: (b: string, w: string, h: string, ns?: string, nd?: string) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToPlanner?: () => void;
  onNavigateToCaffeine?: () => void;
  onUpdateCaffeineLog?: (items: any[]) => void;
  onUpdateCommitments?: (commitments: any[]) => void;
}

export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({
  isNight,
  language = 'en',
  userProfile,
  bedtime = '22:30',
  wakeTime,
  todayWakeTime: todayWakeTimeProp,
  tomorrowWakeTime: tomorrowWakeTimeProp,
  currentTime: currentTimeProp,
  commitments: commitmentsProp,
  caffeineLog = [],
  napStart: napStartProp,
  napDuration: napDurationProp,
  onUpdateRecoveryGoal,
  onUpdateBedtime,
  onNavigateToDashboard,
  onNavigateToPlanner,
  onNavigateToCaffeine,
  onUpdateCaffeineLog,
  onUpdateCommitments,
}) => {
  const isEn = language === 'en';
  const timelineRef = useRef<HTMLDivElement>(null);
  const [internalTime, setInternalTime] = useState<Date>(currentTimeProp || new Date());
  const [timelineKey, setTimelineKey] = useState(0);

  // Synchronize when external currentTime prop updates
  React.useEffect(() => {
    if (currentTimeProp) {
      setInternalTime(currentTimeProp);
    }
  }, [currentTimeProp]);

  // Live timer tick every 10 seconds for real-time synchronization
  React.useEffect(() => {
    const timer = setInterval(() => setInternalTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const now = currentTimeProp || internalTime;
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const parseMins = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    } catch {
      return 0;
    }
  };

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Planned nap retrieval
  let nap: { start: string; duration: number } | null = null;
  if (napDurationProp !== undefined) {
    const dur = parseInt(napDurationProp) || 0;
    if (dur > 0 && napStartProp) {
      nap = { start: napStartProp, duration: dur };
    }
  } else {
    try {
      const p = localStorage.getItem('owlup_planned_nap');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.duration > 0 && parsed.start) {
          nap = parsed;
        }
      }
    } catch {}
  }
  
  let commitments: {title: string, start: string, end: string}[] = commitmentsProp !== undefined
    ? commitmentsProp 
    : (() => {
        try {
          const c = localStorage.getItem('owlup_commitments');
          return c ? JSON.parse(c) : [];
        } catch {
          return [];
        }
      })();

  const napDuration = nap ? (nap.duration || 0) : 0;
  const hasValidNap = Boolean(nap && napDuration > 0 && nap.start);
  const effectiveNapStart = hasValidNap && nap ? nap.start : '12:30';
  const napStartMins = hasValidNap ? parseMins(effectiveNapStart) : 0;

  // ── WAKE-UP TIME & DATE RETRIEVAL ──────────────────────────────────────────
  // Today's Wake-Up: from onboarding ("What time did you wake up today?") for new users,
  // or yesterday's sleep schedule for existing users after rollover.
  const todayWakeInfo = getTodayWakeInfo(now, userProfile, isEn);
  const tomorrowWakeInfo = getTomorrowWakeInfo(now, isEn);

  const effectiveTodayWake = todayWakeTimeProp !== undefined ? todayWakeTimeProp : (todayWakeInfo.time || wakeTime || null);
  const effectiveTomorrowWake = tomorrowWakeTimeProp !== undefined ? tomorrowWakeTimeProp : tomorrowWakeInfo.time;
  
  const todayDisplayDate = todayWakeInfo.displayDate;
  const tomorrowDisplayDate = tomorrowWakeInfo.displayDate;

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowDate = getTomorrowDate(now);

  const createLocalDate = (baseDate: Date, timeStr: string, addDays: number = 0): Date => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + addDays,
      h || 0,
      m || 0,
      0,
      0
    );
  };

  // Bedtime calculation
  const effectiveBedtime = bedtime || localStorage.getItem('owlup_bedtime') || '22:30';
  const bedMins = parseMins(effectiveBedtime);
  const wakeMins = effectiveTodayWake ? parseMins(effectiveTodayWake) : 7 * 60;

  // If bedtime is <= today's wake time (e.g. 01:00 AM after 08:00 AM wake-up),
  // it is in the early morning of tomorrow's calendar day
  const isBedtimePastMidnight = bedMins <= wakeMins;
  const bedtimeDate = createLocalDate(todayDate, effectiveBedtime, isBedtimePastMidnight ? 1 : 0);
  const bedtimeDisplayDate = formatDisplayDate(bedtimeDate, isEn);

  // Tonight's wind-down: 30 minutes before tonight's bedtime
  const windDownDate = new Date(bedtimeDate.getTime() - 30 * 60 * 1000);
  const windDownTimeStr = `${windDownDate.getHours().toString().padStart(2, '0')}:${windDownDate.getMinutes().toString().padStart(2, '0')}`;
  const windDownDisplayDate = formatDisplayDate(windDownDate, isEn);

  // Caffeine curfew: 10 hours before tonight's bedtime
  const curfewDate = new Date(bedtimeDate.getTime() - 10 * 60 * 60 * 1000);
  const curfewTimeStr = `${curfewDate.getHours().toString().padStart(2, '0')}:${curfewDate.getMinutes().toString().padStart(2, '0')}`;
  const curfewDisplayDate = formatDisplayDate(curfewDate, isEn);

  // Status evaluator based on real timestamps
  const nowMs = now.getTime();
  const getEventStatus = (eventStart: Date, durationMins: number = 30): 'active' | 'past' | 'upcoming' => {
    const startMs = eventStart.getTime();
    const endMs = startMs + durationMins * 60 * 1000;
    if (nowMs >= startMs && nowMs <= endMs) return 'active';
    if (nowMs > endMs) return 'past';
    return 'upcoming';
  };

  const rawEvents: any[] = [];
  
  // 1. TODAY'S WAKE-UP (Cycle starting point)
  const todayWakeDate = createLocalDate(todayDate, effectiveTodayWake || '07:00');
  rawEvents.push({
    startDate: todayWakeDate,
    absTime: todayWakeDate.getTime(),
    time: effectiveTodayWake || '',
    displayDate: todayDisplayDate,
    tag: isEn ? "TODAY'S WAKE-UP" : 'THỨC DẬY HÔM NAY',
    tagColor: 'text-[#007b4d] dark:text-[#62D2FB] bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border-[#007b4d]/40 dark:border-[#62D2FB]/40',
    icon: '🌅',
    title: isEn ? "Today's Wake-Up" : 'Thức dậy hôm nay',
    desc: effectiveTodayWake
      ? (isEn 
          ? 'Circadian anchor for your active day. Get morning sunlight in your eyes to reset your body clock.' 
          : 'Mốc khởi động nhịp sinh học trong ngày. Tiếp xúc ánh sáng mặt trời để kích hoạt năng lượng và đồng hồ sinh học.')
      : (isEn 
          ? 'Today’s wake-up time is not recorded yet.' 
          : 'Chưa ghi nhận giờ thức dậy hôm nay.'),
    duration: 15,
    isEndpoint: 'start',
    isConfigured: Boolean(effectiveTodayWake),
  });

  // 2. Power Nap (only if valid)
  if (hasValidNap) {
    let napStartDate = createLocalDate(todayDate, effectiveNapStart);
    if (napStartDate.getTime() < todayWakeDate.getTime()) {
      napStartDate = createLocalDate(tomorrowDate, effectiveNapStart);
    }
    rawEvents.push({
      startDate: napStartDate,
      absTime: napStartDate.getTime(),
      time: effectiveNapStart,
      displayDate: formatDisplayDate(napStartDate, isEn),
      tag: isEn ? 'POWER NAP' : 'CHỢP MẮT',
      tagColor: 'text-[#4CB28E] dark:text-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 border-[#4CB28E]/20 dark:border-[#62D2FB]/20',
      icon: '🔋',
      title: isEn ? `Scheduled Power Nap: ${napDuration} min` : `Chợp mắt: ${napDuration} phút`,
      desc: isEn ? 'Rest quietly to recharge your afternoon battery.' : 'Nghỉ ngơi để sạc lại năng lượng cho buổi chiều.',
      duration: napDuration,
      isConfigured: true,
    });
  }
  
  // 3. Commitments
  commitments.forEach(c => {
    const cStartMins = parseMins(c.start);
    const cEndMins = parseMins(c.end);
    let commitmentStart = createLocalDate(todayDate, c.start);
    if (cStartMins < wakeMins - 4 * 60) {
      commitmentStart = createLocalDate(tomorrowDate, c.start);
    }
    
    const commTitle = (!isEn && (!c.title || c.title.toLowerCase() === 'busy block'))
      ? 'Lịch bận'
      : (isEn && c.title === 'Lịch bận' ? 'Busy Block' : (c.title || (isEn ? 'Busy Block' : 'Lịch bận')));
    
    const duration = cEndMins < cStartMins ? (cEndMins + 24 * 60 - cStartMins) : (cEndMins - cStartMins);

    rawEvents.push({
      startDate: commitmentStart,
      absTime: commitmentStart.getTime(),
      time: c.start,
      displayDate: formatDisplayDate(commitmentStart, isEn),
      tag: isEn ? 'COMMITMENT' : 'LỊCH BẬN',
      tagColor: 'text-slate-500 bg-slate-100 border-slate-200',
      icon: '📅',
      title: commTitle,
      desc: isEn ? `Scheduled block until ${formatDisplayTime(c.end, isEn)}.` : `Lịch bận dự kiến đến ${formatDisplayTime(c.end, isEn)}.`,
      duration,
      isConfigured: true,
    });
  });

  // 4. Caffeine Curfew
  rawEvents.push({
    startDate: curfewDate,
    absTime: curfewDate.getTime(),
    time: curfewTimeStr,
    displayDate: curfewDisplayDate,
    tag: isEn ? 'CAFFEINE CURFEW' : 'NGỪNG CAFFEINE',
    tagColor: 'text-[#7F1D1D] dark:text-[#FCA5A5] bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border-[#991B1B]/70 dark:border-[#B91C1C]',
    icon: '🚫',
    title: isEn ? 'Caffeine Curfew' : 'Ngừng caffeine',
    desc: isEn ? 'Stop all caffeine to ensure it clears from your system before bed.' : 'Ngừng mọi loại thức uống có caffeine để cơ thể đào thải hết trước khi ngủ.',
    duration: 30,
    isConfigured: true,
  });

  // 5. Logged Caffeine Drinks
  const activeDrinks: any[] = caffeineLog !== undefined ? caffeineLog : (() => {
    try {
      const rawCaffeine = localStorage.getItem('owlup_caffeine_log');
      if (rawCaffeine) {
        const items = JSON.parse(rawCaffeine);
        if (Array.isArray(items)) {
          return items.map((it: any) => ({
            ...it,
            timestamp: new Date(it.timestamp)
          }));
        }
      }
    } catch {}
    return [];
  })();

  activeDrinks.forEach((it: any) => {
    if (it.timestamp) {
      const d = it.timestamp instanceof Date ? it.timestamp : new Date(it.timestamp);
      if (!isNaN(d.getTime())) {
        const drinkTimeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        let drinkDate = d;
        const dDateStr = getLocalDateStr(d);
        const todayStr = getLocalDateStr(now);
        const tomorrowStr = getLocalDateStr(tomorrowDate);
        if (dDateStr !== todayStr && dDateStr !== tomorrowStr) {
          drinkDate = createLocalDate(todayDate, drinkTimeStr);
        }
        rawEvents.push({
          startDate: drinkDate,
          absTime: drinkDate.getTime(),
          time: drinkTimeStr,
          displayDate: formatDisplayDate(drinkDate, isEn),
          tag: isEn ? 'CAFFEINE' : 'CAFFEINE ĐÃ NẠP',
          tagColor: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
          icon: it.icon || getDrinkIcon(it.name) || '☕',
          title: `${it.name || (isEn ? 'Caffeine intake' : 'Nạp caffeine')} (${it.caffeineMg || 0}mg)`,
          desc: isEn ? `Logged intake of ${it.caffeineMg || 0}mg caffeine.` : `Đã nạp ${it.caffeineMg || 0}mg caffeine vào thời điểm này.`,
          duration: 30,
          drinkId: it.id,
          isConfigured: true,
        });
      }
    }
  });

  // 6. Wind Down
  rawEvents.push({
    startDate: windDownDate,
    absTime: windDownDate.getTime(),
    time: windDownTimeStr,
    displayDate: windDownDisplayDate,
    tag: isEn ? 'WIND DOWN' : 'THƯ GIÃN',
    tagColor: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20',
    icon: '🌙',
    title: isEn ? "Wind Down" : 'Chuẩn bị ngủ',
    desc: isEn ? 'Dim lights, avoid screens, and relax your nervous system.' : 'Tắt bớt đèn, rời xa màn hình và thư giãn để cơ thể tiết melatonin tự nhiên.',
    duration: 30,
    isConfigured: true,
  });

  // 7. Night Sleep (Bedtime Tonight)
  rawEvents.push({
    startDate: bedtimeDate,
    absTime: bedtimeDate.getTime(),
    time: effectiveBedtime,
    displayDate: bedtimeDisplayDate,
    tag: isEn ? 'MAIN SLEEP' : 'ĐI NGỦ',
    tagColor: 'text-[#4CB28E] dark:text-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 border-[#4CB28E]/20 dark:border-[#62D2FB]/20',
    icon: '🛌',
    title: isEn ? "Bedtime Tonight" : 'Giờ đi ngủ',
    desc: isEn ? 'Fall asleep according to your recommended recovery routine.' : 'Đi ngủ đúng lịch phục hồi đề xuất để tối ưu các chu kỳ ngủ sâu và giấc ngủ REM.',
    duration: 60,
    isConfigured: true,
  });

  // 8. TOMORROW'S WAKE-UP (Cycle Endpoint)
  // Always associated with the next calendar date, chronologically after tonight's bedtime
  let tomorrowWakeDate = createLocalDate(tomorrowDate, effectiveTomorrowWake || '07:00');
  while (tomorrowWakeDate.getTime() <= bedtimeDate.getTime()) {
    tomorrowWakeDate = new Date(tomorrowWakeDate.getTime() + 24 * 60 * 60 * 1000);
  }
  const tomorrowWakeDisplayDate = formatDisplayDate(tomorrowWakeDate, isEn);

  rawEvents.push({
    startDate: tomorrowWakeDate,
    absTime: tomorrowWakeDate.getTime(),
    time: effectiveTomorrowWake || '',
    displayDate: tomorrowWakeDisplayDate,
    tag: effectiveTomorrowWake
      ? (isEn ? "TOMORROW'S WAKE-UP" : 'THỨC DẬY SÁNG MAI')
      : (isEn ? "TOMORROW'S WAKE-UP (PENDING)" : 'THỨC DẬY SÁNG MAI (CHƯA THIẾT LẬP)'),
    tagColor: effectiveTomorrowWake
      ? 'text-[#007b4d] dark:text-[#62D2FB] bg-[#E6F8F0] dark:bg-[#62D2FB]/15 border-[#007b4d] dark:border-[#62D2FB]'
      : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700',
    icon: '🏁',
    title: effectiveTomorrowWake 
      ? (isEn ? "Tomorrow's Wake-Up Target" : 'Mục tiêu thức dậy sáng mai')
      : (isEn ? "Tomorrow's Wake-Up (Not configured)" : 'Thức dậy sáng mai (Chưa thiết lập)'),
    desc: effectiveTomorrowWake
      ? (isEn 
          ? `Planned wake-up at ${formatDisplayTime(effectiveTomorrowWake, isEn)} on ${tomorrowWakeDisplayDate} to complete your 24-hour circadian recovery cycle.` 
          : `Kế hoạch thức dậy lúc ${formatDisplayTime(effectiveTomorrowWake, isEn)} ngày ${tomorrowWakeDisplayDate} để hoàn thành trọn vẹn chu kỳ phục hồi 24 giờ.`)
      : (isEn
          ? `Tomorrow's wake-up target has not been set yet. Configure your sleep schedule to complete your 24-hour recovery plan.`
          : `Bạn chưa thiết lập giờ thức dậy cho ngày mai. Hãy cài đặt lịch ngủ để hoàn tất lộ trình phục hồi 24 giờ.`),
    duration: 15,
    isEndpoint: 'end',
    isConfigured: Boolean(effectiveTomorrowWake),
  });

  // Filter events against the uninterrupted Main Sleep interval [bedtimeDate, tomorrowWakeDate]
  const conflictingSleepEvents: typeof rawEvents = [];
  const validRawEvents: typeof rawEvents = [];

  rawEvents.forEach((evt) => {
    // Bedtime tonight and tomorrow wake-up target define the sleep boundaries
    if (evt.startDate.getTime() === bedtimeDate.getTime() && (evt.tag === 'MAIN SLEEP' || evt.tag === 'ĐI NGỦ')) {
      validRawEvents.push(evt);
      return;
    }
    if (evt.isEndpoint === 'end' || evt.isEndpoint === 'start') {
      validRawEvents.push(evt);
      return;
    }

    const eventStart = evt.startDate;
    const eventEnd = evt.duration ? new Date(evt.startDate.getTime() + evt.duration * 60 * 1000) : null;

    const conflicts = isEventConflictingWithMainSleep({
      eventStart,
      eventEnd,
      sleepStart: bedtimeDate,
      sleepEnd: tomorrowWakeDate,
    });

    if (conflicts) {
      conflictingSleepEvents.push(evt);
    } else {
      validRawEvents.push(evt);
    }
  });

  const timelineEvents = validRawEvents
    .sort((a, b) => {
      const diff = a.startDate.getTime() - b.startDate.getTime();
      if (diff !== 0) return diff;
      if (a.isEndpoint === 'start') return -1;
      if (b.isEndpoint === 'start') return 1;
      if (a.isEndpoint === 'end') return 1;
      if (b.isEndpoint === 'end') return -1;
      return 0;
    })
    .map(evt => ({ ...evt, status: getEventStatus(evt.startDate, evt.duration) }));

  // Find happening now or up next
  let activeEventIndex = timelineEvents.findIndex(e => e.status === 'active');
  let isStrictlyActive = true;
  
  if (activeEventIndex === -1) {
    activeEventIndex = timelineEvents.findIndex(e => e.status === 'upcoming');
    isStrictlyActive = false;
  }
  
  if (activeEventIndex === -1 && timelineEvents.length > 0) {
    activeEventIndex = timelineEvents.length - 1;
    isStrictlyActive = false;
  }
  
  let activeEvent = null;
  if (activeEventIndex !== -1) {
     activeEvent = timelineEvents[activeEventIndex];
  }

  const hasSchedule = (() => {
    try {
      const todayStr = getLocalDateStr(now);
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      return applied === 'true' && scheduleDate === todayStr;
    } catch {}
    return false;
  })();

  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-8 sm:mb-12">
        {isEn ? "Personalized Recovery Timeline" : "Lộ trình phục hồi cá nhân hoá"}
      </h2>

      {/* SCHEDULE NOT CONFIGURED FOR TODAY REMINDER */}
      {!hasSchedule && (
        <div className="w-full rounded-[24px] bg-[#E6F8F0]/90 dark:bg-[#62D2FB]/10 border border-[#4CB28E]/40 dark:border-[#62D2FB]/30 p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#233355] text-[#007b4d] dark:text-[#62D2FB] flex items-center justify-center text-xl shrink-0 shadow-sm">
              🧭
            </div>
            <div>
              <h4 className="font-heading font-bold text-base sm:text-lg text-[#1F2937] dark:text-white mb-0.5">
                {isEn ? "Set up your Sleep Schedule for today" : "Thiết lập Lịch ngủ cho hôm nay"}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {isEn 
                  ? "Configure tonight's bedtime and tomorrow's wake-up target to finalize your 24-hour recovery plan." 
                  : "Cài đặt giờ ngủ tối nay và mục tiêu thức dậy sáng mai để hoàn tất lộ trình phục hồi 24 giờ."}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPlanner}
            className="px-6 py-3 bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#0E172A] rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:-translate-y-0.5 whitespace-nowrap self-end sm:self-center"
          >
            <span>{isEn ? "Set up sleep schedule" : "Thiết lập lịch ngủ ngay"}</span>
            <span className="font-normal">&rarr;</span>
          </button>
        </div>
      )}
      
      {/* HAPPENING NOW BANNER */}
      {activeEvent && (
      <div className="w-full rounded-[20px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#233355] p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm relative overflow-hidden animate-fade-in">
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#4CB28E] dark:bg-[#62D2FB]" />
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-[#4CB28E] dark:text-[#62D2FB] text-xs sm:text-sm font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] animate-pulse" /> {isStrictlyActive ? (isEn ? 'HAPPENING NOW' : 'ĐANG DIỄN RA') : (isEn ? 'UP NEXT' : 'SẮP DIỄN RA')}
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-1">{activeEvent.title}</h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{activeEvent.desc}</p>
        </div>
        <div className="text-right shrink-0 self-end sm:self-center">
          {activeEvent.displayDate && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {activeEvent.displayDate}
            </div>
          )}
          <div className="text-[#4CB28E] dark:text-[#62D2FB] font-heading font-bold text-lg sm:text-xl md:text-2xl whitespace-nowrap tabular-nums">
            {activeEvent.time ? formatDisplayTime(activeEvent.time, isEn) : (isEn ? 'Not set' : 'Chưa đặt')}
          </div>
        </div>
      </div>
      )}

      {/* COMMITMENTS RESET NOTICE BANNER */}
      {commitments.length === 0 && (
        <div className="w-full rounded-[24px] bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-sm">
              📅
            </div>
            <div>
              <h4 className="font-heading font-bold text-base sm:text-lg text-amber-950 dark:text-amber-100 mb-0.5">
                {isEn ? "Busy times reset for the new day" : "Thời gian bận đã được làm mới cho ngày hôm nay"}
              </h4>
              <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed font-sans">
                {isEn 
                  ? "Please enter your commitments for today (classes, shifts, meetings) so OwlUp can optimize your restorative schedule." 
                  : "Vui lòng nhập lịch bận mới hôm nay (lớp học, ca làm, họp) để OwlUp hoàn thiện và tối ưu lộ trình phục hồi."}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPlanner}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:-translate-y-0.5 whitespace-nowrap self-end sm:self-center"
          >
            <span>{isEn ? "Enter busy times" : "Nhập lịch bận mới"}</span>
            <span className="font-normal">&rarr;</span>
          </button>
        </div>
      )}

      {/* MAIN SLEEP CONFLICT WARNING BANNER */}
      {conflictingSleepEvents.length > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 flex items-start gap-3.5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-heading font-bold text-sm sm:text-base text-amber-900 dark:text-amber-100 mb-1">
              {isEn ? "Main Sleep Exclusivity Enforced" : "Bảo vệ Giấc ngủ Đêm Trọn vẹn"}
            </h4>
            <p className="leading-relaxed">
              {isEn
                ? `${conflictingSleepEvents.length} scheduled item(s) (${conflictingSleepEvents.map(e => e.title).join(', ')}) fall inside your uninterrupted sleep period (${formatDisplayTime(effectiveBedtime, isEn)} – ${formatDisplayTime(effectiveTomorrowWake, isEn)}). Activities inside Main Sleep are excluded from the recovery timeline to preserve continuous biological rest.`
                : `${conflictingSleepEvents.length} hoạt động (${conflictingSleepEvents.map(e => e.title).join(', ')}) trùng với khung giờ ngủ liên tục (${formatDisplayTime(effectiveBedtime, isEn)} – ${formatDisplayTime(effectiveTomorrowWake, isEn)}). Các hoạt động này đã được loại bỏ khỏi dòng thời gian phục hồi để đảm bảo giấc ngủ không bị ngắt quãng.`}
            </p>
          </div>
        </div>
      )}

      {/* DETAILED TIMELINE HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 sm:mb-8 border-b border-slate-200 dark:border-slate-700 pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#1F2937] dark:text-white">
            {isEn ? "Detailed Timeline" : "Chi tiết Lộ trình"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEn 
              ? `Continuous 24h cycle: ${todayDisplayDate} → ${tomorrowDisplayDate}` 
              : `Chu kỳ phục hồi 24h: ${todayDisplayDate} → ${tomorrowDisplayDate}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"/> {isEn ? 'Past' : 'Đã qua'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] animate-pulse"/> {isEn ? 'Active' : 'Đang diễn ra'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300"/> {isEn ? 'Upcoming' : 'Sắp tới'}</span>
        </div>
      </div>

      {/* TIMELINE LIST */}
      <div key={timelineKey} ref={timelineRef} className="relative border-l ml-4 space-y-8 mb-12 py-3 border-slate-200 dark:border-slate-700">
        {timelineEvents.map((evt, idx) => (
          <div key={idx} className="relative pl-7 sm:pl-8">
            <div className={`absolute -left-2.5 top-0 w-5 h-5 rounded-full border-2 bg-white dark:bg-[#233355] flex items-center justify-center ${
              evt.isEndpoint === 'end' ? 'border-[#007b4d] dark:border-[#62D2FB] w-6 h-6 -left-3' :
              evt.status === 'active' ? 'border-[#4CB28E] dark:border-[#62D2FB] w-6 h-6 -left-3' : 
              evt.status === 'past' ? 'border-slate-200 bg-slate-100' : 'border-slate-300 dark:border-slate-600'}`}>
              {evt.isEndpoint === 'end' ? (
                <span className="text-[#007b4d] dark:text-[#62D2FB] text-[10px] font-bold">🏁</span>
              ) : evt.status === 'past' ? (
                <span className="text-slate-400 text-[10px] font-bold">✓</span>
              ) : evt.status === 'active' ? (
                <div className="w-3 h-3 bg-[#4CB28E] dark:bg-[#62D2FB] rounded-full animate-pulse" />
              ) : null}
            </div>
            
            {evt.isEndpoint === 'end' ? (
              // Distinctive Endpoint Card for Tomorrow's Wake-Up
              <div className={`w-full rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300 shadow-md ${
                evt.isConfigured
                  ? (evt.status === 'active'
                      ? 'border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355] shadow-lg ring-2 ring-[#4CB28E]/30'
                      : 'border-[#4CB28E] dark:border-[#62D2FB] bg-gradient-to-br from-[#E6F8F0]/70 via-white to-emerald-50/30 dark:from-[#233355] dark:via-[#1E293B] dark:to-[#0F172A]')
                  : 'border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/20'
              }`}>
                <div className="flex justify-between items-start mb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 uppercase ${evt.tagColor}`}>
                      {evt.icon} {evt.tag}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#007b4d]/15 dark:bg-[#62D2FB]/20 text-[#007b4d] dark:text-[#62D2FB] border border-[#007b4d]/30 dark:border-[#62D2FB]/40">
                      {isEn ? 'CYCLE ENDPOINT' : 'ĐÍCH ĐẾN CHU KỲ'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                      {evt.displayDate}
                    </div>
                    <div className={`text-base sm:text-lg font-heading font-bold whitespace-nowrap tabular-nums ${
                      evt.isConfigured ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {evt.time ? formatDisplayTime(evt.time, isEn) : (isEn ? 'Not configured' : 'Chưa thiết lập')}
                    </div>
                  </div>
                </div>

                <h4 className="text-base sm:text-lg font-heading font-bold mb-1.5 text-[#1F2937] dark:text-white">
                  {evt.title}
                </h4>
                <p className="text-sm sm:text-base leading-relaxed font-sans text-slate-600 dark:text-slate-300">
                  {evt.desc}
                </p>

                {!evt.isConfigured && onNavigateToPlanner && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      {isEn
                        ? "Configure tomorrow's wake-up in Sleep Schedule to complete your 24-hour cycle"
                        : "Thiết lập giờ thức dậy ngày mai trong Lịch ngủ để hoàn tất lộ trình 24 giờ"}
                    </span>
                    <button
                      onClick={onNavigateToPlanner}
                      className="px-4 py-1.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#0E172A] text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap self-end sm:self-center hover:-translate-y-0.5"
                    >
                      {isEn ? "Set up sleep schedule →" : "Cài đặt lịch ngủ ngay →"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Standard Activity Card
              <div className={`w-full rounded-2xl border p-5 sm:p-5.5 transition-all duration-300 ${
                evt.status === 'active' ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355] shadow-[0_0_20px_rgba(76,178,141,0.2)] dark:shadow-[0_0_20px_rgba(98,210,251,0.2)] transform scale-[1.01]' : 
                evt.status === 'past' ? 'border-transparent bg-[#F8FAFC] dark:bg-[#0F172A] opacity-50 grayscale' : 
                'border-slate-200 dark:border-slate-700 bg-[#FFFFFF] dark:bg-[#233355] hover:-translate-y-1 hover:shadow-md'
              }`}>
                <div className="flex justify-between items-start mb-2.5">
                  <div className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 uppercase ${evt.tagColor}`}>
                    {evt.icon} {evt.tag}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {evt.displayDate && (
                        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                          {evt.displayDate}
                        </div>
                      )}
                      <div className={`text-sm sm:text-base font-heading font-bold whitespace-nowrap shrink-0 tabular-nums ${
                        evt.status === 'active' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 
                        evt.status === 'past' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                      }`}>
                        {evt.time ? formatDisplayTime(evt.time, isEn) : (isEn ? 'Not recorded' : 'Chưa ghi nhận')}
                      </div>
                    </div>
                    {evt.drinkId && onUpdateCaffeineLog && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = activeDrinks.filter((it: any) => it.id !== evt.drinkId);
                          onUpdateCaffeineLog(updated);
                          try { localStorage.setItem('owlup_caffeine_log', JSON.stringify(updated)); } catch {}
                        }}
                        title={isEn ? "Remove this drink" : "Xóa đồ uống này"}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className={`text-base sm:text-lg font-heading font-bold mb-1.5 ${
                  evt.status === 'active' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 
                  evt.status === 'past' ? 'text-slate-500 dark:text-slate-400' : 'text-[#1F2937] dark:text-white'
                }`}>{evt.title}</h4>
                <p className={`text-sm sm:text-base leading-relaxed font-sans ${
                  evt.status === 'active' ? 'text-[#134E48] dark:text-[#E0F2FE]' : 
                  evt.status === 'past' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'
                }`}>{evt.desc}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default RecoveryTimeline;
