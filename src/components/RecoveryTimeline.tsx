import React, { useState, useRef } from 'react';
import { AppLanguage, UserProfile, DayRecoveryGoal } from '../types';
import { formatDisplayTime } from '../utils/timeFormat';
import { getDrinkIcon } from './CaffeineAdvisor';
import { Trash2 } from 'lucide-react';

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
  onUpdateCaffeineLog?: (items: any[]) => void;
  onUpdateCommitments?: (commitments: any[]) => void;
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
  onUpdateCaffeineLog,
  onUpdateCommitments,
}) => {
  const isEn = language === 'en';
  const timelineRef = useRef<HTMLDivElement>(null);
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

  // 2. Power Nap (only if there is a valid open window)
  if (hasValidNap) {
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
  }
  
  // 3. Commitments
  commitments.forEach(c => {
      let absCStart = parseMins(c.start);
      while (absCStart <= absWakeMins - 4*60) absCStart += 24 * 60; // place them mostly during the day
      
      const commTitle = (!isEn && (!c.title || c.title.toLowerCase() === 'busy block'))
        ? 'Lịch bận'
        : (isEn && c.title === 'Lịch bận' ? 'Busy Block' : (c.title || (isEn ? 'Busy Block' : 'Lịch bận')));
      
      rawEvents.push({
          absTime: absCStart,
          time: c.start,
          tag: isEn ? 'COMMITMENT' : 'LỊCH BẬN',
          tagColor: 'text-slate-500 bg-slate-100 border-slate-200',
          icon: '📅',
          title: commTitle,
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
      tagColor: 'text-[#7F1D1D] dark:text-[#FCA5A5] bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border-[#991B1B]/70 dark:border-[#B91C1C]',
      icon: '🚫',
      title: isEn ? 'Caffeine Curfew' : 'Ngừng caffeine',
      desc: isEn ? 'Stop all caffeine to ensure it clears from your system before bed.' : 'Ngừng mọi loại thức uống có caffeine để cơ thể đào thải hết trước khi ngủ.',
      duration: 30
  });

  // 5. Logged Caffeine Drinks (Đồng bộ theo ngày, hiển thị trực tiếp lên Timeline)
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
          duration: 30,
          drinkId: it.id,
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
      <div className="w-full rounded-[20px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#233355] p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm relative overflow-hidden animate-fade-in">
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#4CB28E] dark:bg-[#62D2FB]" />
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-[#4CB28E] dark:text-[#62D2FB] text-xs sm:text-sm font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] animate-pulse" /> {isStrictlyActive ? (isEn ? 'HAPPENING NOW' : 'ĐANG DIỄN RA') : (isEn ? 'UP NEXT' : 'SẮP DIỄN RA')}
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-1">{activeEvent.title}</h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{activeEvent.desc}</p>
        </div>
        <div className="text-[#4CB28E] dark:text-[#62D2FB] font-heading font-bold text-lg sm:text-xl md:text-2xl shrink-0 self-end sm:self-center whitespace-nowrap tabular-nums">{formatDisplayTime(activeEvent.time, isEn)}</div>
      </div>
      )}

      {/* COMMITMENTS RESET NOTICE BANNER: Khi sang ngày mới, thời gian bận đã được xóa hết */}
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

      {/* DETAILED TIMELINE HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 sm:mb-8 border-b border-slate-200 dark:border-slate-700 pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#1F2937] dark:text-white">
            {isEn ? "Detailed Timeline" : "Chi tiết Lộ trình"}
          </h2>
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
              evt.status === 'active' ? 'border-[#4CB28E] dark:border-[#62D2FB] w-6 h-6 -left-3' : 
              evt.status === 'past' ? 'border-slate-200 bg-slate-100' : 'border-slate-300 dark:border-slate-600'}`}>
              {evt.status === 'past' && <span className="text-slate-400 text-[10px] font-bold">✓</span>}
              {evt.status === 'active' && <div className="w-3 h-3 bg-[#4CB28E] dark:bg-[#62D2FB] rounded-full animate-pulse" />}
            </div>
            
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
                  <div className={`text-sm sm:text-base font-heading font-bold whitespace-nowrap shrink-0 tabular-nums ${
                    evt.status === 'active' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 
                    evt.status === 'past' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                  }`}>{formatDisplayTime(evt.time, isEn)}</div>
                  {evt.drinkId && onUpdateCaffeineLog && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = activeDrinks.filter((it: any) => it.id !== evt.drinkId);
                        onUpdateCaffeineLog(updated);
                        try { localStorage.setItem('owlup_caffeine_log', JSON.stringify(updated)); } catch {}
                      }}
                      title={isEn ? "Remove this drink" : "Xóa đồ uống này"}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
          </div>
        ))}
      </div>
    </div>
  );
};
export default RecoveryTimeline;
