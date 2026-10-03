import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Moon, Coffee, CalendarDays } from 'lucide-react';

interface HistoryCalendarProps {
  language: 'en' | 'vi';
  currentTime?: Date;
}

interface DayData {
  sleepHours: number;
  sleepScore: number; // 0-100
  caffeineMg: number;
}

// Fetch REAL real-time data from user's current session + historical days
const getRealHistoryData = (): Record<string, DayData> => {
  const data: Record<string, DayData> = {};
  try {
    // 1. Load stored history from previous days
    const storedHistory = localStorage.getItem('owlup_history');
    if (storedHistory) {
      const parsed = JSON.parse(storedHistory);
      Object.assign(data, parsed);
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let totalCaf = 0;
    const cLog = localStorage.getItem('owlup_caffeine_log');
    if (cLog) {
      const parsed = JSON.parse(cLog);
      totalCaf = parsed.reduce((sum: number, item: any) => sum + (item.caffeineMg || 0), 0);
    }
    
    // Only record sleep if user actually applied a schedule today
    const hasAppliedSchedule = localStorage.getItem('owlup_schedule_applied') === 'true';
    let sleepHours = 0;
    if (hasAppliedSchedule) {
      const bed = localStorage.getItem('owlup_bedtime') || '23:00';
      const wake = localStorage.getItem('owlup_waketime') || '07:00';
      const [bh, bm] = bed.split(':').map(Number);
      const [wh, wm] = wake.split(':').map(Number);
      let sleepMins = (wh * 60 + wm) - (bh * 60 + bm);
      if (sleepMins < 0) sleepMins += 24 * 60;
      sleepHours = Number((sleepMins / 60).toFixed(1));
    }
    
    if (totalCaf > 0 || sleepHours > 0) {
      data[todayStr] = {
        sleepHours,
        sleepScore: sleepHours >= 7.5 ? 90 : sleepHours >= 6.5 ? 75 : 60,
        caffeineMg: totalCaf
      };
    }
  } catch(e) {}
  return data;
};

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({ language, currentTime }) => {
  const isEn = language === 'en';
  const getNow = () => currentTime || new Date();

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = getNow();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Ensure calendar automatically syncs with real-time month whenever component mounts or time updates
  useEffect(() => {
    const now = getNow();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [currentTime?.getFullYear(), currentTime?.getMonth()]);

  const realData = getRealHistoryData();
  const today = getNow();
  const isViewingCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();

  const daysOfWeekEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daysOfWeekVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const daysOfWeek = isEn ? daysOfWeekEn : daysOfWeekVi;

  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const daysInPrevMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() - 1);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCell = (dayNumber: number, isCurrentMonth: boolean) => {
    // Format date string for lookup
    const year = currentDate.getFullYear();
    const month = isCurrentMonth ? currentDate.getMonth() : (dayNumber > 15 ? currentDate.getMonth() - 1 : currentDate.getMonth() + 1);
    
    // Handle year rollover
    const actualDate = new Date(year, month, dayNumber);
    const dateStr = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    
    const data = isCurrentMonth ? realData[dateStr] : null;

    const isToday = isCurrentMonth &&
      today.getFullYear() === actualDate.getFullYear() &&
      today.getMonth() === actualDate.getMonth() &&
      today.getDate() === dayNumber;

    return (
      <div 
        key={`${month}-${dayNumber}`} 
        className={`min-h-[58px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-300 flex flex-col justify-between
          ${isCurrentMonth ? (isToday ? 'bg-[#ECFDF5] dark:bg-[#1E293B] border-[#4CB28E] dark:border-[#62D2FB] ring-2 ring-[#4CB28E]/40 dark:ring-[#62D2FB]/40 shadow-sm cursor-pointer' : 'bg-[#FFFFF8] dark:bg-[#1E293B] border-[#E5E7EB] dark:border-slate-700 hover:bg-[#FEF9C3] dark:hover:bg-[#FEF9C3]/10 hover:border-[#FDE047]/50 hover:shadow-md cursor-pointer') : 'bg-transparent border-transparent opacity-40'}`
        }
      >
        <div className="flex justify-between items-start">
          <span className={`text-xs sm:text-base font-semibold ${isToday ? 'text-white bg-[#4CB28E] dark:bg-[#62D2FB] dark:text-[#0F172A] w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs' : (isCurrentMonth ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 'text-slate-400/50')}`}>
            {dayNumber}
          </span>
          {isToday && (
            <span className="text-[9px] sm:text-[10px] font-bold text-[#4CB28E] dark:text-[#62D2FB] uppercase">
              {isEn ? 'Today' : 'Hôm nay'}
            </span>
          )}
        </div>
        
        {data && isCurrentMonth && (data.sleepHours > 0 || data.caffeineMg > 0) && (
          <div className="flex flex-col gap-0.5 sm:gap-1.5 mt-1 sm:mt-2">
            {data.sleepHours > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Moon className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${data.sleepScore >= 80 ? 'text-[#4CB28E] dark:text-[#62D2FB]' : data.sleepScore >= 60 ? 'text-[#F59E0B]' : 'text-red-500'}`} />
                  <span className="text-[10px] sm:text-xs font-sans font-normal text-slate-600 dark:text-slate-300">{data.sleepHours}h</span>
                </div>
              </div>
            )}
            {data.caffeineMg > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Coffee className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${data.caffeineMg <= 400 ? 'text-amber-700 dark:text-amber-500' : 'text-red-500'}`} />
                  <span className="text-[10px] sm:text-xs font-sans font-normal text-slate-600 dark:text-slate-300">{data.caffeineMg}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const cells = [];
  
  // Previous month padding
  for (let i = 0; i < firstDay; i++) {
    cells.push(renderCell(daysInPrevMonth - firstDay + i + 1, false));
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(renderCell(i, true));
  }
  
  // Next month padding (to complete the grid)
  const totalCells = cells.length;
  const remainingCells = 42 - totalCells; // 6 rows * 7 days
  for (let i = 1; i <= remainingCells; i++) {
    cells.push(renderCell(i, false));
  }

  return (
    <div className="bg-white dark:bg-[#233355] rounded-[24px] border border-[#E5E7EB] dark:border-slate-700 shadow-sm p-3.5 sm:p-6 md:p-8 mt-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <CalendarDays className="w-5 h-5 sm:w-7 sm:h-7 text-[#4CB28E] dark:text-[#62D2FB]" />
          <h2 className="text-lg sm:text-2xl font-serif font-bold text-[#1F2937] dark:text-white">
            {isEn ? "History & Trends" : "Lịch sử & Xu hướng"}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 self-center sm:self-auto">
          {!isViewingCurrentMonth && (
            <button
              onClick={() => {
                const now = getNow();
                setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full border border-[#4CB28E]/40 dark:border-[#62D2FB]/40 text-[#4CB28E] dark:text-[#62D2FB] hover:bg-[#4CB28E]/10 dark:hover:bg-[#62D2FB]/10 transition-colors font-medium cursor-pointer"
            >
              {isEn ? 'This Month' : 'Tháng này'}
            </button>
          )}
          <button onClick={handlePrevMonth} className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 cursor-pointer" aria-label="Previous Month">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm font-bold tracking-wide uppercase text-[#4CB28E] dark:text-[#62D2FB] min-w-[100px] sm:min-w-[120px] text-center">
            {isEn ? monthNamesEn[currentDate.getMonth()] : monthNamesVi[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 cursor-pointer" aria-label="Next Month">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells}
      </div>
    </div>
  );
};
