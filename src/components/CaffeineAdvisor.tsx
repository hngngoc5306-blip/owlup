import React, { useState, useEffect } from 'react';
import { Coffee, Plus, Trash2, Zap, Search } from 'lucide-react';
import { CaffeineItem, UserSettings, AppLanguage } from '../types';
import { TimePickerInput } from './TimePickerInput';
import { formatDisplayTime } from '../utils/timeFormat';

interface CaffeineAdvisorProps {
  isNight: boolean;
  language?: AppLanguage;
  loggedItems: CaffeineItem[];
  onUpdateLoggedItems: (items: CaffeineItem[]) => void;
  dailyLimitMg?: number;
  onNavigateToTimeline?: () => void;
  onNavigateToDashboard?: () => void;
  
  // Added from App.tsx injection
  targetBedtime?: string;
  wakeTime?: string;
  onUpdateBedtime?: (newBedtime: string, newWakeTime: string) => void;
  bedtimeThresholdMg?: number;
  onUpdateDailyLimit?: (limit: number) => void;
  initialRecoveryGoal?: string;
  onUpdateRecoveryGoal?: (goal: any) => void;
  onRemoveDrink?: (id: string) => void;
}

const DRINK_PRESETS = [
  { name: 'Green Tea / Oolong', nameVi: 'Trà xanh / Ô long', caffeineMg: 40, icon: '🍵' },
  { name: 'Milk Coffee / Latte', nameVi: 'Cà phê sữa / Latte', caffeineMg: 80, icon: '🥛' },
  { name: 'Black Coffee / Americano', nameVi: 'Cà phê đen / Americano', caffeineMg: 120, icon: '☕' },
  { name: 'Cold Brew / Espresso', nameVi: 'Cold Brew / Espresso', caffeineMg: 150, icon: '🧊' },
  { name: 'Peach Tea / Milk Tea', nameVi: 'Trà đào / Trà sữa', caffeineMg: 50, icon: '🍑' },
  { name: 'Energy Drink', nameVi: 'Nước tăng lực', caffeineMg: 160, icon: '⚡' },
];

const SIZE_PRESETS = [
  { label: 'Size S', volume: '250ml', multiplier: 0.8 },
  { label: 'Size M', volume: '350ml', multiplier: 1.0 },
  { label: 'Size L', volume: '500ml', multiplier: 1.5 },
];

export const estimateCaffeineFromDetails = (
  name: string,
  volumeMl: number
): number => {
  if (!name.trim()) return Math.round(volumeMl * 0.3); // default ~30mg per 100ml
  const lower = name.toLowerCase();

  // Rate in mg per 100ml or per standard serving
  // Espresso / Cold Brew / Phin đậm đặc
  if (lower.includes('espresso') || lower.includes('phin') || lower.includes('đen đá') || lower.includes('robusta')) {
    // Phin / Robusta: ~80mg per 100ml
    return Math.round((volumeMl / 100) * 75);
  }
  if (lower.includes('cold brew')) {
    // Cold Brew: ~55mg per 100ml
    return Math.round((volumeMl / 100) * 55);
  }
  if (lower.includes('cà phê đen') || lower.includes('black coffee') || lower.includes('americano')) {
    // Americano / Black coffee: ~35-40mg per 100ml
    return Math.round((volumeMl / 100) * 38);
  }
  if (lower.includes('sữa đá') || lower.includes('cà phê sữa') || lower.includes('bạc xỉu') || lower.includes('latte') || lower.includes('cappuccino') || lower.includes('mocha')) {
    // Milk coffee / Latte / Cappuccino: ~28mg per 100ml
    return Math.round((volumeMl / 100) * 28);
  }
  if (lower.includes('matcha')) {
    // Matcha: ~32mg per 100ml
    return Math.round((volumeMl / 100) * 32);
  }
  if (lower.includes('tăng lực') || lower.includes('energy drink') || lower.includes('red bull') || lower.includes('monster') || lower.includes('sting') || lower.includes('warrior')) {
    // Energy drinks: ~32mg per 100ml
    return Math.round((volumeMl / 100) * 32);
  }
  if (lower.includes('trà xanh') || lower.includes('green tea') || lower.includes('ô long') || lower.includes('oolong')) {
    // Green / Oolong tea: ~15mg per 100ml
    return Math.round((volumeMl / 100) * 15);
  }
  if (lower.includes('hồng trà') || lower.includes('black tea') || lower.includes('trà đào') || lower.includes('trà sữa') || lower.includes('milk tea') || lower.includes('boba') || lower.includes('trà')) {
    // Tea / Milk tea: ~14mg per 100ml
    return Math.round((volumeMl / 100) * 14);
  }
  if (lower.includes('cola') || lower.includes('coke') || lower.includes('pepsi')) {
    // Soft drinks: ~10mg per 100ml
    return Math.round((volumeMl / 100) * 10);
  }
  if (lower.includes('cacao') || lower.includes('chocolate') || lower.includes('socola')) {
    // Cocoa: ~6mg per 100ml
    return Math.round((volumeMl / 100) * 6);
  }
  if (lower.includes('decaf') || lower.includes('không caffeine')) {
    return Math.round((volumeMl / 100) * 1.5);
  }

  // Default coffee-based estimate
  return Math.round((volumeMl / 100) * 30);
};

