import { HistoryCalendar } from './HistoryCalendar';
import React, { useState } from 'react';
import { 
  ArrowRight, 
  Activity,
  Moon,
  Coffee,
  Zap
} from 'lucide-react';
import { formatDisplayTime } from '../utils/timeFormat';
import { AppFeature, UserProfile, UserSettings, CaffeineItem, DayRecoveryGoal, AppLanguage } from '../types';

interface DashboardProps {
  isNight: boolean;
  language?: AppLanguage;
  userProfile?: UserProfile | null;
  settings?: UserSettings;
  bedtime?: string;
  wakeTime?: string;
  totalSleepHours?: string;
  plannedNap?: { start: string; end: string; duration: number };
  caffeineLog?: CaffeineItem[];
  dailyLimitMg?: number;
  onSelectFeature?: (feature: AppFeature) => void;
  onNavigateToPlanner?: () => void;
  onNavigateToCaffeine?: () => void;
  onNavigateToTimeline?: () => void;
  onOpenSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  isNight,
  language = 'en',
  settings,
  userProfile,
  bedtime = '22:30',
  wakeTime = '06:30',
  totalSleepHours = '8.0',
  plannedNap: plannedNapProp,
  caffeineLog = [],
  dailyLimitMg = 400,
  onSelectFeature,
  onNavigateToPlanner,
  onNavigateToCaffeine,
  onNavigateToTimeline,
  onOpenSettings,
}) => {
  const isEn = language === 'en';
  const cleanSleepHours = (() => {
    try {
      if (bedtime && wakeTime) {
        const [bh, bm] = bedtime.split(':').map(Number);
        const [wh, wm] = wakeTime.split(':').map(Number);
        let diff = (wh * 60 + wm) - (bh * 60 + bm);
        if (diff <= 0) diff += 24 * 60;
        const val = (diff / 60).toFixed(1);
        return isEn ? `${val} hrs` : `${val} giờ`;
      }
    } catch {}
    const match = (totalSleepHours || '').match(/[\d.]+/);
    const val = match ? match[0] : '8.0';
    return isEn ? `${val} hrs` : `${val} giờ`;
  })();

  const timeColWidth = isEn ? 'w-[165px] sm:w-[210px]' : 'w-[95px] sm:w-[125px]';
  
  const safeDailyLimitMg = Math.min(400, Math.max(50, dailyLimitMg));
  const totalCaffeineMg = caffeineLog.reduce((sum, log) => sum + log.caffeineMg, 0);
  const isCritical = totalCaffeineMg > safeDailyLimitMg;
  const rawPercentage = Math.round((totalCaffeineMg / safeDailyLimitMg) * 100);
  const excessPercent = Math.max(0, rawPercentage - 100);
  const safePortionWidth = isCritical ? (100 / rawPercentage) * 100 : rawPercentage;
  const excessPortionWidth = isCritical ? (excessPercent / rawPercentage) * 100 : 0;
  const progressPercent = Math.min(100, rawPercentage);
  const remaining = safeDailyLimitMg - totalCaffeineMg;
  const [activeTab, setActiveTab] = useState<'sleep'|'caffeine'>('sleep');

  const plannedNap = plannedNapProp !== undefined ? plannedNapProp : (() => {
    try {
      const saved = localStorage.getItem('owlup_planned_nap');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  })();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const parseT = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const napStartMins = plannedNap?.start ? parseT(plannedNap.start) : null;
  const napEndMins = plannedNap?.end ? parseT(plannedNap.end) : null;
  const bedMins = parseT(bedtime || '22:30');
  const wakeMins = parseT(wakeTime || '06:30');

  // Determine whether Afternoon Power Nap or Night Sleep is the approaching/active event
  const isNapUpcomingOrActive = (() => {
    if (!plannedNap || !plannedNap.start || napEndMins === null) return false;
    // Nap window runs from wake up until nap ends
    // During this period (morning & afternoon), nap is next!
    // After nap finishes until tomorrow morning wake, night sleep is next!
    if (wakeMins < napEndMins) {
      return currentMins >= wakeMins && currentMins <= napEndMins;
    }
    return currentMins <= napEndMins;
  })();

  const nextBedtime = bedtime || userProfile?.bedtime || '22:30';
  
  const cutoffTime = (() => {
    try {
      if (nextBedtime) {
        let [h, m] = nextBedtime.split(':').map(Number);
        h -= 10;
        if (h < 0) h += 24;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    } catch {}
    return '12:30';
  })();

  const caffeineWindow = (() => {
    try {
      const s = wakeTime || '06:30';
      if (s) {
        let [h, m] = s.split(':').map(Number);
        let startMins = (h * 60 + m + 90) % 1440;
        let endMins = (startMins + 150) % 1440; // 2.5 hour window
        const formatTime = (mins: number) => {
          const hh = Math.floor(mins / 60) % 24;
          const mm = mins % 60;
          return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        };
        return `${formatTime(startMins)} - ${formatTime(endMins)}`;
      }
    } catch {}
    return '08:00 - 10:30';
  })();

  const rawName = userProfile?.name?.trim();
  const hasName = Boolean(rawName && rawName.toLowerCase() !== 'guest' && rawName.toLowerCase() !== 'khách');

  const hasSchedule = (() => {
    try {
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      return applied === 'true' && scheduleDate === todayStr;
    } catch {}
    return false;
  })();

  const hasCaffeineLog = caffeineLog.length > 0;

  // Time-of-day greeting (Morning 4-12, Afternoon 12-18, Evening 18-24, Night 0-4)
  const currentHour = new Date().getHours();
  const timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = (() => {
    if (currentHour >= 4 && currentHour < 12) return 'morning';
    if (currentHour >= 12 && currentHour < 18) return 'afternoon';
    if (currentHour >= 18 && currentHour < 24) return 'evening';
    return 'night';
  })();

  const renderGreeting = () => {
    const nameSpan = hasName ? (
      <span className="text-[#4CB28E] dark:text-[#62D2FB] font-medium">{rawName}</span>
    ) : null;

    if (timeOfDay === 'morning') {
      return isEn ? (
        hasName ? (
          <>Good morning, {nameSpan}! Ready for a fresh start? ☀️</>
        ) : (
          <>Good morning! Ready for a fresh start? ☀️</>
        )
      ) : (
        hasName ? (
          <>Chào buổi sáng, {nameSpan}! Bạn sẵn sàng bắt đầu ngày mới chưa? ☀️</>
        ) : (
          <>Chào buổi sáng! Bạn sẵn sàng bắt đầu ngày mới chưa? ☀️</>
        )
      );
    }

    if (timeOfDay === 'afternoon') {
      return isEn ? (
        hasName ? (
          <>Hey, {nameSpan}! Need some extra energy? ⚡</>
        ) : (
          <>Hey there! Need some extra energy? ⚡</>
        )
      ) : (
        hasName ? (
          <>Chào buổi chiều, {nameSpan}! Bạn cần thêm chút năng lượng không? ⚡</>
        ) : (
          <>Chào buổi chiều! Bạn cần thêm chút năng lượng không? ⚡</>
        )
      );
    }

    if (timeOfDay === 'evening') {
      return isEn ? (
        hasName ? (
          <>Hey, {nameSpan}! Ready to wind down? 😴</>
        ) : (
          <>Hey there! Ready to wind down? 😴</>
        )
      ) : (
        hasName ? (
          <>Chào buổi tối, {nameSpan}! Bạn sẵn sàng thư giãn chưa? 😴</>
        ) : (
          <>Chào buổi tối! Bạn sẵn sàng thư giãn chưa? 😴</>
        )
      );
    }

    // Night (12 AM - 4 AM)
    return isEn ? (
      hasName ? (
        <>Hey, {nameSpan}! Still up? 🦉</>
      ) : (
        <>Hey there! Still up? 🦉</>
      )
    ) : (
      hasName ? (
        <>Này {nameSpan}! Bạn vẫn còn thức à? 🦉</>
      ) : (
        <>Này bạn! Bạn vẫn còn thức à? 🦉</>
      )
    );
  };

  return (
    <div className="w-full animate-fade-in pb-12">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
          animation-iteration-count: 3;
        }
      `}</style>
      
      {/* USER GREETING BANNER */}
      <div className="w-full max-w-[1100px] w-[90%] mx-auto pt-2 pb-5 px-4 sm:px-8">
        <h1 className="font-heading font-normal text-2xl sm:text-3xl md:text-[34px] text-[#1F2937] dark:text-[#F8FAFC] tracking-tight leading-snug">
          {renderGreeting()}
        </h1>
      </div>

      {/* MANILA FOLDER SHAPE LAYOUT */}
      <div className="relative w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pt-2 mt-2 mb-8">
        
        {/* Overlapping Tabs */}
        <div className="flex w-full items-end pl-2 sm:pl-8 relative z-10 -mb-[1px]">
           {/* Sleep Tab */}
           <button 
             onClick={() => setActiveTab('sleep')}
             className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 md:px-10 py-2 sm:py-3.5 md:py-4 rounded-t-[20px] sm:rounded-t-[24px] border border-b-0 font-bold transition-all duration-300 ease-in-out cursor-pointer ${
               activeTab === 'sleep' 
               ? 'bg-[#fffff8] dark:bg-[#233355] text-[#1F2937] dark:text-white z-20 pb-4 sm:pb-6 border-slate-200 dark:border-slate-700' 
               : 'bg-[#fffff8]/60 dark:bg-[#0F172A] text-slate-500 z-0 opacity-80 hover:opacity-100 hover:-translate-y-1 border-slate-200 dark:border-slate-700'
             }`}
           >
             <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${activeTab === 'sleep' ? 'bg-white dark:bg-[#1E3A2F]' : 'bg-white/50 dark:bg-slate-800'}`}>
               <Moon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'sleep' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 'text-slate-400'}`} />
             </div>
             <span className="font-heading text-xs sm:text-base md:text-lg whitespace-nowrap">{isEn ? "Today's sleep plan" : "Lịch ngủ hôm nay"}</span>
           </button>
           
           {/* Caffeine Tab */}
           <button 
             onClick={() => setActiveTab('caffeine')}
             className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 md:px-10 py-2 sm:py-3.5 md:py-4 rounded-t-[20px] sm:rounded-t-[24px] border border-b-0 font-bold transition-all duration-300 ease-in-out -ml-3 sm:-ml-6 cursor-pointer ${
               activeTab === 'caffeine' 
               ? 'bg-[#fffff8] dark:bg-[#233355] text-[#1F2937] dark:text-white z-20 pb-4 sm:pb-6 border-slate-200 dark:border-slate-700' 
               : 'bg-[#fffff8]/60 dark:bg-[#162032] text-slate-500 z-0 opacity-80 hover:opacity-100 hover:-translate-y-1 border-slate-200 dark:border-slate-700'
             }`}
           >
             <Coffee className={`w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 ${activeTab === 'caffeine' ? 'text-[#1F2937] dark:text-white' : 'text-slate-400'}`} />
             <span className="font-heading text-xs sm:text-base md:text-lg whitespace-nowrap">{isEn ? "Today's caffeine status" : "Caffeine hôm nay"}</span>
           </button>
        </div>

        {/* MAIN CONTENT BODY */}
        <div className={`relative w-full rounded-[32px] border transition-colors duration-500 p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] z-10 hover:shadow-xl ease-in-out ${
          activeTab === 'sleep' 
          ? 'bg-[#fffff8] dark:bg-[#233355] border-slate-200 dark:border-slate-700 rounded-tl-none' 
          : 'bg-[#fffff8] dark:bg-[#233355] border-slate-200 dark:border-slate-700'
        }`}>
        
          {activeTab === 'sleep' && (
            <div className="flex flex-col animate-fade-in">
              {!hasSchedule ? (
                <div className="flex flex-col items-center text-center py-6 sm:py-8 px-4">
                  <div className="w-16 h-16 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center mb-4">
                    <Moon className="w-8 h-8 text-[#007b4d] dark:text-[#62D2FB]" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl sm:text-3xl text-[#1F2937] dark:text-white mb-3">
                    {isEn ? "You haven't set up today's sleep plan" : "Bạn chưa thiết lập lịch ngủ hôm nay"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-lg mb-8 text-base font-sans leading-relaxed">
                    {isEn
                      ? "Add your daily busy commitments so OwlUp can calculate your optimal bedtime and schedule restorative power naps."
                      : "Hãy nhập các khung giờ bận trong ngày (học tập, làm việc) để OwlUp tự động tính toán giờ ngủ tối ưu và sắp xếp giấc ngủ ngắn phục hồi năng lượng cho bạn."}
                  </p>
                  <button
                    onClick={onNavigateToPlanner}
                    className="w-full sm:w-auto px-10 py-4 bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full text-lg font-sans font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-[#4CB28E]/25 dark:shadow-[#62D2FB]/25 hover:-translate-y-1 cursor-pointer"
                  >
                    <span>{isEn ? "Set up sleep schedule" : "Thiết lập lịch ngủ ngay"}</span>
                    <span className="font-normal">→</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Afternoon Power Nap (Moved on top) */}
                  {plannedNap && plannedNap.start && plannedNap.end && (
                  <div className={`w-full ${
                    isNapUpcomingOrActive 
                      ? 'border-2 border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355]/80 shadow-sm' 
                      : 'border border-[#F1F5F9]/70 dark:border-slate-700 bg-white dark:bg-[#233355]'
                  } rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 mb-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out`}>
                    <div className={`${
                      isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-slate-500 dark:text-slate-400'
                    } font-sans text-xs sm:text-sm md:text-base font-medium mb-2 flex items-center`}>
                      <span>{isEn ? 'Afternoon Power Nap:' : 'Chợp mắt buổi trưa:'} <span className="font-heading">{plannedNap.duration} {isEn ? 'min' : 'phút'}</span></span>
                    </div>
                    <div className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold flex items-center whitespace-nowrap gap-x-2 tabular-nums">
                      <span className="text-[#1F2937] dark:text-white text-left whitespace-nowrap">
                        {formatDisplayTime(plannedNap.start, isEn)}
                      </span>
                      <span className={`font-sans text-center shrink-0 ${
                        isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-slate-300 dark:text-slate-600'
                      }`}>
                        →
                      </span>
                      <span className={`text-left whitespace-nowrap ${
                        isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-[#1F2937] dark:text-white'
                      }`}>
                        {formatDisplayTime(plannedNap.end, isEn)}
                      </span>
                    </div>
                  </div>
                  )}

                  {/* 2. Night Sleep (Moved below) */}
                  <div className={`w-full ${
                    !isNapUpcomingOrActive 
                      ? 'border-2 border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355]/80 shadow-sm' 
                      : 'border border-[#F1F5F9]/70 dark:border-slate-700 bg-white dark:bg-[#233355]'
                  } rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out`}>
                    <div className={`${
                      !isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-slate-500 dark:text-slate-400'
                    } font-sans text-xs sm:text-sm md:text-base font-medium mb-2 flex items-center`}>
                      <span>{isEn ? 'Night Sleep:' : 'Giấc ngủ đêm:'} <span className="font-heading">{cleanSleepHours}</span></span>
                    </div>
                    <div className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold flex items-center whitespace-nowrap gap-x-2 tabular-nums">
                      <span className="text-[#1F2937] dark:text-white text-left whitespace-nowrap">
                        {formatDisplayTime(bedtime, isEn)}
                      </span>
                      <span className={`font-sans text-center shrink-0 ${
                        !isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-slate-300 dark:text-slate-600'
                      }`}>
                        →
                      </span>
                      <span className={`text-left whitespace-nowrap ${
                        !isNapUpcomingOrActive ? 'text-[#007b4d] dark:text-[#62D2FB]' : 'text-[#1F2937] dark:text-white'
                      }`}>
                        {formatDisplayTime(wakeTime, isEn)}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={onNavigateToPlanner}
                    className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full py-3.5 sm:py-5 px-4 text-base sm:text-lg font-sans font-medium flex justify-center items-center gap-2 transition-colors shadow-lg shadow-[#4CB28E]/20 dark:shadow-[#62D2FB]/20 hover:-translate-y-1 text-center cursor-pointer"
                  >
                    <span>{isEn ? 'Adjust Sleep & Nap Schedule' : 'Tùy chỉnh lịch ngủ'}</span> <span className='font-sans font-normal ml-1'>→</span>
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'caffeine' && (
            <div className="flex flex-col animate-fade-in">
              {!hasCaffeineLog ? (
                <div className="flex flex-col items-center text-center py-6 sm:py-8 px-4">
                  <div className="w-16 h-16 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center mb-4">
                    <Coffee className="w-8 h-8 text-[#007b4d] dark:text-[#62D2FB]" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl sm:text-3xl text-[#1F2937] dark:text-white mb-3">
                    {isEn ? "No caffeine logged today" : "Chưa ghi nhận caffeine hôm nay"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-lg mb-8 text-base font-sans leading-relaxed">
                    {isEn
                      ? "Log your coffee, tea, or energy drinks to track residual caffeine and find out the exact safe curfew to stop drinking."
                      : "Ghi nhận cà phê, trà hay nước tăng lực bạn dùng để OwlUp tính giờ ngưng uống an toàn và bảo vệ giấc ngủ ngon đêm nay."}
                  </p>
                  <button
                    onClick={onNavigateToCaffeine}
                    className="w-full sm:w-auto px-10 py-4 bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full text-lg font-sans font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-[#4CB28E]/25 dark:shadow-[#62D2FB]/25 hover:-translate-y-1 cursor-pointer"
                  >
                    <span>{isEn ? "Log First Drink" : "Nhập caffeine ngay"}</span>
                    <span className="font-normal">→</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Box 1: Caffeine Curfew Cutoff */}
                  <div className="w-full border border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#233355]/80 rounded-[32px] p-6 sm:p-8 mb-4 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg">
                    <div className="text-[#007b4d] dark:text-[#62D2FB] dark:text-slate-400 font-sans text-sm sm:text-base font-medium mb-2 whitespace-nowrap">
                      {isEn ? 'Caffeine Curfew Cutoff:' : 'Giờ ngừng Caffeine:'}
                    </div>
                    <div className="font-heading text-3xl sm:text-4xl font-bold text-[#1F2937] dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {formatDisplayTime(cutoffTime, isEn)}
                    </div>
                  </div>
                  
                  {/* Box 2: Daily Safe Allowance */}
                  <div className={`w-full border ${isCritical ? 'border-[#C10007] animate-shake' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-[#233355] rounded-[32px] p-6 sm:p-8 mb-6 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg`}>
                    <div className="mb-3">
                      <div className="text-[#1F2937] dark:text-white font-sans text-sm sm:text-base font-bold whitespace-nowrap">
                        {isEn ? 'Daily Safe Allowance' : 'Hạn mức an toàn'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isEn ? `Consumed: ${totalCaffeineMg}mg / ${safeDailyLimitMg}mg` : `Đã nạp: ${totalCaffeineMg}mg / ${safeDailyLimitMg}mg`}
                      </div>
                    </div>

                    <div className="w-full h-3 sm:h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 flex mb-2">
                      <div 
                        className={`h-full transition-all duration-500 bg-[#4CB28E] dark:bg-[#62D2FB] ${isCritical ? 'border-r-2 border-white dark:border-slate-900' : ''}`} 
                        style={{ width: `${safePortionWidth}%` }}
                        title={isEn ? `Safe limit: 100% (${safeDailyLimitMg}mg)` : `Ngưỡng an toàn: 100% (${safeDailyLimitMg}mg)`}
                      />
                      {isCritical && (
                        <div 
                          className="h-full bg-[#C10007] transition-all duration-500" 
                          style={{ width: `${excessPortionWidth}%` }}
                          title={isEn ? `Over limit: +${excessPercent}% (+${Math.abs(remaining)}mg)` : `Vượt ngưỡng: +${excessPercent}% (+${Math.abs(remaining)}mg)`}
                        />
                      )}
                    </div>

                    {isCritical ? (
                      <div className="flex items-center justify-between text-xs font-semibold mt-2 mb-3">
                        <div className="flex items-center gap-1.5 text-[#4CB28E] dark:text-[#62D2FB]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] inline-block"></span>
                          <span>{isEn ? `100% Safe limit (${safeDailyLimitMg}mg)` : `100% An toàn (${safeDailyLimitMg}mg)`}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#C10007] dark:text-[#F87171]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#C10007] inline-block animate-pulse"></span>
                          <span>{isEn ? `+${excessPercent}% Over limit (+${Math.abs(remaining)}mg)` : `+${excessPercent}% Vượt ngưỡng (+${Math.abs(remaining)}mg)`}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3">
                        <span>{isEn ? `Progress: ${rawPercentage}%` : `Đạt ${rawPercentage}% hạn mức`}</span>
                        <span>{isEn ? `Daily limit: ${safeDailyLimitMg}mg` : `Hạn mức: ${safeDailyLimitMg}mg`}</span>
                      </div>
                    )}

                    <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 pt-3 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                      {isCritical 
                        ? (isEn 
                            ? `⚠️ Drink plenty of water and avoid additional caffeine today.` 
                            : `⚠️ Hãy uống nhiều nước lọc và dừng nạp thêm caffeine hôm nay.`)
                        : (isEn 
                            ? `💡 Your caffeine level is within the safe limit. You can consume more before ${formatDisplayTime(cutoffTime, isEn)} if needed.` 
                            : `💡 Lượng caffeine đang ở mức an toàn. Bạn có thể nạp thêm trước ${formatDisplayTime(cutoffTime, isEn)} nếu cần tỉnh táo.`)}
                    </p>
                  </div>
                   
                  <button 
                    onClick={onNavigateToCaffeine}
                    className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full py-4 text-base font-bold transition-all duration-300 shadow-lg shadow-[#4CB28E]/20 dark:shadow-[#62D2FB]/20 cursor-pointer hover:-translate-y-1 whitespace-nowrap"
                  >
                    {isEn ? "Log Today's Drink" : "Nhật ký uống hôm nay"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DAILY RECOVERY TIMELINE PREVIEW */}
      <section className="mt-12 w-full max-w-[1100px] w-[90%] mx-auto bg-white dark:bg-[#233355] rounded-[32px] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F1F5F9] dark:border-slate-800">
        <div className="flex items-center justify-between mb-8 px-2 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#4CB28E] dark:text-[#62D2FB]" />
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#1F2937] dark:text-white whitespace-nowrap">
              {isEn ? 'Daily Recovery Timeline' : 'Lộ trình phục hồi hàng ngày'}
            </h3>
          </div>
          <button
            onClick={onNavigateToTimeline}
            className="text-[15px] font-sans font-medium flex items-center gap-1.5 text-[#4CB28E] dark:text-[#62D2FB] hover:text-[#007b4d] dark:text-[#62D2FB] transition-colors whitespace-nowrap bg-[#E1FFE6] dark:bg-[#62D2FB]/10 px-4 py-2 rounded-full cursor-pointer z-10"
          >
            <span>{isEn ? 'Open Full Timeline' : 'Mở Lộ trình chi tiết'}</span>
            <span className="text-lg leading-none">&rarr;</span>
          </button>
        </div>

        {!hasSchedule ? (
          <div className="flex flex-col items-center text-center py-10 px-6 rounded-[24px] bg-[#E6F8F0]/60 dark:bg-[#62D2FB]/5 border border-dashed border-[#4CB28E]/40 dark:border-[#62D2FB]/30">
            <div className="w-14 h-14 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center mb-3">
              <Activity className="w-7 h-7 text-[#007b4d] dark:text-[#62D2FB]" />
            </div>
            <h4 className="font-heading font-bold text-xl sm:text-2xl text-[#1F2937] dark:text-white mb-2">
              {isEn ? "No daily checkpoints yet" : "Chưa có lộ trình phục hồi"}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 max-w-md text-sm sm:text-base font-sans mb-6 leading-relaxed">
              {isEn
                ? "5 key recovery checkpoints (wake up, caffeine window, power nap, curfew, and bedtime) will be calculated once you create your sleep schedule."
                : "5 mốc phục hồi trong ngày (giờ đón nắng, khung giờ caffeine tối ưu, giờ chợp mắt, giờ ngừng caffeine và giờ đi ngủ) sẽ được tính toán ngay sau khi bạn thiết lập lịch ngủ."}
            </p>
            <button
              onClick={onNavigateToPlanner}
              className="px-8 py-3.5 bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full text-base font-sans font-bold flex items-center gap-2 transition-all shadow-md shadow-[#4CB28E]/25 dark:shadow-[#62D2FB]/25 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{isEn ? "Set Up Sleep Schedule" : "Thiết lập lịch ngủ ngay"}</span>
              <span className="font-normal">&rarr;</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3">
            {/* 1. Wake up */}
            <div className="px-3 py-3.5 sm:px-2.5 lg:px-3 sm:py-4 rounded-[20px] bg-white dark:bg-[#233355] border border-[#F1F5F9]/70 dark:border-slate-700 shadow-sm flex flex-col justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out">
              <span className="text-xs sm:text-sm font-bold font-sans text-[#1F2937] dark:text-white mb-2 tracking-tight">{isEn ? '1. Wake up' : '1. Thức dậy'}</span>
              <span className="text-base sm:text-[14.5px] lg:text-[14px] xl:text-[15.5px] font-bold font-heading text-[#4CB28E] dark:text-[#62D2FB] mb-1 tracking-tight">{formatDisplayTime(wakeTime, isEn)}</span>
              <span className="text-xs font-sans text-slate-500 overflow-hidden text-ellipsis">{isEn ? 'Get morning sunlight' : 'Đón nắng sáng'}</span>
            </div>

            {/* 2. Caffeine window */}
            <div className="px-3 py-3.5 sm:px-2.5 lg:px-3 sm:py-4 rounded-[20px] bg-white dark:bg-[#233355] border border-[#F1F5F9]/70 dark:border-slate-700 shadow-sm flex flex-col justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out">
              <span className="text-xs sm:text-sm font-bold font-sans text-[#1F2937] dark:text-white mb-2 tracking-tight">{isEn ? '2. Caffeine Window' : '2. Khung giờ caffeine'}</span>
              <span className="text-base sm:text-[14.5px] lg:text-[14px] xl:text-[15.5px] font-bold font-heading text-[#4CB28E] dark:text-[#62D2FB] mb-1 tracking-tight">{formatDisplayTime(caffeineWindow, isEn)}</span>
              <span className="text-xs font-sans text-slate-500 overflow-hidden text-ellipsis">{isEn ? 'Peak focus intake' : 'Uống để tập trung'}</span>
            </div>

            {/* 3. Power nap */}
            <div className="px-3 py-3.5 sm:px-2.5 lg:px-3 sm:py-4 rounded-[20px] bg-white dark:bg-[#233355] border border-[#F1F5F9]/70 dark:border-slate-700 shadow-sm flex flex-col justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out">
              <span className="text-xs sm:text-sm font-bold font-sans text-[#1F2937] dark:text-white mb-2 tracking-tight">{isEn ? '3. Power Nap' : '3. Chợp mắt'}</span>
              <span className="text-base sm:text-[14.5px] lg:text-[14px] xl:text-[15.5px] font-bold font-heading text-[#4CB28E] dark:text-[#62D2FB] mb-1 tracking-tight">{formatDisplayTime(plannedNap?.start || '12:30', isEn)}</span>
              <span className="text-xs font-sans text-slate-500 overflow-hidden text-ellipsis">{(plannedNap?.duration || 20)} {isEn ? 'min recharge' : 'phút sạc pin'}</span>
            </div>

            {/* 4. Cutoff Curfew */}
            <div className="px-3 py-3.5 sm:px-2.5 lg:px-3 sm:py-4 rounded-[20px] bg-white dark:bg-[#233355] border border-[#F1F5F9]/70 dark:border-slate-700 shadow-sm flex flex-col justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out">
              <span className="text-xs sm:text-sm font-bold font-sans text-[#1F2937] dark:text-white mb-2 tracking-tight">{isEn ? '4. Cutoff Curfew' : '4. Ngừng caffeine'}</span>
              <span className="text-base sm:text-[14.5px] lg:text-[14px] xl:text-[15.5px] font-bold font-heading text-[#4CB28E] dark:text-[#62D2FB] mb-1 tracking-tight">{formatDisplayTime(cutoffTime, isEn)}</span>
              <span className="text-xs font-sans text-slate-500 overflow-hidden text-ellipsis">{isEn ? 'Protect sleep quality' : 'Bảo vệ giấc ngủ'}</span>
            </div>

            {/* 5. Bedtime */}
            <div className="xs:col-span-2 sm:col-span-1 px-3 py-3.5 sm:px-2.5 lg:px-3 sm:py-4 rounded-[20px] bg-white dark:bg-[#233355] border border-[#F1F5F9]/70 dark:border-slate-700 shadow-sm flex flex-col justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-in-out">
              <span className="text-xs sm:text-sm font-bold font-sans text-[#1F2937] dark:text-white mb-2 tracking-tight">{isEn ? '5. Bedtime' : '5. Đi ngủ'}</span>
              <span className="text-base sm:text-[14.5px] lg:text-[14px] xl:text-[15.5px] font-bold font-heading text-[#4CB28E] dark:text-[#62D2FB] mb-1 tracking-tight">{formatDisplayTime(nextBedtime, isEn)}</span>
              <span className="text-xs font-sans text-slate-500 overflow-hidden text-ellipsis">{isEn ? 'Recharge & recover' : 'Tái tạo năng lượng'}</span>
            </div>
          </div>
        )}
      </section>
      
      <div className="w-full max-w-[1100px] w-[90%] mx-auto pb-8">
        <HistoryCalendar language={language} />
      </div>

    </div>
  );
};

export default Dashboard;
