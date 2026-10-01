import React, { useState, useRef } from 'react';
import { AppLanguage, UserProfile, DayRecoveryGoal } from '../types';
import { formatDisplayTime } from '../utils/timeFormat';
import { TimePickerInput } from './TimePickerInput';
import { getDrinkIcon } from './CaffeineAdvisor';

interface RecoveryTimelineProps {
  isNight: boolean;
  language?: AppLanguage;
  userProfile?: UserProfile | null;
  bedtime?: string;
  wakeTime?: string;
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
}

export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({
  isNight,
  language = 'en',
  userProfile,
  bedtime = '22:30',
  wakeTime = '06:30',
  commitments: commitmentsProp,
  caffeineLog = [],
  napStart: napStartProp,
  napDuration: napDurationProp,
  onUpdateRecoveryGoal,
  onUpdateBedtime,
  onNavigateToDashboard,
  onNavigateToPlanner,
  onNavigateToCaffeine,
}) => {
  const isEn = language === 'en';
  const [showGoal, setShowGoal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<string>('healthy_balanced');
  const [isPing, setIsPing] = useState(false);
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualBedtime, setManualBedtime] = useState(bedtime || '22:30');
  const [manualWakeTime, setManualWakeTime] = useState(wakeTime || '06:30');
  const [manualNapStart, setManualNapStart] = useState(() => {
    if (napStartProp) return napStartProp;
    try {
      const p = localStorage.getItem('owlup_planned_nap');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.start) return parsed.start;
      }
    } catch {}
    return '12:30';
  });
  const [manualNapDuration, setManualNapDuration] = useState(() => {
    if (napDurationProp) return napDurationProp;
    try {
      const p = localStorage.getItem('owlup_planned_nap');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.duration) return parsed.duration.toString();
      }
    } catch {}
    return '20';
  });

  React.useEffect(() => {
    if (bedtime) setManualBedtime(bedtime);
    if (wakeTime) setManualWakeTime(wakeTime);
    if (napStartProp) setManualNapStart(napStartProp);
    if (napDurationProp) setManualNapDuration(napDurationProp);
  }, [bedtime, wakeTime, napStartProp, napDurationProp]);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleSaveAndPreview = () => {
    setShowGoal(false);
    // Scroll smoothly to timeline
    if (timelineRef.current) {
      timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Trigger ping effect
    setIsPing(true);
    setTimeout(() => setIsPing(false), 2000);
  };



  const [currentTime, setCurrentTime] = useState(new Date());
  const [timelineKey, setTimelineKey] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  const parseMins = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  let nap = { start: '12:30', duration: 20 };
  if (napStartProp && napDurationProp) {
    nap = { start: napStartProp, duration: parseInt(napDurationProp) || 20 };
  } else {
    try {
      const p = localStorage.getItem('owlup_planned_nap');
      if (p) nap = JSON.parse(p);
    } catch {}
  }
  
  let commitments: {title: string, start: string, end: string}[] = commitmentsProp && commitmentsProp.length > 0
    ? commitmentsProp 
    : (() => {
        try {
          const c = localStorage.getItem('owlup_commitments');
          return c ? JSON.parse(c) : [];
        } catch {
          return [];
        }
      })();

  // Check if nap collides with any daytime commitments (e.g. afternoon class 12:45 - 15:00)
  let napStartMins = parseMins(nap.start);
  const napDuration = nap.duration || 20;
  if (commitments.length > 0) {
    const sortedComms = [...commitments]
      .map(c => ({ ...c, s: parseMins(c.start), e: parseMins(c.end) }))
      .sort((a, b) => a.s - b.s);
    for (const c of sortedComms) {
      const napEndMins = napStartMins + napDuration;
      // If nap overlaps with a commitment, move nap to 15 mins after commitment ends
      if (napStartMins < c.e && napEndMins > c.s) {
        napStartMins = c.e + 15;
      }
    }
    // Safety guard: power nap should stay in afternoon window
    if (napStartMins > 16 * 60 + 30 || napStartMins < 11 * 60) {
      napStartMins = 12 * 60 + 30;
    }
  }
  const effectiveNapStart = formatMins(napStartMins);

  // ABSOLUTE TIMELINE LOGIC
  // The timeline covers the 24-hour waking day from Today's Wake Time to Tonight's Bedtime
  const effectiveBedtime = bedtime || localStorage.getItem('owlup_bedtime') || '22:30';
  
  // Calculate effectiveWakeTime: prioritize confirmed schedule from RecoveryPlanner
  const effectiveWakeTime = wakeTime || (() => {
    try {
      const stored = localStorage.getItem('owlup_waketime');
      if (stored === '06:00') return '06:30';
      if (stored) return stored;
    } catch {}
    return '06:30';
  })();

  const bedMins = parseMins(effectiveBedtime);
  const wakeMins = parseMins(effectiveWakeTime);
  
  // WAKING DAY TIME LOGIC
  // The timeline spans from wakeMins (TODAY) to tonightBedMins (TONIGHT)
  const absWakeMins = wakeMins;
  
  let tonightBedMins = bedMins;
  if (tonightBedMins <= absWakeMins) {
      tonightBedMins += 24 * 60;
  }
  
  // Where does current time fit?
  let absCurrentMins = currentMins;
  // If current time is strictly before wake time minus a 3-hour buffer,
  // we consider it to be the late night of the current waking cycle (so +24h).
  if (absCurrentMins < wakeMins - 3 * 60) {
      absCurrentMins += 24 * 60;
  }
  
  // Tonight's wind-down: 30 minutes before tonight's bedtime
  const absTonightWindDown = tonightBedMins - 30;

  const getStatus = (absEvtMins: number, duration: number = 30) => {
      if (absCurrentMins >= absEvtMins && absCurrentMins <= absEvtMins + duration) return 'active';
      if (absCurrentMins > absEvtMins + duration) return 'past';
      return 'upcoming';
  };

  const rawEvents: any[] = [];
  
  // 1. Wake Up Today
  // (We skip Tomorrow's wake up, because we are mapping TODAY's Waking Day)
  rawEvents.push({
      absTime: absWakeMins,
      time: effectiveWakeTime,
      tag: isEn ? 'MORNING' : 'BUỔI SÁNG',
      tagColor: 'text-[#62D2FB] bg-[#62D2FB]/10 border-[#62D2FB]/20',
      icon: '💡',
      title: isEn ? 'Wake Up & Sunlight' : 'Thức dậy & Tắm nắng',
      desc: isEn ? 'Get natural light in your eyes to reset your body clock.' : 'Tiếp xúc ánh sáng mặt trời để khởi động đồng hồ sinh học.',
      duration: 15
  });

  // 2. Power Nap
  let absNapStart = napStartMins;
  while (absNapStart <= absWakeMins) absNapStart += 24 * 60;
  rawEvents.push({
      absTime: absNapStart,
      time: effectiveNapStart,
      tag: isEn ? 'POWER NAP' : 'CHỢP MẮT',
      tagColor: 'text-[#4CB28E] dark:text-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 border-[#4CB28E]/20 dark:border-[#62D2FB]/20',
      icon: '🔋',
      title: isEn ? `Scheduled Power Nap: ${napDuration} min` : `Chợp mắt: ${napDuration} phút`,
      desc: isEn ? 'Rest quietly to recharge your afternoon battery.' : 'Nghỉ ngơi để sạc lại năng lượng cho buổi chiều.',
      duration: napDuration
  });
  
  // 3. Commitments
  commitments.forEach(c => {
      let absCStart = parseMins(c.start);
      while (absCStart <= absWakeMins - 4*60) absCStart += 24 * 60; // place them mostly during the day
      
      rawEvents.push({
          absTime: absCStart,
          time: c.start,
          tag: isEn ? 'COMMITMENT' : 'LỊCH BẬN',
          tagColor: 'text-slate-500 bg-slate-100 border-slate-200',
          icon: '📅',
          title: c.title,
          desc: isEn ? `Scheduled block until ${formatDisplayTime(c.end, isEn)}.` : `Lịch bận dự kiến đến ${formatDisplayTime(c.end, isEn)}.`,
          duration: parseMins(c.end) < parseMins(c.start) ? parseMins(c.end) + 24*60 - parseMins(c.start) : parseMins(c.end) - parseMins(c.start)
      });
  });

  // 4. Caffeine Curfew
  let absCurfew = tonightBedMins - 10 * 60;
  rawEvents.push({
      absTime: absCurfew,
      time: formatMins(absCurfew),
      tag: isEn ? 'CAFFEINE CURFEW' : 'NGỪNG CAFFEINE',
      tagColor: 'text-red-500 bg-red-50 border-red-200',
      icon: '🚫',
      title: isEn ? 'Caffeine Curfew' : 'Ngừng caffeine',
      desc: isEn ? 'Stop all caffeine to ensure it clears from your system before bed.' : 'Ngừng mọi loại thức uống có caffeine để cơ thể đào thải hết trước khi ngủ.',
      duration: 30
  });

  // 5. Logged Caffeine Drinks (CHỈ hiển thị khi user đã bấm "Ghi nhận đồ uống" trong tab Caffeine)
  const activeDrinks: any[] = (caffeineLog && caffeineLog.length > 0) ? caffeineLog : (() => {
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
        const itemMins = d.getHours() * 60 + d.getMinutes();
        let absItemTime = itemMins;
        while (absItemTime < absWakeMins - 3 * 60) absItemTime += 24 * 60;
        rawEvents.push({
          absTime: absItemTime,
          time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          tag: isEn ? 'CAFFEINE' : 'CAFFEINE ĐÃ NẠP',
          tagColor: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
          icon: it.icon || getDrinkIcon(it.name) || '☕',
          title: `${it.name || (isEn ? 'Caffeine intake' : 'Nạp caffeine')} (${it.caffeineMg || 0}mg)`,
          desc: isEn ? `Logged intake of ${it.caffeineMg || 0}mg caffeine.` : `Đã nạp ${it.caffeineMg || 0}mg caffeine vào thời điểm này.`,
          duration: 30
        });
      }
    }
  });

  // 6. Wind Down (Chuẩn bị ngủ)
  rawEvents.push({
      absTime: absTonightWindDown,
      time: formatMins(absTonightWindDown),
      tag: isEn ? 'WIND DOWN' : 'THƯ GIÃN',
      tagColor: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20',
      icon: '🌙',
      title: isEn ? "Wind Down" : 'Chuẩn bị ngủ',
      desc: isEn ? 'Dim lights, avoid screens, and relax your nervous system.' : 'Tắt bớt đèn, rời xa màn hình và thư giãn để cơ thể tiết melatonin tự nhiên.',
      duration: 30
  });

  // 7. Night Sleep (Giấc ngủ đêm)
  rawEvents.push({
      absTime: tonightBedMins,
      time: formatMins(tonightBedMins),
      tag: isEn ? 'MAIN SLEEP' : 'ĐI NGỦ',
      tagColor: 'text-[#4CB28E] dark:text-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 border-[#4CB28E]/20 dark:border-[#62D2FB]/20',
      icon: '🛌',
      title: isEn ? "Night Sleep" : 'Giấc ngủ đêm',
      desc: isEn ? 'Fall asleep according to your recommended recovery routine.' : 'Đi ngủ đúng lịch phục hồi đề xuất để tối ưu các chu kỳ ngủ sâu và giấc ngủ REM.',
      duration: 60
  });

  const timelineEvents = rawEvents
    .sort((a, b) => a.absTime - b.absTime)
    .map(evt => ({ ...evt, status: getStatus(evt.absTime, evt.duration) }));

  // Find happening now
    let activeEventIndex = timelineEvents.findIndex(e => e.status === 'active');
  let isStrictlyActive = true;
  
  if (activeEventIndex === -1) {
    // Find the next upcoming event
    activeEventIndex = timelineEvents.findIndex(e => e.status === 'upcoming');
    isStrictlyActive = false;
  }
  
  if (activeEventIndex === -1 && timelineEvents.length > 0) {
    // If everything is past, find the LAST event (closest to now).
    // Wait, the closest event to now is the one with the highest absTime that is still <= absCurrentMins.
    activeEventIndex = timelineEvents.length - 1;
    isStrictlyActive = false;
  }
  
  let activeEvent = null;
  if (activeEventIndex !== -1) {
     activeEvent = timelineEvents[activeEventIndex];
     // Force the chosen fallback event to visually render as 'active' so it pops in the timeline list
     timelineEvents[activeEventIndex].status = 'active';
  }



  const hasSchedule = (() => {
    try {
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      return applied === 'true' && scheduleDate === todayStr;
    } catch {}
    return false;
  })();

  if (!hasSchedule) {
    return (
      <div className="w-full max-w-[1100px] w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-8 sm:mt-12">
        <h2 className="text-4xl sm:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-12">
          {isEn ? "Personalized Recovery Timeline" : "Lộ trình phục hồi cá nhân hoá"}
        </h2>

        <div className="flex flex-col items-center text-center py-16 px-6 rounded-[28px] bg-white dark:bg-[#233355] border border-dashed border-[#4CB28E]/40 dark:border-[#62D2FB]/30 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center mb-4">
            <span className="text-3xl">🧭</span>
          </div>
          <h3 className="font-heading font-bold text-2xl text-[#1F2937] dark:text-white mb-3">
            {isEn ? "No Timeline Generated Yet" : "Chưa có lộ trình cho hôm nay"}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 max-w-lg text-base font-sans mb-8 leading-relaxed">
            {isEn
              ? "Your 24-hour recovery timeline is constructed dynamically based on your busy commitments, target bedtime, and caffeine intake habits. Set up your sleep schedule to view your customized timeline."
              : "Lộ trình phục hồi 24 giờ sẽ được tự động xây dựng dựa trên các khung giờ bận, giờ đi ngủ mong muốn và thói quen nạp caffeine của bạn. Hãy thiết lập lịch ngủ để xem lộ trình chi tiết."}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onNavigateToPlanner}
              className="px-8 py-3.5 bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full text-base font-sans font-bold flex items-center gap-2 transition-all shadow-md shadow-[#4CB28E]/25 dark:shadow-[#62D2FB]/25 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{isEn ? "Set up sleep schedule" : "Thiết lập lịch ngủ ngay"}</span>
              <span className="font-normal">&rarr;</span>
            </button>
            {onNavigateToCaffeine && (
              <button
                onClick={onNavigateToCaffeine}
                className="px-6 py-3.5 border border-slate-200 dark:border-slate-600 hover:border-[#4CB28E] dark:hover:border-[#62D2FB] text-slate-700 dark:text-slate-200 rounded-full text-base font-sans font-medium transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{isEn ? "Log Caffeine" : "Ghi nhận Caffeine"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-8 sm:mb-12">
        {isEn ? "Personalized Recovery Timeline" : "Lộ trình phục hồi cá nhân hoá"}
      </h2>
      
      {/* HAPPENING NOW BANNER */}
      {activeEvent && (
      <div className="w-full rounded-[20px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#233355] p-5 sm:p-7 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm relative overflow-hidden animate-fade-in">
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#4CB28E] dark:bg-[#62D2FB]" />
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2 text-[#4CB28E] dark:text-[#62D2FB] text-xs sm:text-sm font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] animate-pulse" /> {isStrictlyActive ? (isEn ? 'HAPPENING NOW' : 'ĐANG DIỄN RA') : (isEn ? 'UP NEXT' : 'SẮP DIỄN RA')}
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-1.5 sm:mb-2">{activeEvent.title}</h3>
          <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{activeEvent.desc}</p>
        </div>
        <div className="text-[#4CB28E] dark:text-[#62D2FB] font-heading font-bold text-xl sm:text-2xl md:text-3xl shrink-0 self-end sm:self-center whitespace-nowrap">{formatDisplayTime(activeEvent.time, isEn)}</div>
      </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-6 sm:mb-8 border-b border-slate-200 dark:border-slate-700 pb-3 sm:pb-4">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#1F2937] dark:text-white">{isEn ? "Detailed Timeline" : "Chi tiết Lộ trình"}</h2>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"/> {isEn ? 'Past' : 'Đã qua'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] animate-pulse"/> {isEn ? 'Active' : 'Đang diễn ra'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300"/> {isEn ? 'Upcoming' : 'Sắp tới'}</span>
        </div>
      </div>

      {/* TIMELINE LIST */}
      <div key={timelineKey} ref={timelineRef} className={`relative border-l ml-4 space-y-12 mb-12 py-4 transition-all duration-700 animate-highlight ${isPing ? "border-[#4CB28E] dark:border-[#62D2FB] shadow-[0_0_30px_rgba(76,178,141,0.15)] bg-[#4CB28E]/5 dark:bg-[#62D2FB]/5 rounded-xl px-4" : "border-slate-200 dark:border-slate-700"}`}>
        {timelineEvents.map((evt, idx) => (
          <div key={idx} className="relative pl-8">
            <div className={`absolute -left-2.5 top-0 w-5 h-5 rounded-full border-2 bg-white dark:bg-[#233355] flex items-center justify-center ${
              evt.status === 'active' ? 'border-[#4CB28E] dark:border-[#62D2FB] w-6 h-6 -left-3' : 
              evt.status === 'past' ? 'border-slate-200 bg-slate-100' : 'border-slate-300 dark:border-slate-600'}`}>
              {evt.status === 'past' && <span className="text-slate-400 text-[10px] font-bold">✓</span>}
              {evt.status === 'active' && <div className="w-3 h-3 bg-[#4CB28E] dark:bg-[#62D2FB] rounded-full animate-pulse" />}
            </div>
            
            <div className={`w-full rounded-2xl border p-6 transition-all duration-300 ${
              evt.status === 'active' ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355] shadow-[0_0_20px_rgba(76,178,141,0.2)] dark:shadow-[0_0_20px_rgba(98,210,251,0.2)] transform scale-[1.02]' : 
              evt.status === 'past' ? 'border-transparent bg-[#F8FAFC] dark:bg-[#0F172A] opacity-50 grayscale' : 
              'border-slate-200 dark:border-slate-700 bg-[#FFFFFF] dark:bg-[#233355] hover:-translate-y-1 hover:shadow-md'
            }`}>
              <div className="flex justify-between items-start mb-3.5">
                <div className={`text-xs sm:text-sm font-bold tracking-wider px-3 py-1.5 rounded-full border flex items-center gap-1.5 uppercase ${evt.tagColor}`}>
                  {evt.icon} {evt.tag}
                </div>
                <div className={`text-base sm:text-lg md:text-xl font-heading font-bold whitespace-nowrap shrink-0 ${
                  evt.status === 'active' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 
                  evt.status === 'past' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                }`}>{formatDisplayTime(evt.time, isEn)}</div>
              </div>
              <h4 className={`text-xl sm:text-2xl font-heading font-bold mb-2.5 ${
                evt.status === 'active' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 
                evt.status === 'past' ? 'text-slate-500 dark:text-slate-400' : 'text-[#1F2937] dark:text-white'
              }`}>{evt.title}</h4>
              <p className={`text-lg sm:text-xl font-medium leading-relaxed ${
                evt.status === 'active' ? 'text-[#134E48] dark:text-[#E0F2FE]' : 
                evt.status === 'past' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'
              }`}>{evt.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => { setShowGoal(!showGoal); setIsManual(false); setIsPing(false); setIsPreviewed(false); }}
        className="w-full py-4 rounded-full border-2 border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB] font-bold bg-white dark:bg-transparent flex justify-center items-center gap-2 mb-12 hover:bg-[#fffff8] transition-colors"
      >
        {isEn ? "Adjust Timeline" : "Điều chỉnh Lộ trình"} <span className={`transition-transform ${showGoal ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* ADJUST TIMELINE SECTION */}
      {showGoal && (
        <div className="animate-fade-in mb-12">
          {!isManual ? (
            <>
              <h3 className="text-xl font-bold text-[#1F2937] dark:text-white mb-2">{isEn ? "Select your Goal for Today" : "Mục tiêu phục hồi hôm nay"}</h3>
              <p className="text-sm text-slate-500 mb-6">
                {isEn 
                  ? "Clicking this will recalculate your sleep schedule. You can review the changes on the timeline above." 
                  : "Nhấn chọn mục tiêu để tính toán lại lịch ngủ. Bạn có thể xem ngay các thay đổi trên lộ trình phía trên."}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  { 
                    id: 'healthy_balanced', 
                    title: isEn ? '🌱 Healthy Balanced' : '🌱 Cân bằng lành mạnh', 
                    desc: isEn ? 'Balanced rest and steady energy' : 'Nghỉ ngơi điều độ và năng lượng ổn định' 
                  },
                  { 
                    id: 'max_productivity', 
                    title: isEn ? '🚀 Max Productivity' : '🚀 Năng suất tối đa', 
                    desc: isEn ? 'Peak focus and deep work' : 'Tập trung cao độ và làm việc sâu' 
                  },
                  { 
                    id: 'catch_up', 
                    title: isEn ? '⚡ Catch Up & Sleep' : '⚡ Ngủ bù & Phục hồi', 
                    desc: isEn ? 'Extra sleep for full recovery' : 'Thêm giờ ngủ để phục hồi năng lượng' 
                  },
                  { 
                    id: 'night_owl', 
                    title: isEn ? '🦉 Night Owl / Shift' : '🦉 Cú đêm / Ca muộn', 
                    desc: isEn ? 'Late-night and evening schedules' : 'Lịch làm việc và hoạt động ban đêm' 
                  }
                ].map(goal => (
                  <button 
                    key={goal.id}
                    onClick={() => {
                      setActiveGoal(goal.id);
                      setIsPreviewed(false); // Reset preview if they change goal
                      if (onUpdateRecoveryGoal) onUpdateRecoveryGoal(goal.id as any);
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all ${activeGoal === goal.id ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#fffff8] dark:bg-[#233355] shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#233355] hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-in-out'}`}
                  >
                    <div className="font-bold text-[#1F2937] dark:text-white mb-1">{goal.title}</div>
                    <div className="text-xs text-slate-500">{goal.desc}</div>
                  </button>
                ))}
              </div>

              {!isPreviewed && (
                <button 
                  onClick={() => {
                    // Dynamically calculate based on current input data
                    if (onUpdateBedtime) {
                      const baseB = localStorage.getItem('owlup_bedtime') || '23:00';
                      const baseW = localStorage.getItem('owlup_waketime') || '07:00';
                      
                      const parseT = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
                      const fmtT = (m: number) => { 
                        let hm = Math.floor(m/60) % 24; if(hm<0) hm+=24;
                        let mm = m % 60; if(mm<0) mm+=60;
                        return `${String(hm).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
                      };
                      
                      let bMins = parseT(baseB);
                      let wMins = parseT(baseW);
                      
                      let newB = baseB;
                      let newW = baseW;
                      let newNap = '20';
                      
                      if (activeGoal === 'healthy_balanced') {
                        // Respect morning commitments and evening commitments
                        try {
                           const comms = JSON.parse(localStorage.getItem('owlup_commitments') || '[]');
                           let requiredW = 7 * 60;
                           if (comms && comms.length > 0) {
                             const morningComms = comms
                               .map((c: any) => parseT(c.start))
                               .filter((s: number) => s >= 4 * 60 && s <= 12 * 60)
                               .sort((a: number, b: number) => a - b);
                             if (morningComms.length > 0) {
                               requiredW = Math.max(4 * 60 + 30, morningComms[0] - 15);
                             }
                             
                             let proposedB = requiredW - 8 * 60;
                             if (proposedB < 0) proposedB += 24 * 60;
                             
                             let latestEveningMins = 0;
                             comms.forEach((c: any) => {
                               if (c.end) {
                                 const m = parseT(c.end);
                                 if (m >= 18 * 60 || m < 4 * 60) {
                                   if (m > latestEveningMins) latestEveningMins = m;
                                 }
                               }
                             });
                             if (latestEveningMins > 0 && proposedB < latestEveningMins + 60) {
                               proposedB = latestEveningMins + 60;
                             }
                             newB = fmtT(proposedB);
                             newW = fmtT(requiredW);
                           } else {
                             newB = '22:30'; newW = '06:30';
                           }
                        } catch {
                           newB = '22:30'; newW = '06:30';
                        }
                        newNap = '20';
                      } else if (activeGoal === 'max_productivity') {
                        // Maximize awake time, allow caffeine
                        newW = fmtT(wMins - 30); newNap = '15';
                      } else if (activeGoal === 'catch_up') {
                        // Maximize sleep, chill, reflex
                        newB = fmtT(bMins - 60); newW = fmtT(wMins + 30); newNap = '30';
                      } else if (activeGoal === 'night_owl') {
                        // Shift sleep extremely late
                        newB = fmtT(bMins + 180); newW = fmtT(wMins + 180); newNap = '20';
                      }
                      
                      let diff = parseT(newW) - parseT(newB);
                      if (diff < 0) diff += 24*60;

                      // Dynamically calculate nap time avoiding daytime commitments
                      let goalNapMins = 12 * 60 + 30;
                      const goalNapDur = parseInt(newNap) || 20;
                      try {
                        const comms = JSON.parse(localStorage.getItem('owlup_commitments') || '[]');
                        if (comms && comms.length > 0) {
                          const sorted = comms
                            .map((c: any) => ({ s: parseT(c.start), e: parseT(c.end) }))
                            .sort((a: any, b: any) => a.s - b.s);
                          for (const c of sorted) {
                            if (goalNapMins < c.e && goalNapMins + goalNapDur > c.s) {
                              goalNapMins = c.e + 15;
                            }
                          }
                          if (goalNapMins > 16 * 60 + 30 || goalNapMins < 11 * 60) {
                            goalNapMins = 12 * 60 + 30;
                          }
                        }
                      } catch {}
                      const napStart = fmtT(goalNapMins);
                      
                      onUpdateBedtime(newB, newW, (diff/60).toFixed(1), napStart, newNap);
                    }
                    setIsPreviewed(true);
                    setTimelineKey(prev => prev + 1); // Trigger ping effect
                  }} 
                  className="w-full py-4 mt-6 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] text-white dark:text-[#0E172A] font-bold shadow-lg shadow-[#4CB28E]/20 dark:shadow-[#62D2FB]/20 hover:bg-[#007b4d] dark:bg-[#62D2FB] transition-colors animate-fade-in"
                >
                  {isEn ? "Save & Preview Timeline" : "Lưu & Xem trước"}
                </button>
              )}
              
              {isPreviewed && (
                <div className="flex flex-col items-start w-full mt-6 mb-2 animate-fade-in">
                  <p className="text-[#4CB28E] dark:text-[#62D2FB] font-bold mb-4">
                    {isEn ? "Timeline regenerated. Daily schedule worked for you" : "Đã tái tạo lịch trình. Lịch trình này có phù hợp không?"}
                  </p>
                  <div className="flex items-center justify-start w-full gap-6">
                    <button onClick={() => setShowGoal(false)} className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white rounded-full px-10 py-3 text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-1">
                      {isEn ? "Agree" : "Đồng ý"}
                    </button>
                    <button onClick={() => setIsManual(true)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer transition-colors">
                      {isEn ? "Manually Adjust" : "Chỉnh tay"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-[#233355] border-0 mb-4 animate-fade-in w-full">
              <h3 className="text-xl font-heading font-bold text-[#1F2937] dark:text-white mb-1">
                {isEn ? "Customize Today's Routine" : "Tùy chỉnh lịch trình hôm nay"}
              </h3>
              <p className="text-sm text-slate-500 mb-6 italic">
                {isEn ? "Quickly adjust target hours according to your schedule:" : "Điều chỉnh nhanh giờ mục tiêu theo lịch trình của bạn:"}
              </p>
              
              <div className="mb-6 border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-[#233355]">
                <h4 className="text-sm font-sans font-medium text-[#1F2937] dark:text-white mb-4">{isEn ? "Main night sleep" : "Giấc ngủ đêm"}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{isEn ? "Bedtime" : "Giờ ngủ"}</label>
                    <TimePickerInput value={manualBedtime} onChange={setManualBedtime} isEn={isEn} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{isEn ? "Wake Time" : "Giờ dậy"}</label>
                    <TimePickerInput value={manualWakeTime} onChange={setManualWakeTime} isEn={isEn} />
                  </div>
                </div>
              </div>
              
              <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-[#233355]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{isEn ? "Middle nap duration" : "Thời lượng ngủ trưa"}</label>
                    <select value={manualNapDuration} onChange={(e) => setManualNapDuration(e.target.value)} className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB] appearance-none">
                      <option value="15">{isEn ? "15 min" : "15 phút"}</option>
                      <option value="20">{isEn ? "20 min" : "20 phút"}</option>
                      <option value="30">{isEn ? "30 min" : "30 phút"}</option>
                      <option value="45">{isEn ? "45 min" : "45 phút"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{isEn ? "Caffeine buffer before bed" : "Dừng Caffeine trước khi ngủ"}</label>
                    <select className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB] appearance-none">
                      <option value="8">{isEn ? "8 hours" : "8 giờ"}</option>
                      <option value="10">{isEn ? "10 hours" : "10 giờ"}</option>
                      <option value="12">{isEn ? "12 hours" : "12 giờ"}</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button onClick={() => setIsManual(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer transition-colors">
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button onClick={() => {
                  if (onUpdateBedtime) {
                    const bh = parseInt(manualBedtime.split(':')[0]);
                    const wh = parseInt(manualWakeTime.split(':')[0]);
                    let diff = wh - bh;
                    if (diff < 0) diff += 24;
                    onUpdateBedtime(manualBedtime, manualWakeTime, String(diff), manualNapStart, manualNapDuration);
                  }
                  setShowGoal(false);
                  setTimelineKey(prev => prev + 1);
                }} className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white rounded-full px-12 py-3.5 text-lg font-bold shadow-md cursor-pointer hover:-translate-y-1 transition-all">
                  {isEn ? "Save" : "Lưu"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default RecoveryTimeline;