export const getDrinkIcon = (itemOrName?: string | { name?: string; icon?: string }): string => {
  if (!itemOrName) return '☕';
  if (typeof itemOrName === 'object') {
    if (itemOrName.icon) return itemOrName.icon;
    itemOrName = itemOrName.name || '';
  }
  const nameLower = itemOrName.toLowerCase();
  if (nameLower.includes('trà xanh') || nameLower.includes('ô long') || nameLower.includes('green tea') || nameLower.includes('matcha')) {
    return '🍵';
  }
  if (nameLower.includes('cà phê sữa') || nameLower.includes('latte') || nameLower.includes('milk coffee')) {
    return '🥛';
  }
  if (nameLower.includes('cà phê đen') || nameLower.includes('americano') || nameLower.includes('black coffee')) {
    return '☕';
  }
  if (nameLower.includes('cold brew') || nameLower.includes('espresso')) {
    return '🧊';
  }
  if (nameLower.includes('trà đào') || nameLower.includes('trà sữa') || nameLower.includes('peach') || nameLower.includes('milk tea')) {
    return '🍑';
  }
  if (nameLower.includes('nước tăng lực') || nameLower.includes('tăng lực') || nameLower.includes('energy drink')) {
    return '⚡';
  }
  return '☕';
};

export const CaffeineAdvisor: React.FC<CaffeineAdvisorProps> = ({
  isNight,
  language = 'en',
  loggedItems = [],
  onUpdateLoggedItems,
  dailyLimitMg = 400,
  onNavigateToTimeline,
  targetBedtime = '23:00',
  wakeTime = '06:30',
  onUpdateBedtime,
  bedtimeThresholdMg = 25,
  onUpdateDailyLimit,
  initialRecoveryGoal,
  onUpdateRecoveryGoal,
  onRemoveDrink,
}) => {
  const isEn = language === 'en';
  // FDA safe upper ceiling is strictly 400mg daily for healthy adults
  const safeDailyLimitMg = Math.min(400, Math.max(50, dailyLimitMg));
  const currentTotal = loggedItems.reduce((sum, item) => sum + item.caffeineMg, 0);
  const percentage = Math.round((currentTotal / safeDailyLimitMg) * 100);
  const isOverLimit = percentage > 100;
  const excessPercent = Math.max(0, percentage - 100);
  const safePortionWidth = isOverLimit ? (100 / percentage) * 100 : percentage;
  const excessPortionWidth = isOverLimit ? (excessPercent / percentage) * 100 : 0;
  const remaining = safeDailyLimitMg - currentTotal;
  
  const cutoffAt = (() => {
    try {
      const s = targetBedtime;
      if (s) {
        let [h, m] = s.split(':').map(Number);
        h -= 10;
        if (h < 0) h += 24;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    } catch {}
    return '16:00';
  })();
  
  const effectiveWake = wakeTime || (() => {
    try { return localStorage.getItem('owlup_waketime') || '06:30'; } catch { return '06:30'; }
  })();

  const optimalCaffeineStart = (() => {
    try {
      const [h, m] = effectiveWake.split(':').map(Number);
      const total = (h * 60 + m + 90) % 1440;
      const sh = Math.floor(total / 60);
      const sm = total % 60;
      return `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
    } catch {
      return '08:00';
    }
  })();
  const [selectedDrink, setSelectedDrink] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [drinkTime, setDrinkTime] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSize, setCustomSize] = useState<string | null>(null); // 'S', 'M', 'L', 'custom', or null
  const [customVolumeMl, setCustomVolumeMl] = useState<string>('');
  const [customMg, setCustomMg] = useState('');
  const [isMgManualEdit, setIsMgManualEdit] = useState(false);
  const [isDismissedWarning, setIsDismissedWarning] = useState(false);

  // Automatically recalculate estimated caffeine when name or volume changes, unless manually overridden
  useEffect(() => {
    if (isCustom && !isMgManualEdit) {
      const vol = parseInt(customVolumeMl) || 0;
      if (vol > 0) {
        const estimated = estimateCaffeineFromDetails(customName, vol);
        setCustomMg(estimated > 0 ? estimated.toString() : '');
      } else {
        setCustomMg('');
      }
    }
  }, [customName, customVolumeMl, isCustom, isMgManualEdit]);

  // Reset dismissed warning whenever drink time changes
  useEffect(() => {
    setIsDismissedWarning(false);
  }, [drinkTime]);
  
  const parseMins = (t: string) => {
    try {
      if (!t) return 0;
      const isPM = /pm/i.test(t);
      const isAM = /am/i.test(t);
      const clean = t.replace(/[^0-9:]/g, '');
      const parts = clean.split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
      let h = parts[0];
      const m = parts[1];
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  const isTimeEntered = Boolean(drinkTime && drinkTime.includes(':') && drinkTime.trim().length >= 4);
  const drinkMins = isTimeEntered ? parseMins(drinkTime) : -1;
  const startMins = parseMins(optimalCaffeineStart);
  const cutoffMins = parseMins(cutoffAt);
  const wakeMins = parseMins(effectiveWake);

  // Too early: between waking up and 90 mins after waking up
  // Too late / close to bedtime: past cutoff time or during night before wake up
  let isTooEarly = false;
  let isTooLate = false;
  if (isTimeEntered) {
    if (drinkMins >= wakeMins && drinkMins < startMins) {
      isTooEarly = true;
    } else if (cutoffMins >= wakeMins) {
      if (drinkMins > cutoffMins || drinkMins < wakeMins) {
        isTooLate = true;
      }
    } else {
      if (drinkMins > cutoffMins && drinkMins < wakeMins) {
        isTooLate = true;
      }
    }
  }
  const isOutsideGoldenWindow = isTimeEntered && (isTooEarly || isTooLate);

  // Calculate delayed sleep hours for the warning message (Image 2)
  const delayedHours = (() => {
    try {
      if (!drinkTime || !targetBedtime) return '1.2';
      const [dh, dm] = drinkTime.split(':').map(Number);
      const [bh, bm] = targetBedtime.split(':').map(Number);
      let dMins = dh * 60 + dm;
      let bMins = bh * 60 + bm;
      if (bMins < 12 * 60) bMins += 24 * 60;
      if (dMins < 12 * 60 && bMins > 24 * 60) dMins += 24 * 60;
      let gapHours = (bMins - dMins) / 60;
      if (gapHours <= 0) gapHours = 0;
      
      let finalMg = 100;
      if (isCustom) {
        finalMg = parseInt(customMg) || 0;
      } else if (selectedDrink !== null && selectedSize !== null) {
        finalMg = Math.round(DRINK_PRESETS[selectedDrink].caffeineMg * (SIZE_PRESETS[selectedSize]?.multiplier || 1));
      }
      const threshold = bedtimeThresholdMg || 25;
      const requiredHours = finalMg > threshold ? 5 * (Math.log(finalMg / threshold) / Math.log(2)) : 0;
      const extra = requiredHours - gapHours;
      return extra > 0 ? (Math.round(extra * 10) / 10).toFixed(1) : '1.2';
    } catch {
      return '1.2';
    }
  })();

  const shouldShowWarning = isOutsideGoldenWindow && !isDismissedWarning;

  const handleJustDrank = () => {
    const now = new Date();
    setDrinkTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  const formatLogTime = (timestamp: Date | string) => {
    try {
      const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(d.getTime())) return '--:--';
      const hStr = d.getHours().toString().padStart(2, '0');
      const mStr = d.getMinutes().toString().padStart(2, '0');
      return formatDisplayTime(`${hStr}:${mStr}`, isEn);
    } catch {
      return '--:--';
    }
  };

  const handleLogDrink = () => {
    let finalName = '';
    let finalMg = 0;
    
    const drinkIdx = selectedDrink !== null ? selectedDrink : 0;
    const sizeIdx = selectedSize !== null ? selectedSize : 1;

    if (isCustom) {
      const vol = parseInt(customVolumeMl) || 0;
      const mg = parseInt(customMg) || 0;
      if (!customName.trim() || !customMg || mg <= 0) return;
      finalName = `${customName.trim()}${vol > 0 ? ` (${vol}ml)` : ''}`;
      finalMg = mg;
    } else {
      if (selectedDrink === null || selectedSize === null) return;
      const baseDrink = DRINK_PRESETS[drinkIdx];
      const size = SIZE_PRESETS[sizeIdx];
      finalMg = Math.round(baseDrink.caffeineMg * size.multiplier);
      finalName = `${isEn ? baseDrink.name : baseDrink.nameVi} (${size.label})`;
    }
    
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();

    if (drinkTime) {
      const isPM = /pm/i.test(drinkTime);
      const isAM = /am/i.test(drinkTime);
      const clean = drinkTime.replace(/[^0-9:]/g, '');
      const parts = clean.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        h = parts[0];
        m = parts[1];
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
      }
    }

    // We must pass a Date object, because App.tsx expects log.timestamp.getTime()
    const logDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    
    const drinkIcon = isCustom
      ? getDrinkIcon(customName)
      : DRINK_PRESETS[drinkIdx].icon;

    const newItem: CaffeineItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: finalName,
      caffeineMg: finalMg,
      timestamp: logDate,
      servingSize: isCustom ? (customVolumeMl ? `${customVolumeMl}ml` : '350ml') : (SIZE_PRESETS[sizeIdx] ? SIZE_PRESETS[sizeIdx].volume : '350ml'),
      category: isCustom ? 'custom' : (drinkIdx === 0 ? 'tea' : drinkIdx === 5 ? 'energy' : 'coffee'),
      icon: drinkIcon,
    };
    onUpdateLoggedItems([...loggedItems, newItem]);
    
    // Reset all choices 1, 2, 3 to empty so user can add fresh drink
    setIsCustom(false);
    setCustomName('');
    setCustomSize(null);
    setCustomVolumeMl('');
    setCustomMg('');
    setIsMgManualEdit(false);
    setSelectedDrink(null);
    setSelectedSize(null);
    setDrinkTime('');
  };

  const handleRemoveDrink = (id: string) => {
    if (onRemoveDrink) {
      onRemoveDrink(id);
    } else {
      onUpdateLoggedItems(loggedItems.filter(item => item.id !== id));
    }
  };

  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-8 sm:mb-12">
        {isEn ? "Optimize Today's Caffeine" : "Tối ưu hóa Caffeine hôm nay"}
      </h2>

      {/* TODAY'S STATUS */}
      <div className="bg-white dark:bg-[#233355] rounded-[28px] sm:rounded-[32px] border border-[#E5E7EB] dark:border-slate-700 shadow-sm p-6 sm:p-10 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[#4CB28E] dark:text-[#62D2FB] font-bold text-xl sm:text-2xl tracking-wide uppercase font-heading">
              {isEn ? "Today's Status" : "Trạng thái hôm nay"}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#fffff8] dark:bg-[#1E3A2F] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB]" />
          </div>
        </div>
        
        <div className="flex justify-between items-end mb-3.5">
          <span className="text-slate-700 dark:text-slate-300 text-base sm:text-lg font-semibold">
            {isEn ? `Caffeine Intake (Safe Limit: ${safeDailyLimitMg}mg):` : `Lượng caffeine đã nạp (Giới hạn an toàn: ${safeDailyLimitMg}mg):`}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-heading font-bold ${isOverLimit ? 'text-[#C10007] dark:text-[#F87171]' : 'text-[#4CB28E] dark:text-[#62D2FB]'}`}>
              {percentage}%
            </span>
            <span className="text-lg sm:text-xl font-semibold text-slate-500 dark:text-slate-400">
              ({currentTotal}mg)
            </span>
          </div>
        </div>
        
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-2.5 overflow-hidden flex">
          {/* 100% Safe Limit Portion */}
          <div 
            className={`h-full bg-[#4CB28E] dark:bg-[#62D2FB] ${isOverLimit ? 'border-r-2 border-white dark:border-[#233355]' : 'rounded-full'} transition-all duration-1000`}
            style={{ width: `${safePortionWidth}%` }}
            title={isEn ? `Safe Limit: 100% (${safeDailyLimitMg}mg)` : `Ngưỡng an toàn: 100% (${safeDailyLimitMg}mg)`}
          />
          {/* Excess Portion */}
          {isOverLimit && (
            <div 
              className="h-full bg-[#C10007] dark:bg-[#C10007] rounded-r-full transition-all duration-1000"
              style={{ width: `${excessPortionWidth}%` }}
              title={isEn ? `Excess: +${excessPercent}% (${currentTotal - safeDailyLimitMg}mg)` : `Vượt ngưỡng: +${excessPercent}% (${currentTotal - safeDailyLimitMg}mg)`}
            />
          )}
        </div>

        {isOverLimit && (
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mt-2.5 mb-3.5">
            <div className="flex items-center gap-1.5 text-[#4CB28E] dark:text-[#62D2FB]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] inline-block"></span>
              <span>{isEn ? `100% Safe limit (${safeDailyLimitMg}mg)` : `100% An toàn (${safeDailyLimitMg}mg)`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#C10007] dark:text-[#F87171]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C10007] inline-block animate-pulse"></span>
              <span>{isEn ? `+${excessPercent}% Excess (+${currentTotal - safeDailyLimitMg}mg)` : `+${excessPercent}% Thừa (+${currentTotal - safeDailyLimitMg}mg)`}</span>
            </div>
          </div>
        )}

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {safeDailyLimitMg >= 400
            ? (isEn 
                ? `The FDA recommends a max safe limit of 400mg daily. Your limit is personalized to the maximum safe cap of ${safeDailyLimitMg}mg based on your tolerance.` 
                : `FDA khuyến cáo mức an toàn tối đa là 400mg/ngày. Giới hạn của bạn được cá nhân hóa ở mức trần an toàn ${safeDailyLimitMg}mg dựa trên độ dung nạp.`)
            : (isEn 
                ? `The FDA recommends max 400mg daily. Your limit is personalized to ${safeDailyLimitMg}mg based on your tolerance.` 
                : `FDA khuyến cáo mức an toàn tối đa là 400mg/ngày. Giới hạn của bạn được cá nhân hóa ở mức ${safeDailyLimitMg}mg dựa trên độ dung nạp.`)}
        </p>
        
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
          <div>
            <div className={`text-xs sm:text-sm font-bold mb-1.5 uppercase tracking-wider ${isOverLimit ? 'text-[#C10007] dark:text-[#F87171]' : 'text-slate-400'}`}>
              {isOverLimit 
                ? (isEn ? "Over Limit" : "Mức vượt ngưỡng") 
                : (isEn ? "Can Still Consume" : "Có thể nạp thêm")}
            </div>
            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
              <span className={`text-2xl sm:text-3xl font-heading font-bold tabular-nums ${isOverLimit ? 'text-[#C10007] dark:text-[#F87171]' : 'text-[#4CB28E] dark:text-[#62D2FB]'}`}>
                {isOverLimit 
                  ? `+${currentTotal - safeDailyLimitMg}mg` 
                  : `${remaining}mg`}
              </span>
              {!isOverLimit && remaining > 0 && (() => {
                // Base standard cup of coffee (size M black coffee ~120mg, or latte ~80mg)
                const cups = (remaining / 120);
                const roundedCups = cups >= 1 ? (Math.round(cups * 10) / 10).toString().replace('.0', '') : '< 1';
                return (
                  <span className="text-base sm:text-lg md:text-xl font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {isEn ? `(~${roundedCups} cups of coffee)` : `(~${roundedCups} cốc cà phê)`}
                  </span>
                );
              })()}
              {!isOverLimit && remaining === 0 && (
                <span className="text-base sm:text-lg font-semibold text-slate-400 whitespace-nowrap">
                  {isEn ? "(0 cups left)" : "(Đã chạm ngưỡng)"}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{isEn ? "Cutoff Time" : "Giờ ngừng uống"}</div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB]">{formatDisplayTime(cutoffAt, isEn)}</div>
          </div>
        </div>
      </div>

      {/* LOG A DRINK */}
      <div className="bg-white dark:bg-[#233355] rounded-[28px] sm:rounded-[32px] border border-[#E5E7EB] dark:border-slate-700 shadow-sm p-6 sm:p-10 mb-8 relative">
        <div className="absolute top-6 sm:top-10 right-6 sm:right-10 w-10 h-10 rounded-full bg-[#fffff8] dark:bg-[#1E3A2F] flex items-center justify-center">
          <Coffee className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB]" />
        </div>
        <h3 className="text-[#4CB28E] dark:text-[#62D2FB] font-bold text-xl sm:text-2xl tracking-wide uppercase font-heading mb-2">
          {isEn ? "Log A Drink" : "Ghi nhận đồ uống"}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-1.5 font-medium">
          <span>🌿</span>
          <span>
            {isEn 
              ? "Caffeine tracking is recorded for today's active 24h recovery cycle." 
              : "Ghi nhận caffeine áp dụng cho chu kỳ phục hồi 24h của ngày hôm nay."}
          </span>
        </p>

        {!isCustom ? (
        <div className="mb-7 animate-fade-in">
          <p className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white mb-3.5">1. {isEn ? "Select Drink:" : "Chọn đồ uống:"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {DRINK_PRESETS.map((drink, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDrink(idx)}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 ease-out cursor-pointer ${
                  selectedDrink === idx 
                    ? 'bg-[#fffff8] dark:bg-[#233355] border-[#4CB28E] dark:border-[#62D2FB] shadow-md ring-1 ring-[#4CB28E]/50 dark:ring-[#62D2FB]/50 transform scale-[1.02]' 
                    : 'bg-[#F8FAFC] dark:bg-[#233355] border-slate-100 hover:bg-white hover:border-[#4CB28E]/40 dark:border-[#62D2FB]/40 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2.5">{drink.icon}</div>
                <div className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-white">{isEn ? drink.name : drink.nameVi}</div>
              </button>
            ))}
          </div>
        </div>
        ) : (
        <div className="mb-7 animate-fade-in border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-6 bg-[#F8FAFC] dark:bg-[#233355]">
          <div className="flex justify-between items-center mb-4">
             <p className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white">1. {isEn ? "Drink Details:" : "Chi tiết đồ uống:"}</p>
             <button 
               onClick={() => {
                 setIsCustom(false);
                 setCustomName('');
                 setCustomSize(null);
                 setCustomVolumeMl('');
                 setCustomMg('');
                 setIsMgManualEdit(false);
               }} 
               className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 mb-1.5 block">{isEn ? "Drink Name" : "Tên đồ uống"}</label>
              <input 
                type="text" 
                value={customName} 
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setIsMgManualEdit(false);
                }} 
                placeholder={isEn ? "e.g. Cold Brew, Matcha Latte, Americano..." : "VD: Cold Brew, Cà phê sữa, Trà xanh..."} 
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-base focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#233355] text-[#1F2937] dark:text-white"
              />
            </div>

            {/* Cup Size & Volume selector */}
            <div>
              <label className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 mb-1.5 block">
                {isEn ? "Cup Size & Volume" : "Kích cỡ & Thể tích cốc"}
              </label>
              <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                {[
                  { key: 'S', label: 'Size S', vol: 250 },
                  { key: 'M', label: 'Size M', vol: 350 },
                  { key: 'L', label: 'Size L', vol: 500 },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setCustomSize(preset.key);
                      setCustomVolumeMl(preset.vol.toString());
                      setIsMgManualEdit(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      customSize === preset.key
                        ? 'bg-[#E6F8F0] dark:bg-[#62D2FB]/20 border-[#4CB28E] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] font-bold shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-[#4CB28E]/40'
                    }`}
                  >
                    <div className="text-sm sm:text-base font-bold">{preset.label}</div>
                    <div className="text-xs opacity-75">{preset.vol}ml</div>
                  </button>
                ))}
              </div>

              {/* Custom ml input */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                  {isEn ? "Or exact volume:" : "Hoặc thể tích chính xác:"}
                </span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5">
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    step={10}
                    value={customVolumeMl}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomVolumeMl(v);
                      setCustomSize('custom');
                      setIsMgManualEdit(false);
                    }}
                    className="w-16 sm:w-20 text-center font-bold text-sm sm:text-base outline-none bg-transparent text-[#1F2937] dark:text-white"
                  />
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">ml</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 block">
                  {isEn ? "Estimated Caffeine (mg)" : "Lượng Caffeine ước tính (mg)"}
                </label>
                {isMgManualEdit && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsMgManualEdit(false);
                      const vol = parseInt(customVolumeMl) || 0;
                      if (vol > 0) {
                        const estimated = estimateCaffeineFromDetails(customName, vol);
                        setCustomMg(estimated > 0 ? estimated.toString() : '');
                      } else {
                        setCustomMg('');
                      }
                    }}
                    className="text-xs text-[#007b4d] dark:text-[#62D2FB] font-semibold hover:underline cursor-pointer"
                  >
                    {isEn ? "Recalculate" : "Tính lại tự động"}
                  </button>
                )}
              </div>
              <input 
                type="number" 
                value={customMg} 
                onChange={(e) => {
                  setCustomMg(e.target.value);
                  setIsMgManualEdit(true);
                }} 
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-base font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB] focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#233355]"
              />
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                ✨ {isEn ? "Smart estimate based on name. Feel free to adjust!" : "Ước tính thông minh dựa trên tên & thể tích. Bạn có thể tự do điều chỉnh!"}
              </p>
            </div>
          </div>
        </div>
        )}

        {!isCustom && (
        <div className="mb-7 animate-fade-in">
          <p className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white mb-3.5">2. {isEn ? "Serving Size:" : "Kích cỡ:"}</p>
          <div className="flex gap-3.5">
            {SIZE_PRESETS.map((size, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSize(idx)}
                className={`flex-1 py-3.5 sm:py-4 px-3 rounded-2xl border transition-all duration-300 ease-out cursor-pointer text-center ${
                  selectedSize === idx
                    ? 'bg-[#fffff8] dark:bg-[#233355] border-[#4CB28E] dark:border-[#62D2FB] shadow-md ring-1 ring-[#4CB28E]/50 dark:ring-[#62D2FB]/50 transform scale-[1.02]'
                    : 'bg-[#F8FAFC] dark:bg-[#233355] border-slate-100 hover:bg-white hover:border-[#4CB28E]/40 dark:border-[#62D2FB]/40 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white">{size.label}</div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{size.volume}</div>
              </button>
            ))}
          </div>
        </div>
        )}

        <div className="mb-7">
          <p className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white mb-3.5">3. {isEn ? "Time:" : "Thời gian:"}</p>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4">
            <div className="w-44 sm:w-48">
              <TimePickerInput
                value={drinkTime}
                onChange={setDrinkTime}
                isEn={isEn}
                placeholder="--:--"
              />
            </div>
            <button 
              onClick={handleJustDrank}
              className="px-5 sm:px-6 py-3 rounded-xl bg-[#FDE047]/30 text-[#b45309] dark:text-[#FCD34D] font-bold text-sm sm:text-base hover:bg-[#FDE047]/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap text-center shrink-0"
            >
              {isEn ? "Just Drank" : "Vừa uống xong"}
            </button>
          </div>

          {/* Gợi ý khung giờ nạp caffeine tối ưu siêu ngắn gọn */}
          <div className="bg-[#FEF3C7]/80 dark:bg-[#78350F]/20 border border-[#FDE68A] dark:border-[#92400E]/30 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-300">
            <span className="text-lg shrink-0">☕</span>
            <div className="flex flex-wrap items-center gap-x-1.5">
              <span className="font-semibold text-[#92400E] dark:text-[#FCD34D] whitespace-nowrap">
                {isEn ? "Optimal Window: " : "Khung giờ vàng: "}
              </span>
              <strong className="font-bold text-[#92400E] dark:text-[#FCD34D] whitespace-nowrap inline-flex items-baseline">
                <span>{formatDisplayTime(optimalCaffeineStart, isEn)}</span>
                <span className="mx-1 font-normal">-</span>
                <span>{formatDisplayTime(cutoffAt, isEn)}</span>
              </strong>
            </div>
          </div>
        </div>

        {shouldShowWarning && (
          <div className="mb-5 p-5 rounded-2xl bg-[#FEF5F5] dark:bg-[#7F1D1D]/20 border border-[#FCA5A5]/80 dark:border-[#991B1B]/40 flex flex-col gap-3.5 animate-shake">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl shrink-0">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-[#C10007] dark:text-[#F87171] text-base sm:text-lg mb-1.5">
                  {isTooEarly
                    ? (isEn ? 'Too Early for Caffeine' : 'Uống Caffeine quá sớm')
                    : (isEn ? 'Too Close to Bedtime' : 'Quá gần giờ đi ngủ')}
                </div>
                <div className="text-sm sm:text-base text-[#C10007] dark:text-[#F87171] leading-relaxed font-normal mb-4">
                  {isTooEarly
                    ? (isEn 
                        ? `Consuming caffeine within 90 minutes of waking up can disrupt your cortisol balance.` 
                        : `Nạp caffeine trước 90 phút sau khi thức dậy có thể làm gián đoạn cân bằng cortisol tự nhiên.`)
                    : (isEn 
                        ? `Logging this drink now will delay your sleep by ~${delayedHours} hours to clear the caffeine.` 
                        : `Nạp đồ uống này bây giờ sẽ đẩy lùi giờ ngủ của bạn thêm ~${delayedHours} tiếng để đào thải hết caffeine.`)}
                </div>

                {/* Câu hỏi xác nhận tiếp tục */}
                <div className="pt-3 border-t border-[#FCA5A5]/50 dark:border-[#991B1B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm sm:text-base font-bold text-[#C10007] dark:text-[#FCA5A5]">
                    {isEn ? "Do you want to continue consuming this drink?" : "Bạn có tiếp tục dùng đồ uống hay không?"}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleLogDrink();
                        setIsDismissedWarning(false);
                      }}
                      disabled={
                        !drinkTime || 
                        (isCustom ? (!customName.trim() || !customMg || (parseInt(customMg) || 0) <= 0) : (selectedDrink === null || selectedSize === null))
                      }
                      className="px-7 py-2.5 rounded-xl bg-[#C10007] hover:bg-[#A30006] text-white font-bold text-sm sm:text-base transition-all shadow-sm hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                      {isEn ? "Yes" : "Có"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDismissedWarning(true)}
                      className="px-7 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#C10007]/30 dark:border-[#C10007]/50 text-[#C10007] dark:text-[#FCA5A5] hover:bg-[#FEF5F5] dark:hover:bg-[#7F1D1D]/30 font-bold text-sm sm:text-base transition-colors cursor-pointer"
                    >
                      {isEn ? "No" : "Không"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!shouldShowWarning && (
          <button 
            onClick={() => {
              if (isOutsideGoldenWindow && isDismissedWarning) {
                // If warning was previously dismissed and user still clicks log, log the drink
                handleLogDrink();
                setIsDismissedWarning(false);
              } else if (isOutsideGoldenWindow) {
                setIsDismissedWarning(false);
              } else {
                handleLogDrink();
              }
            }}
            disabled={
              !drinkTime || 
              (isCustom ? (!customName.trim() || !customMg || (parseInt(customMg) || 0) <= 0) : (selectedDrink === null || selectedSize === null))
            }
            className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none rounded-2xl py-4 text-lg font-bold transition-all duration-300 mb-3.5 shadow-md cursor-pointer"
          >
            {isEn ? "Log this Drink" : "Ghi nhận ly này"}
          </button>
        )}
        {!isCustom && (
        <button 
          onClick={() => {
            setIsCustom(true);
            setCustomName('');
            setCustomSize(null);
            setCustomVolumeMl('');
            setCustomMg('');
            setIsMgManualEdit(false);
          }} 
          className="w-full bg-white dark:bg-transparent border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-[#4CB28E] dark:hover:text-[#62D2FB] hover:border-[#4CB28E] dark:hover:border-[#62D2FB] hover:bg-[#4CB28E]/5 dark:hover:bg-[#62D2FB]/5 hover:shadow-sm hover:-translate-y-0.5 rounded-2xl py-3.5 text-base sm:text-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> {isEn ? "Add Custom Drink" : "Thêm đồ uống tùy chỉnh"}
        </button>
        )}
      </div>

      {/* TODAY'S LOG */}
      <div className="bg-white dark:bg-[#233355] rounded-[28px] sm:rounded-[32px] border border-[#E5E7EB] dark:border-slate-700 shadow-sm p-6 sm:p-10">
        <h3 className="text-[#4CB28E] dark:text-[#62D2FB] font-bold text-xl sm:text-2xl tracking-wide uppercase font-heading mb-5">
          {isEn ? `Today's Log (${loggedItems.length})` : `Đã uống hôm nay (${loggedItems.length})`}
        </h3>
        
        <div className="space-y-3.5 mb-7">
          {loggedItems.length === 0 ? (
            <p className="text-base sm:text-lg text-slate-500 italic py-6">
              {isEn ? "No drinks logged yet today." : "Chưa có đồ uống nào được ghi nhận hôm nay."}
            </p>
          ) : (
            loggedItems.map(log => (
              <div key={log.id} className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#233355]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center text-2xl shrink-0">
                    {log.icon || getDrinkIcon(log.name)}
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-white flex items-center gap-2">
                      {log.name} <span className="text-slate-400 font-normal text-sm sm:text-base">{formatLogTime(log.timestamp)}</span>
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#4CB28E] dark:text-[#62D2FB]">{log.caffeineMg}mg</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveDrink(log.id)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all transform hover:scale-110 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="flex justify-end pt-2">
          <button 
            onClick={onNavigateToTimeline}
            className="px-7 py-3 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] font-bold text-base flex items-center gap-2 transition-all shadow-md shadow-[#4CB28E]/20 dark:shadow-[#62D2FB]/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{isEn ? "Open Full Timeline" : "Mở Lộ trình chi tiết"}</span>
            <span className="font-normal text-lg leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default CaffeineAdvisor;
