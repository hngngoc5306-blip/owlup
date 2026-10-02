import React, { useState, useEffect } from 'react';
import { UserProfile, AppLanguage } from '../types';
import { CheckCircle2, ArrowRight, Plus, ArrowLeft, Trash2, Edit2, AlertCircle, X, Calendar, Clock, Sparkles, Moon, Sunrise } from 'lucide-react';
import { formatDisplayTime } from '../utils/timeFormat';
import { TimePickerInput } from './TimePickerInput';

interface RecoveryPlannerProps {
  isNight: boolean;
  language?: AppLanguage;
  userProfile?: UserProfile | null;
  bedtime?: string;
  wakeTime?: string;
  totalSleepHours?: string;
  plannedNap?: { start: string; end: string; duration: number };
  commitments?: { title: string; start: string; end: string }[];
  onApplySchedule: (bedtime: string, wakeTime: string, hours: string, napStart?: string, napDuration?: string) => void;
  onUpdateCommitments?: (commitments: any[]) => void;
  onNavigateToTimeline?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToCaffeine?: () => void;
}

export const RecoveryPlanner: React.FC<RecoveryPlannerProps> = ({
  isNight,
  language = 'en',
  userProfile,
  bedtime = '22:30',
  wakeTime = '06:30',
  totalSleepHours = '8.0',
  plannedNap,
  commitments: commitmentsProp = [],
  onApplySchedule,
  onUpdateCommitments,
  onNavigateToDashboard,
  onNavigateToCaffeine,
}) => {
  const isEn = language === 'en';
  
  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Check same-day validity (thông tin được giữ nguyên đến hết 24h cùng ngày)
  const isScheduleAppliedToday = (() => {
    try {
      const todayStr = getTodayDateStr();
      const savedDate = localStorage.getItem('owlup_schedule_date');
      if (savedDate && savedDate !== todayStr) {
        // Hết 24h ngày hôm trước -> Reset cho ngày mới
        localStorage.removeItem('owlup_commitments');
        localStorage.removeItem('owlup_planned_nap');
        localStorage.removeItem('owlup_schedule_applied');
        localStorage.setItem('owlup_schedule_date', todayStr);
        return false;
      } else if (!savedDate) {
        localStorage.setItem('owlup_schedule_date', todayStr);
      }
      return localStorage.getItem('owlup_schedule_applied') === 'true';
    } catch {
      return false;
    }
  })();

  // Check if user has tomorrow's schedule saved
  const hasTomorrowSavedSchedule = (() => {
    try {
      return Boolean(localStorage.getItem('owlup_tomorrow_schedule'));
    } catch {
      return false;
    }
  })();

  // Check if user is on Day 1 (brand new user who hasn't experienced a rollover from tomorrow)
  const isDayOneUser = (() => {
    try {
      if (localStorage.getItem('owlup_has_rolled_over') === 'true') return false;
      if (localStorage.getItem('owlup_schedule_rolled_from_tomorrow') === 'true') return false;
      const rawHist = localStorage.getItem('owlup_history');
      if (rawHist) {
        const hist = JSON.parse(rawHist);
        if (Object.keys(hist).length > 0) return false;
      }
      return true;
    } catch {
      return false;
    }
  })();

  const isRolledFromTomorrow = (() => {
    try {
      return localStorage.getItem('owlup_schedule_rolled_from_tomorrow') === 'true';
    } catch {
      return false;
    }
  })();

  // Tomorrow-specific states initialized at top
  const [tomorrowPredictedBedtime, setTomorrowPredictedBedtime] = useState(() => {
    try {
      return localStorage.getItem('owlup_tomorrow_predicted_bedtime') || '23:00';
    } catch {
      return '23:00';
    }
  });

  const [tomorrowSavedData, setTomorrowSavedData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('owlup_tomorrow_schedule');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Time-Aware Context (Threshold: 20:00 / 8 PM):
  // - Morning to 19:59 (< 20:00): Focus on TODAY (enter today's busy hours to optimize real schedule).
  // - 20:00 onwards (>= 20:00 / night): Focus on TOMORROW (wind-down window, prep ahead for day 2).
  const currentHour = new Date().getHours();
  const isNightWindDown = currentHour >= 20 || currentHour < 4;

  const isTodayScheduleSaved = isScheduleAppliedToday || localStorage.getItem('owlup_schedule_applied') === 'true';
  const isTomorrowScheduleSaved = Boolean(tomorrowSavedData || localStorage.getItem('owlup_tomorrow_schedule'));

  /**
   * Resolves the correct planning mode based on:
   * 1. If it's nighttime (>= 20:00) and no tomorrow schedule → 'tomorrow'
   * 2. If it's daytime (< 20:00) and no tomorrow schedule → ALWAYS 'today'
   *    (ignore any stale 'tomorrow' saved in localStorage)
   * 3. Otherwise respect the saved mode (user may have explicitly opened tomorrow tab)
   */
  const resolveInitialMode = (): 'today' | 'tomorrow' => {
    const savedMode = localStorage.getItem('owlup_planning_mode') as 'today' | 'tomorrow' | null;
    if (isNightWindDown && !isTomorrowScheduleSaved) return 'tomorrow';
    // Before 20:00 with no tomorrow schedule → always start on today
    if (!isNightWindDown && savedMode === 'tomorrow' && !isTomorrowScheduleSaved) return 'today';
    if (savedMode === 'tomorrow' || savedMode === 'today') return savedMode;
    return isNightWindDown ? 'tomorrow' : 'today';
  };

  // Active Tab state ('today' | 'tomorrow'):
  const [activePlannerTab, setActivePlannerTab] = useState<'today' | 'tomorrow'>(resolveInitialMode);

  const [planningMode, setPlanningMode] = useState<'today' | 'tomorrow'>(resolveInitialMode);

  // Step states:
  // 1: Busy commitments
  // 2: Recovery Goal selection
  // 3: Recommended recovery routine & caffeine curfew (Image 2)
  // 4: Flexible customization
  // 5: Schedule applied success
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(() => {
    try {
      const mode = resolveInitialMode();
      
      if (mode === 'tomorrow') {
        const savedTomorrow = localStorage.getItem('owlup_tomorrow_schedule');
        if (savedTomorrow) return 3; // Saved tomorrow card
        const savedTomorrowComms = localStorage.getItem('owlup_tomorrow_commitments');
        if (savedTomorrowComms && JSON.parse(savedTomorrowComms).length > 0) return 2; // Goal
        return 1; // Step 1: Input tomorrow's busy hours
      }

      if (mode === 'today') {
        const savedTodayApplied = localStorage.getItem('owlup_schedule_applied') === 'true' || isScheduleAppliedToday;
        if (savedTodayApplied) return 3; // Already configured today
        // If before 20:00 and not configured yet: prompt user to enter busy hours today
        if (!isNightWindDown) {
          const savedTodayComms = localStorage.getItem('owlup_commitments');
          if (savedTodayComms && JSON.parse(savedTodayComms).length > 0) return 2;
          return 1; // Step 1: Enter today's busy hours
        }
        // If after 20:00 and user checks today tab: directly display tonight's recommended bedtime card!
        return 3;
      }
    } catch {}
    return 1;
  });

  const [isTomorrowSavedBanner, setIsTomorrowSavedBanner] = useState(false);
  const [isTodaySavedBanner, setIsTodaySavedBanner] = useState(false);
  
  // Selected recovery goal: isolated for tomorrow and today
  const [selectedGoal, setSelectedGoal] = useState<'healthy_balanced' | 'max_productivity' | 'catch_up' | 'night_owl' | null>(() => {
    try {
      const mode = (isNightWindDown && !isTomorrowScheduleSaved)
        ? 'tomorrow'
        : (localStorage.getItem('owlup_planning_mode') || (isNightWindDown ? 'tomorrow' : 'today'));
      const goalKey = mode === 'tomorrow' ? 'owlup_tomorrow_recovery_goal' : 'owlup_recovery_goal';
      const savedGoal = localStorage.getItem(goalKey);
      if (savedGoal && ['healthy_balanced', 'max_productivity', 'catch_up', 'night_owl'].includes(savedGoal)) {
        return savedGoal as any;
      }
      if (mode === 'today') {
        return userProfile?.energyCrave === 'productivity' ? 'max_productivity' : 'healthy_balanced';
      }
    } catch {}
    return null;
  });

  // Step 1 states with strict storage separation
  const [isAdding, setIsAdding] = useState(false);
  const [commitments, setCommitments] = useState<{title: string, start: string, end: string}[]>(() => {
    try {
      const mode = (isNightWindDown && !isTomorrowScheduleSaved)
        ? 'tomorrow'
        : (localStorage.getItem('owlup_planning_mode') || (isNightWindDown ? 'tomorrow' : 'today'));
      if (mode === 'tomorrow') {
        const savedTomorrow = localStorage.getItem('owlup_tomorrow_commitments');
        if (savedTomorrow) return JSON.parse(savedTomorrow);
        return [];
      } else {
        const saved = localStorage.getItem('owlup_commitments');
        if (saved) return JSON.parse(saved);
        if (commitmentsProp && commitmentsProp.length > 0) return commitmentsProp;
        return [];
      }
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Customization states (Step 4) with LocalStorage persistence
  const [customBedtime, setCustomBedtime] = useState(() => {
    return bedtime || (() => {
      try { return localStorage.getItem('owlup_bedtime') || '22:30'; } catch { return '22:30'; }
    })();
  });
  const [customWakeTime, setCustomWakeTime] = useState(() => {
    return wakeTime || (() => {
      try { return localStorage.getItem('owlup_waketime') || '06:30'; } catch { return '06:30'; }
    })();
  });
  const [napStart, setNapStart] = useState(() => {
    return plannedNap?.start || (() => {
      try {
        const p = localStorage.getItem('owlup_planned_nap');
        if (p) {
          const parsed = JSON.parse(p);
          if (parsed.start) return parsed.start;
        }
      } catch {}
      return '12:30';
    })();
  });
  const [napDuration, setNapDuration] = useState(() => {
    return plannedNap?.duration ? plannedNap.duration.toString() : (() => {
      try {
        const p = localStorage.getItem('owlup_planned_nap');
        if (p) {
          const parsed = JSON.parse(p);
          if (parsed.duration) return parsed.duration.toString();
        }
      } catch {}
      return '20';
    })();
  });
  const [hasAppliedOptimal, setHasAppliedOptimal] = useState(false);
  const [showNapWarning, setShowNapWarning] = useState(false);

  // Keep tomorrowSavedData fresh on mount or step/tab changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('owlup_tomorrow_schedule');
      setTomorrowSavedData(saved ? JSON.parse(saved) : null);
    } catch {
      setTomorrowSavedData(null);
    }
  }, [step, activePlannerTab]);

  // Tab switcher handler
  const handleSwitchTab = (newTab: 'today' | 'tomorrow') => {
    setActivePlannerTab(newTab);
    setPlanningMode(newTab);
    setIsTomorrowSavedBanner(false);
    setIsTodaySavedBanner(false);
    try {
      localStorage.setItem('owlup_planning_mode', newTab);
    } catch {}

    if (newTab === 'tomorrow') {
      const savedTomorrow = localStorage.getItem('owlup_tomorrow_schedule');
      if (savedTomorrow) {
        try {
          const parsed = JSON.parse(savedTomorrow);
          setTomorrowSavedData(parsed);
          if (parsed.bedtimeTonight) setCustomBedtime(parsed.bedtimeTonight);
          if (parsed.wakeTimeTomorrow) setCustomWakeTime(parsed.wakeTimeTomorrow);
          if (parsed.napTomorrowStart) setNapStart(parsed.napTomorrowStart);
          if (parsed.napTomorrowDuration !== undefined) setNapDuration(parsed.napTomorrowDuration.toString());
          if (parsed.goal) setSelectedGoal(parsed.goal);
          if (parsed.commitments) setCommitments(parsed.commitments);
        } catch {}
        // ALWAYS DIRECTLY DISPLAY IMAGE 2 (STEP 3) FOR CONFIGURED TOMORROW SCHEDULE!
        setStep(3);
        return;
      }

      // If no full schedule yet, check commitments and goal
      const savedTomorrowComms = localStorage.getItem('owlup_tomorrow_commitments');
      const savedTomorrowGoal = localStorage.getItem('owlup_tomorrow_recovery_goal');
      if (savedTomorrowGoal) {
        setSelectedGoal(savedTomorrowGoal as any);
      } else {
        setSelectedGoal(null);
      }

      if (savedTomorrowComms) {
        try {
          const parsedComms = JSON.parse(savedTomorrowComms);
          if (Array.isArray(parsedComms) && parsedComms.length > 0) {
            setCommitments(parsedComms);
            setStep(2); // Jump straight to Goal selection
            return;
          }
        } catch {}
      }

      setCommitments([]);
      setStep(1);
    } else {
      // Today tab
      const activeBed = bedtime || localStorage.getItem('owlup_bedtime') || userProfile?.usualBedtime || '22:30';
      const activeWake = wakeTime || localStorage.getItem('owlup_waketime') || '06:30';
      setCustomBedtime(activeBed);
      setCustomWakeTime(activeWake);

      let napObj = plannedNap;
      if (!napObj) {
        try {
          const p = localStorage.getItem('owlup_planned_nap');
          if (p) napObj = JSON.parse(p);
        } catch {}
      }
      if (napObj && napObj.start && napObj.duration > 0) {
        setNapStart(napObj.start);
        setNapDuration(napObj.duration.toString());
      } else {
        setNapStart(napObj?.start || '12:30');
        setNapDuration('0');
      }

      const savedTodayComms = localStorage.getItem('owlup_commitments');
      if (savedTodayComms) {
        try {
          setCommitments(JSON.parse(savedTodayComms));
        } catch {
          setCommitments([]);
        }
      } else if (commitmentsProp && commitmentsProp.length > 0) {
        setCommitments(commitmentsProp);
      } else {
        setCommitments([]);
      }

      const savedTodayGoal = localStorage.getItem('owlup_recovery_goal');
      if (savedTodayGoal) {
        setSelectedGoal(savedTodayGoal as any);
      } else {
        setSelectedGoal(userProfile?.energyCrave === 'productivity' ? 'max_productivity' : 'healthy_balanced');
      }

      setHasAppliedOptimal(false);
      const savedTodayApplied = localStorage.getItem('owlup_schedule_applied') === 'true' || isScheduleAppliedToday;
      if (savedTodayApplied) {
        setStep(3);
      } else {
        const currentH = new Date().getHours();
        if (currentH >= 20 || currentH < 4) {
          // After 20:00: show Step 3 recommendation directly for tonight's bedtime
          setStep(3);
        } else {
          // Before 20:00: guide user to enter busy hours today to optimize real schedule
          if (savedTodayComms) {
            try {
              if (JSON.parse(savedTodayComms).length > 0) {
                setStep(2);
                return;
              }
            } catch {}
          }
          setStep(1);
        }
      }
    }
  };

  React.useEffect(() => {
    if (commitmentsProp && commitmentsProp.length > 0) {
      setCommitments(commitmentsProp);
    }
  }, [commitmentsProp]);

  // ==========================================
  // HELPERS & LIVE SCORE CALCULATION
  // ==========================================
  const parseMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  
  const formatMins = (m: number) => {
    const total = (Math.round(m) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60);
    const mins = total % 60;
    return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getShiftMins = (m1: number, m2: number) => {
    let diff = Math.abs(m1 - m2);
    if (diff > 12 * 60) diff = 24 * 60 - diff;
    return diff;
  };

  const rawBaseBedMins = userProfile?.bedtime 
    ? parseMins(userProfile.bedtime) 
    : (userProfile?.usualBedtime ? parseMins(userProfile.usualBedtime) : parseMins('22:30'));
  // If base bedtime is outside the healthy evening range (21:00 - 00:30), sanitize to 22:30
  const baseBedtimeMins = (rawBaseBedMins > 30 && rawBaseBedMins < 21 * 60)
    ? parseMins('22:30')
    : rawBaseBedMins;
  const liveBedtimeMins = parseMins(customBedtime);
  const liveWakeMins = parseMins(customWakeTime);
  
  let liveDurationMins = liveWakeMins - liveBedtimeMins;
  if (liveDurationMins < 0) liveDurationMins += 24 * 60;
  
  const parsedNap = parseInt(napDuration) || 0;
  const totalSleepMins = liveDurationMins + parsedNap;

  const liveCircadianShiftMins = getShiftMins(liveBedtimeMins, baseBedtimeMins);
  
  // Calculate Scores
  // Duration: 55 pts max. Deduct 12 pts for every hour below 7.5h.
  let scoreDuration = 55 - Math.max(0, (7.5 * 60 - totalSleepMins) / 60) * 12;
  if (scoreDuration < 0) scoreDuration = 0;
  if (scoreDuration > 55) scoreDuration = 55;
  scoreDuration = Math.round(scoreDuration);

  // Circadian: 45 pts max. Deduct 5 pts for every 30m shift.
  let scoreCircadian = 45 - Math.floor(liveCircadianShiftMins / 30) * 5;
  if (scoreCircadian < 0) scoreCircadian = 0;
  if (scoreCircadian > 45) scoreCircadian = 45;
  scoreCircadian = Math.round(scoreCircadian);

  const isTimeFormatValid = (t: string) => {
    if (!t || t === '--:--' || !t.includes(':')) return false;
    const [h, m] = t.split(':').map(Number);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const napStartMinsVal = parseMins(napStart);
  // Power nap must be in the circadian afternoon dip window (11:00 - 16:30)
  const isNapInCircadianWindow = isTimeFormatValid(napStart) && napStartMinsVal >= 11 * 60 && napStartMinsVal <= 16 * 60 + 30;

  // Night sleep duration: bedtime to wake
  const hasValidNightSleep = isTimeFormatValid(customBedtime) && isTimeFormatValid(customWakeTime) && liveDurationMins >= 4 * 60;

  // Power nap must end well before night sleep (at least 3 hours buffer before bedtime)
  const isNapFarFromBedtime = (() => {
    if (!isTimeFormatValid(napStart) || !isTimeFormatValid(customBedtime)) return false;
    const napDur = parseInt(napDuration) || 0;
    const napEnd = napStartMinsVal + napDur;
    let diffToBed = liveBedtimeMins - napEnd;
    if (diffToBed < 0 && liveBedtimeMins < 12 * 60) diffToBed += 24 * 60; // if bedtime is past midnight
    return diffToBed >= 3 * 60;
  })();

  const parsedNapVal = parseInt(napDuration) || 0;
  const isStep3Valid = Boolean(
    isTimeFormatValid(customBedtime) &&
    isTimeFormatValid(customWakeTime) &&
    hasValidNightSleep &&
    (parsedNapVal === 0 || (isTimeFormatValid(napStart) && isNapInCircadianWindow && isNapFarFromBedtime))
  );

  const liveScore = !isStep3Valid ? 0 : (scoreDuration + scoreCircadian);
  const isQualified = isStep3Valid && (liveScore >= 90 || hasAppliedOptimal);

  const getTipContent = () => {
    if (!isStep3Valid || isQualified) return null;
    const isEn = language === 'en';
    const idealNap = napStart; // Respect user's chosen nap time
    
    if (liveScore < 50 || liveDurationMins < 4.5 * 60) {
        let optimalBedtimeMins = liveWakeMins - 8 * 60;
        while (optimalBedtimeMins < 0) optimalBedtimeMins += 24 * 60;
        if (optimalBedtimeMins < 21 * 60 && optimalBedtimeMins >= 12 * 60) optimalBedtimeMins = 21 * 60;
        else if (optimalBedtimeMins < 12 * 60) optimalBedtimeMins = 23 * 60 + 30;
        
        const safeBedtimeStr = formatMins(optimalBedtimeMins);
        
        return {
            title: isEn ? "Critical Alert: Mandatory Schedule Change" : "Báo động đỏ: Bắt buộc thay đổi lịch",
            desc: isEn 
              ? `Your sleep duration is dangerously low. You must restructure your morning commitments and go to bed by ${safeBedtimeStr}. Also, mandate a 40-min nap around ${idealNap}.` 
              : `Thời lượng ngủ dưới mức tối thiểu. Bắt buộc thay đổi lịch sinh hoạt! Hãy dời lịch bận sáng để đi ngủ sớm lúc ${safeBedtimeStr}. Bắt buộc chợp mắt 40p lúc ${idealNap}.`,
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            optimalBedtime: safeBedtimeStr,
            optimalWake: formatMins(liveWakeMins), // keep wake same, they have to push commitments
            optimalNapStart: idealNap,
            optimalNapDuration: "40"
        };
    }
    
    // To mathematically guarantee 90+ score, we add 1 extra point buffer (ceil)
    const missingPts = 90 - liveScore + 1; 
    
    if (scoreDuration < 50) {
        let remainingShift = missingPts * 5;
        let newBedtimeMins = liveBedtimeMins;
        let newWakeMins = liveWakeMins;
        
        let maxWakeMins = Number.MAX_SAFE_INTEGER;
        if (commitments.length > 0) {
            let validComms = commitments.filter(c => {
                let s = parseMins(c.start);
                if (s < liveWakeMins && s < 12*60) s += 24*60; 
                return s >= liveWakeMins;
            });
            if (validComms.length > 0) {
                validComms.sort((a, b) => {
                    let sa = parseMins(a.start); if (sa < liveWakeMins && sa < 12*60) sa += 24*60;
                    let sb = parseMins(b.start); if (sb < liveWakeMins && sb < 12*60) sb += 24*60;
                    return sa - sb;
                });
                let firstCommStart = parseMins(validComms[0].start);
                if (firstCommStart < liveWakeMins && firstCommStart < 12*60) firstCommStart += 24*60;
                maxWakeMins = firstCommStart - 15;
            }
        }

        let wakeShift = 0;
        let napShift = 0;
        let bedShift = 0;

        if (liveWakeMins > maxWakeMins) {
            newWakeMins = maxWakeMins;
            remainingShift += (liveWakeMins - maxWakeMins);
        } else {
            const allowedWakeShift = maxWakeMins - liveWakeMins;
            wakeShift = Math.min(remainingShift, allowedWakeShift);
            newWakeMins = liveWakeMins + wakeShift;
            remainingShift -= wakeShift;
        }

        if (remainingShift > 0) {
            const maxNapAdd = 70; // Base 20, max 90
            napShift = Math.min(remainingShift, maxNapAdd);
            remainingShift -= napShift;
        }

        let impossibleToHit90 = false;
        // Push rest to Bedtime earlier
        if (remainingShift > 0) {
            bedShift = remainingShift;
            remainingShift = 0;
            newBedtimeMins -= bedShift;
        }
        
        while (newBedtimeMins < 0) newBedtimeMins += 24 * 60;
        // Strict biological clamp: Bedtime between 21:00 and 23:30
        if (newBedtimeMins < 21 * 60 && newBedtimeMins >= 12 * 60) newBedtimeMins = 21 * 60;
        else if (newBedtimeMins < 12 * 60) newBedtimeMins = 23 * 60 + 30;

        while (newBedtimeMins < 0) newBedtimeMins += 24 * 60;
        let newBedtime = formatMins(newBedtimeMins);
        const newWake = formatMins(newWakeMins);
        const newNapDuration = (20 + napShift).toString();

        let descVi = "";
        let descEn = "";
        
        const formatDurEn2 = (m: number) => {
            const h = Math.floor(m / 60); const mins = m % 60;
            if (h === 0) return `${mins}m`; return mins === 0 ? `${h}h` : `${h}h ${mins}m`;
        };
        const formatDurVi2 = (m: number) => {
            const h = Math.floor(m / 60); const mins = m % 60;
            if (h === 0) return `${mins} phút`; return mins === 0 ? `${h} tiếng` : `${h} tiếng ${mins} phút`;
        };

        if (impossibleToHit90) {
            descVi = `Cảnh báo: Lịch trình hiện tại quá sát sao! Hãy đi ngủ càng sớm càng tốt (từ ${newBedtime}), dậy lúc ${newWake} và chợp mắt ${newNapDuration} phút để phục hồi tối đa.`;
            descEn = `Schedule Alert! Sleep as early as possible (at ${newBedtime}), wake at ${newWake}, and nap ${newNapDuration}m to maximize recovery.`;
        }
        else if (bedShift === 0 && napShift === 0) {
            descVi = `Bạn cần ngủ thêm. Chỉ cần dậy muộn hơn khoảng ${formatDurVi2(wakeShift)} (lúc ${newWake}) là đủ năng lượng.`;
            descEn = `You need more sleep. Just wake up ${formatDurEn2(wakeShift)} later (at ${newWake}) to recharge.`;
        } else {
            let actsVi = [];
            let actsEn = [];
            if (wakeShift > 0) {
                actsVi.push(`dậy muộn hơn khoảng ${formatDurVi2(wakeShift)} (vào lúc ${newWake})`);
                actsEn.push(`wake ${formatDurEn2(wakeShift)} later (at ${newWake})`);
            } else if (newWakeMins === maxWakeMins) {
                actsVi.push(`dậy lúc ${newWake} (để kịp lịch bận)`);
                actsEn.push(`wake at ${newWake} (to meet commitment)`);
            }
            if (napShift > 0) {
                actsVi.push(`tăng giấc ngủ trưa lên thành ${newNapDuration} phút`);
                actsEn.push(`extend nap to ${newNapDuration}m`);
            }
            if (bedShift > 0) {
                actsVi.push(`ngủ sớm hơn khoảng ${formatDurVi2(bedShift)} (vào lúc ${newBedtime})`);
                actsEn.push(`sleep ${formatDurEn2(bedShift)} earlier (at ${newBedtime})`);
            }
            descVi = `Bạn đang thiếu ngủ. Hãy ${actsVi.join(', ')} để đảm bảo sức khỏe.`;
            descEn = `Sleep deprived! Please ${actsEn.join(', ')} to restore your energy.`;
        }

        const totalShift = wakeShift + napShift + bedShift;
        const tipTitle = totalShift > 60 ? (isEn ? "Major Schedule Overhaul" : "Cần thay đổi lớn") : (isEn ? "Minor Adjustment Needed" : "Tinh chỉnh nhỏ");
        
        return {
            title: tipTitle,
            desc: isEn ? descEn : descVi,
            color: "text-[#CA8A04]",
            bg: "bg-white/60 dark:bg-black/20",
            border: "border-[#EAB308]/30",
            optimalBedtime: newBedtime,
            optimalWake: newWake,
            optimalNapStart: idealNap,
            optimalNapDuration: newNapDuration
        };
    } else {
        const shiftMins = missingPts * 6;
        let diff = liveBedtimeMins - baseBedtimeMins;
        if (diff > 12 * 60) diff -= 24 * 60;
        if (diff < -12 * 60) diff += 24 * 60;
        
        let direction = diff > 0 ? -1 : 1;
        let actualShiftMins = shiftMins;

        let newBedtimeMins = liveBedtimeMins + direction * actualShiftMins;
        while (newBedtimeMins < 0) newBedtimeMins += 24 * 60;
        let newWakeMins = liveWakeMins + direction * actualShiftMins;
        while (newWakeMins < 0) newWakeMins += 24 * 60;
        
        // Strict biological clamp: Bedtime between 21:00 and 23:30
        if (newBedtimeMins < 21 * 60 && newBedtimeMins >= 12 * 60) newBedtimeMins = 21 * 60;
        else if (newBedtimeMins < 12 * 60) newBedtimeMins = 23 * 60 + 30;
        
        const newBedtime = formatMins(newBedtimeMins);
        const newWake = formatMins(newWakeMins);
        const earlyLateEn = direction === -1 ? "earlier" : "later";
        const earlyLateVi = direction === -1 ? "sớm hơn" : "muộn hơn";
        
        const formatDurEn = (m: number) => {
            const h = Math.floor(m / 60); const mins = m % 60;
            if (h === 0) return `${mins}m`; return mins === 0 ? `${h}h` : `${h}h ${mins}m`;
        };
        const formatDurVi = (m: number) => {
            const h = Math.floor(m / 60); const mins = m % 60;
            if (h === 0) return `${mins} phút`; return mins === 0 ? `${h} tiếng` : `${h} tiếng ${mins} phút`;
        };
        
        const durEn = formatDurEn(actualShiftMins);
        const durVi = formatDurVi(actualShiftMins);
        
        return {
            title: isEn ? "Circadian Alignment" : "Đồng bộ nhịp sinh học",
            desc: isEn
              ? `To better match your body's natural clock, try going to sleep ${durEn} ${earlyLateEn} (from ${newBedtime} to ${newWake}). Keep your nap at ${idealNap}.`
              : `Để cơ thể không bị mệt mỏi, hãy thử ngủ ${earlyLateVi} khoảng ${durVi} (từ ${newBedtime} đến ${newWake}). Giữ nguyên giờ chợp mắt lúc ${idealNap}.`,
            color: "text-[#CA8A04]",
            bg: "bg-white/60 dark:bg-black/20",
            border: "border-[#EAB308]/30",
            optimalBedtime: newBedtime,
            optimalWake: newWake,
            optimalNapStart: idealNap,
            optimalNapDuration: "20"
        };
    }
  };
  const tipData = getTipContent();


  const handleStartEdit = (index: number) => {
    const comm = commitments[index];
    if (!comm) return;
    const initialTitle = (!isEn && (!comm.title || comm.title.toLowerCase() === 'busy block'))
      ? 'Lịch bận'
      : (isEn && comm.title === 'Lịch bận' ? 'Busy Block' : (comm.title || ''));
    setNewTitle(initialTitle);
    setNewStart(comm.start);
    setNewEnd(comm.end);
    setEditingIndex(index);
    setTimeError(null);
    setIsAdding(true);
  };

  const handleStartAdd = () => {
    setNewTitle('');
    setNewStart('');
    setNewEnd('');
    setEditingIndex(null);
    setTimeError(null);
    setIsAdding(true);
  };

  const handleBackFromStep1 = () => {
    if (planningMode === 'tomorrow') {
      const hasTomorrow = Boolean(tomorrowSavedData || localStorage.getItem('owlup_tomorrow_schedule'));
      if (hasTomorrow) {
        setStep(4);
      } else {
        if (onNavigateToDashboard) {
          onNavigateToDashboard();
        } else {
          setStep(4);
        }
      }
    } else {
      // today mode
      const hasToday = Boolean(
        isScheduleAppliedToday ||
        localStorage.getItem('owlup_schedule_applied') === 'true' ||
        localStorage.getItem('owlup_custom_schedule_configured') === 'true'
      );
      if (hasToday) {
        setStep(4);
      } else {
        if (onNavigateToDashboard) {
          onNavigateToDashboard();
        } else {
          setStep(4);
        }
      }
    }
  };

  const validateSingleTime = (time: string, label: string): string | null => {
    if (!time || time === '--:--' || time === ':') return null;
    const parts = time.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && (h < 0 || h > 23)) {
      return isEn 
        ? `Invalid hour (${parts[0]}) in ${label}. Hour must be 00 - 23.` 
        : `Giờ không hợp lệ (${parts[0]}) ở ${label}. Giờ phải từ 00 đến 23. Vui lòng điền lại.`;
    }
    if (!isNaN(m) && (m < 0 || m > 59)) {
      return isEn 
        ? `Invalid minute (${parts[1]}) in ${label}. Minute must be 00 - 59.` 
        : `Phút không hợp lệ (${parts[1]}) ở ${label}. Phút phải từ 00 đến 59. Vui lòng điền lại.`;
    }
    return null;
  };

  const validateTimes = (start: string, end: string): { valid: boolean; error: string | null } => {
    // Check start field validity
    const startErr = validateSingleTime(start, isEn ? "start time" : "thời gian bắt đầu");
    if (startErr) return { valid: false, error: startErr };

    // Check end field validity
    const endErr = validateSingleTime(end, isEn ? "end time" : "thời gian kết thúc");
    if (endErr) return { valid: false, error: endErr };

    if (!start || !end || start === '--:--' || end === '--:--' || !start.includes(':') || !end.includes(':')) {
      return {
        valid: false,
        error: isEn ? "Please enter both start and end times." : "Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc."
      };
    }
    const [shStr, smStr] = start.split(':');
    const [ehStr, emStr] = end.split(':');
    const sh = parseInt(shStr, 10);
    const sm = parseInt(smStr, 10);
    const eh = parseInt(ehStr, 10);
    const em = parseInt(emStr, 10);

    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
      return {
        valid: false,
        error: isEn ? "Invalid time format. Please re-enter." : "Định dạng thời gian không hợp lệ. Vui lòng điền lại."
      };
    }

    if (sh < 0 || sh > 23 || eh < 0 || eh > 23 || sm < 0 || sm > 59 || em < 0 || em > 59) {
      return {
        valid: false,
        error: isEn ? "Time out of range (00:00 - 23:59). Please re-enter." : "Thời gian ngoài phạm vi (00:00 - 23:59). Vui lòng điền lại."
      };
    }

    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;

    if (startMins >= endMins) {
      return {
        valid: false,
        error: isEn
          ? "Start time must be earlier than end time (e.g. 09:00 AM → 10:00 AM). Please re-enter."
          : "Thời gian bắt đầu phải sớm hơn thời gian kết thúc (VD: 09:00 → 10:00). Không ghi nhận thời gian hợp lệ, vui lòng điền lại."
      };
    }

    return { valid: true, error: null };
  };

  const handleSaveCommitment = () => {
    const validation = validateTimes(newStart, newEnd);
    if (!validation.valid) {
      setTimeError(validation.error);
      return;
    }
    
    setTimeError(null);
    const parse = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const format = (m: number) => { 
        let h = Math.floor(m/60)%24; 
        if (h<0) h+=24; 
        return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; 
    };

    const addedTitle = newTitle.trim() || (isEn ? 'Busy Block' : 'Lịch bận');
    
    // Add to list or replace existing edited item
    let list: { title: string; start: string; end: string }[];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < commitments.length) {
      list = commitments.map((c, idx) => idx === editingIndex ? { title: addedTitle, start: newStart, end: newEnd } : c);
    } else {
      list = [...commitments, { title: addedTitle, start: newStart, end: newEnd }];
    }
    
    // Convert to absolute minutes for sorting (assuming Waking Day starts at 04:00)
    let parsedList = list.map(c => {
        let s = parse(c.start);
        let e = parse(c.end);
        if (s < 4*60) s += 24*60;
        if (e <= s) e += 24*60;
        return { ...c, absS: s, absE: e };
    });
    
    parsedList.sort((a, b) => a.absS - b.absS);
    
    let merged = [];
    if (parsedList.length > 0) {
        let current = parsedList[0];
        for (let i = 1; i < parsedList.length; i++) {
            let next = parsedList[i];
            // If overlap or contiguous
            if (next.absS <= current.absE) {
                // Merge them: combine titles, extend end time
                current.absE = Math.max(current.absE, next.absE);
                current.end = format(current.absE);
                if (!current.title.includes(next.title)) {
                    current.title = current.title + ' + ' + next.title;
                }
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
    }
    
    // Remove temporary abs fields
    const finalMerged = merged.map(m => ({ title: m.title, start: m.start, end: m.end }));
    
    setCommitments(finalMerged);
    try {
      if (planningMode === 'tomorrow') {
        localStorage.setItem('owlup_tomorrow_commitments', JSON.stringify(finalMerged));
      } else {
        localStorage.setItem('owlup_commitments', JSON.stringify(finalMerged));
        localStorage.setItem('owlup_schedule_date', getTodayDateStr());
        if (onUpdateCommitments) onUpdateCommitments(finalMerged);
      }
    } catch {}
    
    setIsAdding(false);
    setEditingIndex(null);
    setNewTitle('');
  };

  const removeCommitment = (index: number) => {
    const updated = commitments.filter((_, i) => i !== index);
    setCommitments(updated);
    try {
      if (planningMode === 'tomorrow') {
        localStorage.setItem('owlup_tomorrow_commitments', JSON.stringify(updated));
      } else {
        localStorage.setItem('owlup_commitments', JSON.stringify(updated));
        localStorage.setItem('owlup_schedule_date', getTodayDateStr());
        if (onUpdateCommitments) onUpdateCommitments(updated);
      }
    } catch {}
  };


  // ==========================================
  // HISTORICAL SLEEP & SLEEP DEBT CALCULATION
  // ==========================================
  const historyAnalysis = (() => {
    try {
      const raw = localStorage.getItem('owlup_history');
      if (raw) {
        const historyObj: Record<string, { date?: string; sleepHours?: number; sleepDurationHours?: number; sleepScore?: number; caffeineMg?: number }> = JSON.parse(raw);
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        let targetEntry = historyObj[yesterdayStr];
        if (!targetEntry) {
          const keys = Object.keys(historyObj).filter(k => k < getTodayDateStr()).sort().reverse();
          if (keys.length > 0) {
            targetEntry = historyObj[keys[0]];
          }
        }
        
        const pastSleep = targetEntry ? (targetEntry.sleepHours || targetEntry.sleepDurationHours) : null;
        if (pastSleep !== null && pastSleep !== undefined && pastSleep > 0) {
          const standardTarget = 7.5;
          const sleepDebtHours = Math.max(0, standardTarget - pastSleep);
          return {
            hasHistory: true,
            yesterdaySleep: pastSleep,
            yesterdayScore: targetEntry?.sleepScore || 70,
            sleepDebtHours: Number(sleepDebtHours.toFixed(1)),
            hasDebt: sleepDebtHours >= 0.5,
            date: targetEntry?.date || yesterdayStr
          };
        }
      }
    } catch {}
    return {
      hasHistory: false,
      yesterdaySleep: 8.0,
      yesterdayScore: 85,
      sleepDebtHours: 0,
      hasDebt: false,
      date: ''
    };
  })();

  // ==========================================
  // PERSONALIZATION ALGORITHM (Recommendation)
  // ==========================================
  
  const isNightOwl = userProfile?.chronotype === 'night_owl';
  const isEarlyBird = userProfile?.chronotype === 'early_bird';
  
  // Target Sleep Duration & parameters driven by selectedGoal
  let goalTargetSleepMins = 8 * 60; // default 480m
  let goalBaseNap = 20;

  if (selectedGoal === 'catch_up') {
    // Ngủ bù: mục tiêu ngủ nhiều hơn (8h45m), nap 30m
    goalTargetSleepMins = 8 * 60 + 45;
    goalBaseNap = 30;
  } else if (selectedGoal === 'max_productivity') {
    // Năng suất tối đa: 7h15m ban đêm, nap 20m nhanh gọn
    goalTargetSleepMins = 7 * 60 + 15;
    goalBaseNap = 20;
  } else if (selectedGoal === 'night_owl') {
    // Cú đêm / ca muộn: 7h45m ngủ đêm, nap 25m
    goalTargetSleepMins = 7 * 60 + 45;
    goalBaseNap = 25;
  } else {
    // healthy_balanced (hoặc mặc định): 8h00m cân bằng tự nhiên, nap 20m
    goalTargetSleepMins = 8 * 60;
    goalBaseNap = 20;
  }

  const extraDebtMins = historyAnalysis.hasDebt ? Math.min(60, Math.round(historyAnalysis.sleepDebtHours * 30)) : 0;
  const targetDurationMins = goalTargetSleepMins + extraDebtMins; 

  // 1. Determine Morning Commitments and Required Wake Time (Giờ thức dậy)
  // Morning commitments must be in the early morning window (04:00 - 10:00) that forces waking up early
  const morningComms = commitments
    .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
    .filter(c => c.startMins >= 4 * 60 && c.startMins <= 10 * 60)
    .sort((a, b) => a.startMins - b.startMins);

  const hasMorningComm = morningComms.length > 0;

  // Natural wake time defaults based on circadian science & chosen goal:
  let naturalWakeMins = 6 * 60 + 30; // 06:30 for balanced
  if (selectedGoal === 'max_productivity') {
    naturalWakeMins = 6 * 60; // 06:00 dậy sớm đón ánh sáng mặt trời, kích hoạt cortisol tự nhiên
  } else if (selectedGoal === 'catch_up') {
    naturalWakeMins = 6 * 60 + 30; // 06:30 duy trì nhịp thức dậy sinh học, ưu tiên ngủ sớm vào buổi tối
  } else if (selectedGoal === 'night_owl') {
    naturalWakeMins = 7 * 60 + 45; // 07:45 dậy muộn phù hợp với chronotype cú đêm
  }

  let requiredWakeMins = hasMorningComm
    ? Math.max(4 * 60 + 30, morningComms[0].startMins - 30) // 30 phút chuẩn bị buổi sáng trước ca đầu tiên
    : naturalWakeMins;

  // 2. Evening / Night Commitments check:
  // Only commitments ending after 21:00 or during the night can delay the ideal bedtime
  let latestEveningBusyMins = 0;
  commitments.forEach(c => {
    const s = parseMins(c.start);
    let e = parseMins(c.end);
    if (e < s) e += 24 * 60; // qua đêm

    // Hoạt động kết thúc sau 21:00 (1260m)
    if (e > 21 * 60) {
      if (e > latestEveningBusyMins) {
        latestEveningBusyMins = e;
      }
    }
  });

  // Cần ít nhất 30 phút wind-down sau khi kết thúc việc buổi tối trước khi đi ngủ
  const earliestBedContMins = latestEveningBusyMins > 0 ? latestEveningBusyMins + 30 : 0;

  // 3. Goal-based Circadian Bedtime Calculation (chuẩn khoa học nhịp sinh học):
  // Anchor bedtimes:
  // - Cân bằng lành mạnh: ~22:30 (chuẩn melatonin tự nhiên)
  // - Tối đa năng suất: ~22:45
  // - Ngủ bù: ~21:45 (ngủ sớm để tăng sóng chậm Deep Sleep / NREM)
  // - Cú đêm: ~00:00 (không để quá muộn sau 01:00 để tránh ức chế hormone tăng trưởng)
  let idealBedMins = 22 * 60 + 30; // 22:30 default
  if (selectedGoal === 'catch_up') {
    idealBedMins = 21 * 60 + 45; // 21:45
  } else if (selectedGoal === 'max_productivity') {
    idealBedMins = 22 * 60 + 45; // 22:45
  } else if (selectedGoal === 'night_owl') {
    idealBedMins = 24 * 60; // 00:00
  }

  // Nếu có lịch bận buổi sáng bắt buộc phải dậy sớm:
  if (hasMorningComm) {
    let calculatedBedMins = requiredWakeMins - targetDurationMins;
    while (calculatedBedMins < 0) calculatedBedMins += 24 * 60;
    // Giữ trong khung giờ sinh học lành mạnh tối thiểu 21:00
    if (calculatedBedMins < 20 * 60 && calculatedBedMins > 12 * 60) calculatedBedMins = 21 * 60;
    idealBedMins = calculatedBedMins;
  }

  // Kết hợp với lịch bận buổi tối (nếu làm muộn thì dời giờ ngủ sau lịch bận + 30p)
  let chosenBedContMins = idealBedMins;
  if (chosenBedContMins < 12 * 60) chosenBedContMins += 24 * 60; // quy đổi về continuous timeline

  if (earliestBedContMins > 0) {
    chosenBedContMins = Math.max(chosenBedContMins, earliestBedContMins);
    // Nếu bị dời do việc tối và không có lịch sáng kẹt, cho phép lùi giờ thức dậy tương ứng để đủ giấc
    if (!hasMorningComm) {
      const calcWakeMins = (chosenBedContMins + targetDurationMins) % (24 * 60);
      // Giới hạn giờ thức dậy không quá 09:00 để bảo vệ nhịp sinh học ban ngày
      requiredWakeMins = Math.min(calcWakeMins, 9 * 60);
    }
  }

  // Convert continuous bedtime and wake time back to 24h minutes (0 - 1439)
  let finalBedtimeMins = chosenBedContMins % (24 * 60);
  let finalWakeMins = requiredWakeMins % (24 * 60);

  // Biological Clamp: Giờ đi ngủ đêm luôn nằm trong khung hợp lý (21:00 tối đến 01:00 sáng)
  if (finalBedtimeMins > 1 * 60 && finalBedtimeMins < 20 * 60) {
    finalBedtimeMins = selectedGoal === 'night_owl' ? 0 * 60 + 30 : 22 * 60 + 30;
  }

  // Round to nearest 5 minutes for clean time display
  finalBedtimeMins = Math.round(finalBedtimeMins / 5) * 5 % (24 * 60);
  finalWakeMins = Math.round(finalWakeMins / 5) * 5 % (24 * 60);

  // Actual night sleep duration
  let actualRecDurationMins = finalWakeMins - finalBedtimeMins;
  if (actualRecDurationMins < 0) actualRecDurationMins += 24 * 60;
  const lostSleepMins = Math.max(0, targetDurationMins - actualRecDurationMins);

  // 4. Calculate Afternoon Power Nap (Vùng trũng sinh học buổi trưa 12:30 - 16:30)
  const userHasNapCrave = userProfile?.craves?.includes('nap') 
    || userProfile?.energyCraves?.includes('nap')
    || userProfile?.energyCrave === 'nap'
    || (Array.isArray(userProfile?.energyCrave) && userProfile.energyCrave.includes('nap'));
  
  let baseNap = userHasNapCrave ? Math.max(goalBaseNap, 30) : goalBaseNap;
  if (historyAnalysis.hasDebt) {
    baseNap = Math.max(baseNap, 25);
  }
  let calcNapDuration = Math.min(45, baseNap + Math.min(20, Math.floor(lostSleepMins / 30) * 10));

  // Giờ chợp trưa mặc định: 13:00 (chuẩn vùng trũng sinh học sau ăn trưa, hoặc 13:15 cho cú đêm)
  let idealNapStartMins = selectedGoal === 'night_owl' ? 13 * 60 + 15 : 13 * 60;
  let napStartMins = idealNapStartMins;
  let canNapToday = true;

  // Kiểm tra va chạm với lịch bận:
  // Lịch chợp mắt tuyệt đối KHÔNG ĐƯỢC đè lên lịch bận và CẦN ít nhất 30 phút nghỉ ngơi/ăn trưa/di chuyển
  // sau khi kết thúc việc bận (người dùng không thể vừa xong việc 12:30 là ngủ ngay lập tức lúc 12:30).
  if (commitments.length > 0) {
    const sortedComms = [...commitments]
      .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
      .sort((a, b) => a.startMins - b.startMins);

    // Buffer tối thiểu 30 phút sau khi kết thúc công việc trước khi chợp mắt
    const POST_COMMITMENT_BUFFER = 30;
    // Buffer tối thiểu 15 phút trước khi bắt đầu ca tiếp theo
    const PRE_COMMITMENT_BUFFER = 15;

    const isOverlapWithBuffer = (s: number, dur: number) => {
      const e = s + dur;
      return sortedComms.some(c => {
        // Nếu ca bận kết thúc ngay sát trước giờ ngủ mà chưa đủ 30 phút đệm
        const effectiveBusyStart = c.startMins - PRE_COMMITMENT_BUFFER;
        const effectiveBusyEnd = c.endMins + POST_COMMITMENT_BUFFER;
        return s < effectiveBusyEnd && e > effectiveBusyStart;
      });
    };

    // Kiểm tra xem khung giờ mặc định (13:00) có bị va chạm hoặc thiếu thời gian đệm không
    if (isOverlapWithBuffer(napStartMins, calcNapDuration)) {
      let foundSlot = false;
      // 1. Thử tìm khe rảnh sau các ca bận buổi trưa (phải cách ca bận ít nhất 30-45 phút đệm ăn trưa/nghỉ ngơi)
      for (const c of sortedComms) {
        // Cho người dùng ít nhất 30 phút hoặc 45 phút đệm sau ca bận kết thúc
        let candidateStart = c.endMins + POST_COMMITMENT_BUFFER;
        // Làm tròn lên mốc 5 phút hoặc 15 phút gần nhất (VD: 12:30 + 30p = 13:00)
        candidateStart = Math.ceil(candidateStart / 5) * 5;

        // Vùng trũng chợp mắt an toàn: từ 12:45 đến muộn nhất kết thúc trước 15:30
        if (candidateStart >= 12 * 60 && candidateStart + calcNapDuration <= 15 * 60 + 30) {
          if (!isOverlapWithBuffer(candidateStart, calcNapDuration)) {
            napStartMins = candidateStart;
            foundSlot = true;
            break;
          }
        }
      }

      // 2. Nếu sau ca bận không kịp, thử tìm khe rảnh trước ca bận buổi trưa (tối thiểu 11:30 và cách ca bận 15p)
      if (!foundSlot) {
        for (const c of sortedComms) {
          const candidateStart = c.startMins - calcNapDuration - PRE_COMMITMENT_BUFFER;
          if (candidateStart >= 11 * 60 + 30 && candidateStart + calcNapDuration <= 15 * 60 + 30) {
            if (!isOverlapWithBuffer(candidateStart, calcNapDuration)) {
              napStartMins = candidateStart;
              foundSlot = true;
              break;
            }
          }
        }
      }

      // 3. Nếu bận kín qua 15:30 hoặc không đủ 30 phút đệm:
      // Tuyệt đối KHÔNG xếp chợp mắt sau 15:30 vì chợp mắt sau 15:30/16:00 sẽ phá hỏng áp lực ngủ đêm (sleep pressure)
      // Chuyển sang KHÔNG CHỢP MẮT và ưu tiên ngủ đêm sớm hơn để bù sức
      if (!foundSlot) {
        canNapToday = false;
        calcNapDuration = 0;
      }
    } else {
      // Dù khung mặc định không bị overlap trực tiếp, kiểm tra xem có ca bận nào vừa kết thúc ngay trước đó không
      // Đảm bảo napStartMins luôn cách ca bận gần nhất phía trước ít nhất 30 phút
      const precedingComm = sortedComms.filter(c => c.endMins <= napStartMins).pop();
      if (precedingComm && napStartMins < precedingComm.endMins + POST_COMMITMENT_BUFFER) {
        let adjustedStart = precedingComm.endMins + POST_COMMITMENT_BUFFER;
        adjustedStart = Math.ceil(adjustedStart / 5) * 5;
        if (adjustedStart + calcNapDuration <= 15 * 60 + 30 && !isOverlapWithBuffer(adjustedStart, calcNapDuration)) {
          napStartMins = adjustedStart;
        } else {
          canNapToday = false;
          calcNapDuration = 0;
        }
      }
    }
  }

  // Correct final variables
  while (finalBedtimeMins >= 24 * 60) finalBedtimeMins -= 24 * 60;
  while (finalWakeMins >= 24 * 60) finalWakeMins -= 24 * 60;

  const recBedtime = formatMins(finalBedtimeMins);
  const recWake = formatMins(finalWakeMins);
  
  actualRecDurationMins = finalWakeMins - finalBedtimeMins;
  if (actualRecDurationMins < 0) actualRecDurationMins += 24 * 60;
  const recSleepDuration = (actualRecDurationMins / 60).toFixed(1);
  
  const recNapStart = formatMins(napStartMins);
  const recNapEnd = formatMins(napStartMins + calcNapDuration);
  const recNapDurationMins = calcNapDuration;

  // 5. Calculate Recommended Caffeine Curfew (10 hours before bedtime)
  let cutoffMins = finalBedtimeMins - 10 * 60;
  while (cutoffMins < 0) cutoffMins += 24 * 60;
  const recCaffeineCutoff = formatMins(cutoffMins);

  // Calculate Free Recovery Windows
  const getFreeWindows = () => {
    if (commitments.length === 0) return ["00:00 - 23:59"];
    
    // Convert to minutes and sort
    const parsed = commitments.map(c => ({
      start: parseMins(c.start),
      end: parseMins(c.end)
    })).sort((a, b) => a.start - b.start);
    
    // Merge overlapping commitments
    const merged: {start: number, end: number}[] = [];
    for (const p of parsed) {
      if (merged.length === 0) {
        merged.push(p);
      } else {
        const last = merged[merged.length - 1];
        if (p.start <= last.end) {
          last.end = Math.max(last.end, p.end);
        } else {
          merged.push(p);
        }
      }
    }
    
    const gaps: string[] = [];
    
    // The period before the day's first morning activity (e.g. 00:00 - 06:45) belongs to the previous night's sleep,
    // which has already passed. A morning free window is only valid if the first commitment starts well after wake time.
    const wakeStr = localStorage.getItem('owlup_waketime') || customWakeTime || '07:00';
    const wakeMins = parseMins(wakeStr);
    const firstComm = merged[0];
    
    if (firstComm && firstComm.start >= wakeMins + 30) {
      gaps.push(`${formatMins(wakeMins)} - ${formatMins(firstComm.start)}`);
    }

    let current = firstComm ? firstComm.end : 0;
    for (let i = 1; i < merged.length; i++) {
      const m = merged[i];
      if (m.start > current) {
        if (m.start - current >= 15) { // min 15 minutes to be a recovery window
          gaps.push(`${formatMins(current)} - ${formatMins(m.start)}`);
        }
      }
      current = Math.max(current, m.end);
    }
    if (current < 24 * 60 - 1) {
      gaps.push(`${formatMins(current)} - 23:59`);
    }
    
    return gaps;
  };
  const freeWindows = getFreeWindows();

  // Score calculation: standardized 90+ standard score
  let score = 96;
  if (selectedGoal === 'max_productivity') score = 94;
  else if (selectedGoal === 'catch_up') score = 95;
  else if (selectedGoal === 'night_owl') score = 93;
  if (historyAnalysis.hasDebt) score -= 2;
  if (lostSleepMins > 45) score -= 2;
  if (score < 90) score = 90;



  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-8 sm:mb-12">
        {isEn ? "Synchronize Sleep & Power Nap" : "Đồng bộ Giấc ngủ & Chợp mắt"}
      </h2>

      {/* FOLDER TABS: LỊCH NGỦ HÔM NAY (LEFT) & LỊCH NGỦ NGÀY MAI (RIGHT) (IMAGE 1 STYLE) */}
      <div className="flex items-end pl-4 sm:pl-8">
        {/* Tab 1: Lịch ngủ hôm nay */}
        <button 
          type="button"
          onClick={() => handleSwitchTab('today')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 md:px-10 py-2 sm:py-3.5 md:py-4 rounded-t-[20px] sm:rounded-t-[24px] border border-b-0 font-bold transition-transform duration-200 ease-in-out cursor-pointer ${
            activePlannerTab === 'today' 
            ? 'bg-[#fffff8] dark:bg-[#233355] text-[#1F2937] dark:text-white z-20 pb-4 sm:pb-6 border-slate-200 dark:border-slate-700' 
            : 'bg-[#fffff8]/60 dark:bg-[#0F172A] text-slate-500 z-0 opacity-80 hover:opacity-100 hover:-translate-y-1 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${activePlannerTab === 'today' ? 'bg-white dark:bg-[#1E3A2F]' : 'bg-white/50 dark:bg-slate-800'}`}>
            <Moon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activePlannerTab === 'today' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 'text-slate-400'}`} />
          </div>
          <span className="font-heading text-xs sm:text-base md:text-lg whitespace-nowrap">{isEn ? "Today's sleep schedule" : "Lịch ngủ hôm nay"}</span>
        </button>
        
        {/* Tab 2: Lịch ngủ ngày mai */}
        <button 
          type="button"
          onClick={() => handleSwitchTab('tomorrow')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 md:px-10 py-2 sm:py-3.5 md:py-4 rounded-t-[20px] sm:rounded-t-[24px] border border-b-0 font-bold transition-transform duration-200 ease-in-out -ml-3 sm:-ml-6 cursor-pointer ${
            activePlannerTab === 'tomorrow' 
            ? 'bg-[#fffff8] dark:bg-[#233355] text-[#1F2937] dark:text-white z-20 pb-4 sm:pb-6 border-slate-200 dark:border-slate-700' 
            : 'bg-[#fffff8]/60 dark:bg-[#162032] text-slate-500 z-0 opacity-80 hover:opacity-100 hover:-translate-y-1 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${activePlannerTab === 'tomorrow' ? 'bg-white dark:bg-[#1E3A2F]' : 'bg-white/50 dark:bg-slate-800'}`}>
            <Sunrise className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activePlannerTab === 'tomorrow' ? 'text-[#4CB28E] dark:text-[#62D2FB]' : 'text-slate-400'}`} />
          </div>
          <span className="font-heading text-xs sm:text-base md:text-lg whitespace-nowrap">{isEn ? "Tomorrow's sleep schedule" : "Lịch ngủ ngày mai"}</span>
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className={`relative w-full rounded-[32px] border transition-shadow duration-200 ease-in-out shadow-[0_12px_40px_rgba(0,0,0,0.06)] z-10 p-6 sm:p-10 md:p-12 ${
        activePlannerTab === 'today' 
        ? 'bg-[#fffff8] dark:bg-[#233355] border-slate-200 dark:border-slate-700 rounded-tl-none' 
        : 'bg-[#fffff8] dark:bg-[#233355] border-slate-200 dark:border-slate-700'
      }`}>
        {/* Banner notifications */}
        {isTomorrowSavedBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] flex items-center justify-between gap-3 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#007b4d] dark:text-[#62D2FB]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {isEn 
                  ? "Tomorrow's sleep schedule saved! It will automatically sync to Timeline at 00:00 midnight."
                  : "Đã lưu lịch ngủ ngày mai thành công! Kế hoạch sẽ tự động áp dụng vào Timeline sau 00:00 đêm nay."}
              </span>
            </div>
            <button onClick={() => setIsTomorrowSavedBanner(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isTodaySavedBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] flex items-center justify-between gap-3 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#007b4d] dark:text-[#62D2FB]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {isEn 
                  ? "Today's sleep schedule saved and updated on Timeline!"
                  : "Đã lưu và cập nhật lịch ngủ hôm nay vào Dòng thời gian thành công!"}
              </span>
            </div>
            <button onClick={() => setIsTodaySavedBanner(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: COMMITMENTS */}
        {step === 1 && (
          <div className="w-full relative animate-fade-in text-left">
            {planningMode === 'tomorrow' && (
              <div className="w-full mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-700/40 flex items-start gap-3.5 text-left animate-fade-in shadow-sm">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-xl">
                  🌙
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                    {isEn ? "Why plan for tomorrow at night (after 20:00)?" : "Vì sao nên lên lịch ngày mai vào buổi tối (sau 20:00)?"}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-200/80 mt-1 leading-relaxed font-sans">
                    {isEn 
                      ? "After 20:00 is the optimal wind-down window before sleep. Planning ahead prevents morning sleep inertia: OwlUp proactively calculates your wake time, power nap window, and caffeine cutoff right from the start of tomorrow." 
                      : "Sau 20:00 là thời điểm vàng trước khi đi ngủ để chuẩn bị cho ngày mới. Lên kế hoạch trước giúp cơ thể không bị động: OwlUp sẽ tính toán sẵn giờ thức giấc, khung chợp mắt trưa mai và mốc ngừng nạp caffeine chính xác ngay từ đầu ngày mai mà bạn không cần bận tâm."}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleBackFromStep1}
                  title={isEn ? "Back" : "Quay lại"}
                  className="text-slate-500 hover:text-[#007b4d] dark:hover:text-[#62D2FB] hover:bg-emerald-50 dark:hover:bg-slate-800 p-2 -ml-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{isEn ? "Back" : "Quay lại"}</span>
                </button>
                <div className="inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider">
                  {planningMode === 'tomorrow'
                    ? (isEn ? "Step 1: Tomorrow's busy hours" : "Bước 1: Lịch bận ngày mai")
                    : (isEn ? "Step 1: Your busy hours today" : "Bước 1: Lịch bận hôm nay")}
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
              {planningMode === 'tomorrow'
                ? (isEn ? "When are you busy tomorrow?" : "Ngày mai bạn bận khi nào?")
                : (isEn ? "When are you busy today?" : "Hôm nay bạn bận khi nào?")}
            </h3>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
              {planningMode === 'tomorrow'
                ? (isEn ? "Enter classes, shifts, meetings, or workouts for tomorrow" : "Nhập lịch học, ca làm, họp hoặc tập luyện ngày mai")
                : (isEn ? "Enter classes, shifts, meetings, or workouts" : "Nhập lịch học, ca làm, họp hoặc tập luyện")}
            </p>
          
          <div className="mb-12">
            {commitments.length > 0 && !isAdding && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                {commitments.map((c, i) => {
                  const displayTitle = (!isEn && (!c.title || c.title.toLowerCase() === 'busy block'))
                    ? 'Lịch bận'
                    : (isEn && c.title === 'Lịch bận' ? 'Busy Block' : (c.title || (isEn ? 'Busy Block' : 'Lịch bận')));
                  return (
                    <div key={i} className="flex flex-col p-6 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl relative shadow-sm">
                      <div className="font-bold text-[#1F2937] dark:text-white text-lg mb-2 pr-24 truncate">{displayTitle}</div>
                      <div className="font-heading text-[#007b4d] dark:text-[#62D2FB] text-lg">{formatDisplayTime(`${c.start} - ${c.end}`, isEn)}</div>
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 flex items-center gap-1 sm:gap-1.5">
                        <button 
                          onClick={() => handleStartEdit(i)} 
                          title={isEn ? "Edit" : "Chỉnh sửa"}
                          className="text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => removeCommitment(i)} 
                          title={isEn ? "Delete" : "Xóa"}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button 
                  onClick={handleStartAdd}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-[#E6F8F0] dark:bg-[#62D2FB]/10 dark:hover:bg-[#1E3A2F] transition-colors gap-2 text-[#4CB28E] dark:text-[#62D2FB] font-bold text-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center text-[#007b4d] dark:text-[#62D2FB] font-heading text-xl transition-colors">+</div>
                  {isEn ? "Add busy time" : "Thêm lịch bận"}
                </button>
              </div>
            )}

            {commitments.length > 0 && !isAdding && (
              <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                <div className="text-base font-bold text-[#1F2937] dark:text-white mb-4">{isEn ? "Available Free Time for Rest:" : "Khung giờ rảnh để nghỉ ngơi:"}</div>
                <div className="flex flex-wrap gap-3">
                  {freeWindows.map((win, idx) => (
                    <div key={idx} className="bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB]/30 text-[#007b4d] dark:text-[#62D2FB] px-4 py-2 rounded-xl text-lg font-heading font-bold shadow-sm transition-all hover:-translate-y-0.5">
                      {formatDisplayTime(win, isEn)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdding && (
              <div className="p-4 sm:p-8 border border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#62D2FB]/10 rounded-2xl space-y-4 sm:space-y-6 animate-fade-in">
                <div className="text-base sm:text-lg font-bold text-[#007b4d] dark:text-[#62D2FB]">
                  {editingIndex !== null 
                    ? (isEn ? "Edit busy time" : "Chỉnh sửa lịch bận") 
                    : (isEn ? "Add busy time" : "Thêm lịch bận")}
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">{isEn ? "Shift title (e.g., Morning Lecture)" : "Tên (VD: Học buổi sáng)"}</div>
                  <input 
                    type="text" 
                    placeholder={isEn ? "Morning Lecture" : "VD: Học buổi sáng"}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E] dark:border-[#62D2FB]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 py-2">
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">
                      {isEn ? "Start time (e.g., 09:00)" : "Bắt đầu (VD: 09:00)"}
                    </div>
                    <TimePickerInput 
                      value={newStart} 
                      onChange={(val) => { setNewStart(val); }} 
                      onRangeDetected={(start, end) => {
                        setNewStart(start);
                        setNewEnd(end);
                      }}
                      isEn={isEn} 
                      placeholder={isEn ? "09:00" : "09:00"} 
                    />
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#007b4d] dark:text-[#62D2FB]/50 shrink-0 mx-auto rotate-90 sm:rotate-0 mt-6 sm:mt-6" />
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">
                      {isEn ? "End time (e.g., 12:00)" : "Kết thúc (VD: 12:00)"}
                    </div>
                    <TimePickerInput 
                      value={newEnd} 
                      onChange={(val) => { setNewEnd(val); }} 
                      onRangeDetected={(start, end) => {
                        setNewStart(start);
                        setNewEnd(end);
                      }}
                      isEn={isEn} 
                      placeholder={isEn ? "12:00" : "12:00"} 
                    />
                  </div>
                </div>

                {(() => {
                  const validation = validateTimes(newStart, newEnd);
                  const hasBothInputs = Boolean(newStart && newEnd && newStart !== '--:--' && newEnd !== '--:--');
                  const singleStartErr = validateSingleTime(newStart, isEn ? "start time" : "thời gian bắt đầu");
                  const singleEndErr = validateSingleTime(newEnd, isEn ? "end time" : "thời gian kết thúc");
                  const immediateFieldErr = singleStartErr || singleEndErr;
                  const displayErr = immediateFieldErr || ((!validation.valid && hasBothInputs) ? validation.error : timeError);
                  if (!displayErr) return null;
                  return (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#FEF5F5] dark:bg-[#7F1D1D]/20 border border-[#C10007]/30 dark:border-[#C10007]/50 text-[#C10007] dark:text-[#FCA5A5] text-sm font-medium animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#C10007] dark:text-[#FCA5A5]" />
                      <span>{displayErr}</span>
                    </div>
                  );
                })()}

                <div className="flex justify-end items-center gap-4 sm:gap-8 pt-4">
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingIndex(null);
                      setNewTitle('');
                      setTimeError(null);
                    }} 
                    className="text-slate-500 font-bold hover:text-slate-700 text-base sm:text-lg cursor-pointer"
                  >
                    {isEn ? "Cancel" : "Hủy"}
                  </button>
                  <button 
                    onClick={handleSaveCommitment} 
                    disabled={!validateTimes(newStart, newEnd).valid}
                    className={`font-bold text-base sm:text-lg px-6 sm:px-10 py-2.5 sm:py-3 rounded-full transition-all shadow-md ${
                      validateTimes(newStart, newEnd).valid
                        ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white cursor-pointer hover:-translate-y-0.5'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isEn ? "Save" : "Lưu"}
                  </button>
                </div>
              </div>
            )}

            {commitments.length === 0 && !isAdding && (
              <div className="flex flex-col sm:flex-row gap-6">
                <button 
                  onClick={handleStartAdd}
                  className="flex-[1] py-4 px-6 border-2 border-dashed border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-[#E6F8F0] dark:bg-[#62D2FB]/10 transition-colors flex items-center justify-center gap-3 text-[#4CB28E] dark:text-[#62D2FB] font-bold text-lg"
                >
                  <Plus className="w-5 h-5" /> {isEn ? "Add busy time" : "Thêm lịch bận"}
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="flex-[1] py-4 px-6 border-2 border-dashed border-slate-300 bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center gap-3 text-slate-500 font-bold text-lg"
                >
                  <span className="text-xl">✨</span> {isEn ? "Free all day" : "Rảnh cả ngày"}
                </button>
              </div>
            )}
          </div>
          
          {!isAdding && (
            <div className="flex items-center justify-between mt-12 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={handleBackFromStep1}
                className="text-slate-500 hover:text-[#007b4d] dark:hover:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center gap-2 transition-colors cursor-pointer py-2"
              >
                <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
              </button>
              <button 
                onClick={() => setStep(2)}
                disabled={commitments.length === 0}
                className={`rounded-full px-8 sm:px-12 py-3.5 text-base sm:text-lg font-bold transition-all whitespace-nowrap ${
                  commitments.length > 0 
                    ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white shadow-md cursor-pointer hover:-translate-y-1' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {isEn ? "Next" : "Tiếp"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: RECOVERY GOAL SELECTION (NOT PRESELECTED) */}
      {step === 2 && (
        <div className="w-full relative animate-fade-in text-left">
          <div className="inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-6 sm:mb-8">
            {planningMode === 'tomorrow'
              ? (isEn ? "Step 2: Recovery goal for tomorrow" : "Bước 2: Mục tiêu phục hồi ngày mai")
              : (isEn ? "Step 2: Recovery goal for today" : "Bước 2: Mục tiêu phục hồi hôm nay")}
          </div>

          <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-3">
            {planningMode === 'tomorrow'
              ? (isEn ? "Choose your recovery goal for tomorrow" : "Mục tiêu phục hồi ngày mai của bạn là gì?")
              : (isEn ? "Choose your recovery goal today" : "Hôm nay mục tiêu phục hồi của bạn là gì?")}
          </h3>
          <p className="text-slate-500 mb-8 sm:mb-10 text-sm sm:text-base md:text-lg leading-relaxed">
            {planningMode === 'tomorrow'
              ? (isEn 
                ? "Select one of the 4 goals below. OwlUp will calculate your optimal night sleep, power nap, and caffeine curfew for tomorrow." 
                : "Chọn 1 trong 4 mục tiêu dưới đây để OwlUp đề xuất thời gian ngủ đêm, chợp mắt và mốc ngừng caffeine tối ưu cho ngày mai.")
              : (isEn 
                ? "Select one of the 4 goals below. OwlUp will calculate your optimal night sleep, power nap, and caffeine curfew." 
                : "Chọn 1 trong 4 mục tiêu dưới đây để OwlUp đề xuất thời gian ngủ đêm, chợp mắt và mốc ngừng caffeine tối ưu.")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
            {[
              {
                id: 'healthy_balanced' as const,
                icon: '🌱',
                title: isEn ? 'Healthy Balanced' : 'Cân bằng lành mạnh',
                subtitle: isEn ? 'Balanced rest & steady energy' : 'Nghỉ ngơi điều độ & năng lượng ổn định',
                desc: isEn 
                  ? 'Naturally aligned with biological circadian rhythms, guaranteeing a full 8-hour sleep.'
                  : 'Đồng bộ với nhịp sinh học tự nhiên, đảm bảo giấc ngủ trọn vẹn 8 tiếng để cơ thể tràn đầy sinh lực.',
              },
              {
                id: 'max_productivity' as const,
                icon: '🚀',
                title: isEn ? 'Max Productivity' : 'Năng suất tối đa',
                subtitle: isEn ? 'Peak focus & deep work' : 'Tập trung cao độ & làm việc sâu',
                desc: isEn 
                  ? 'Maximizes awake hours for deep work, combined with a power nap to maintain sharp focus.'
                  : 'Tối ưu thời gian tỉnh táo ban ngày, kết hợp chợp mắt nhanh để duy trì sự sắc bén.',
              },
              {
                id: 'catch_up' as const,
                icon: '⚡',
                title: isEn ? 'Catch Up & Sleep' : 'Ngủ bù & Phục hồi',
                subtitle: isEn ? 'Extra sleep for full recharge' : 'Thêm giờ ngủ để phục hồi năng lượng',
                desc: isEn 
                  ? 'Prioritizes earlier bedtime and longer deep sleep to pay down accumulated sleep debt.'
                  : 'Ưu tiên đi ngủ sớm hơn và kéo dài thời gian ngủ sâu để bù đắp nợ ngủ, xua tan mệt mỏi.',
              },
              {
                id: 'night_owl' as const,
                icon: '🦉',
                title: isEn ? 'Night Owl / Shift' : 'Cú đêm / Ca muộn',
                subtitle: isEn ? 'Late-night routines & shifts' : 'Lịch làm việc & hoạt động ban đêm',
                desc: isEn 
                  ? 'Smoothly shifts sleep window later while protecting total recovery sleep after late hours.'
                  : 'Linh hoạt lùi giờ ngủ muộn hơn, bảo vệ giấc ngủ sau các buổi làm việc hoặc học tập ca tối.',
              },
            ].map(goal => {
              const isSelected = selectedGoal === goal.id;
              return (
                <div 
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#62D2FB]/15 shadow-md transform scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] hover:border-[#4CB28E]/60 dark:hover:border-[#62D2FB]/60 hover:-translate-y-1 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl shrink-0 leading-none">{goal.icon}</span>
                      <h4 className="font-heading font-bold text-lg sm:text-xl text-[#1F2937] dark:text-white leading-snug">
                        {goal.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {goal.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-[#4CB28E] bg-[#4CB28E] dark:border-[#62D2FB] dark:bg-[#62D2FB] text-white dark:text-[#0E172A]'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-6">
            <button 
              onClick={() => setStep(1)} 
              className="text-slate-500 hover:text-[#007b4d] dark:hover:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
            </button>
            <button 
              onClick={() => {
                if (selectedGoal) {
                  setCustomBedtime(recBedtime);
                  setCustomWakeTime(recWake);
                  setNapStart(recNapStart);
                  setNapDuration(recNapDurationMins.toString());
                  setStep(3);
                }
              }}
              disabled={!selectedGoal}
              className={`rounded-full px-8 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all shadow-md ${
                selectedGoal 
                  ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white cursor-pointer hover:-translate-y-1' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              {isEn ? "View Recommended Schedule" : "Xem đề xuất lịch ngủ"} →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RECOMMENDATION (BASED ON SELECTED GOAL - MATCHING IMAGE 2) */}
      {step === 3 && (
        <div className="w-full relative animate-fade-in text-left">
          {/* CONTEXTUAL BANNER FOR TODAY (DAYTIME VS EVENING AFTER 20:00) */}
          {planningMode === 'today' && !isTodayScheduleSaved && (
            <div className="w-full mb-6 p-4 sm:p-5 rounded-2xl bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#4CB28E]/40 dark:border-[#62D2FB]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left animate-fade-in shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{isNightWindDown ? "🌙" : "💡"}</span>
                <div>
                  <div className="font-bold text-sm sm:text-base text-[#007b4d] dark:text-[#62D2FB]">
                    {isNightWindDown
                      ? (isEn ? "Tonight's Recommended Bedtime" : "Giấc ngủ đề xuất cho đêm nay")
                      : (isEn ? "Day 1 Initial Estimate" : "Ước tính ban đầu cho hôm nay")}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-sans">
                    {isNightWindDown
                      ? (isEn
                          ? "It's past 20:00! You can review or adjust tonight's bedtime below to ensure fresh wake up tomorrow morning. Don't forget to set up Tomorrow's Schedule for full optimization!"
                          : "Đã qua 20:00 tối! Bạn có thể xem hoặc tùy chỉnh ngay giờ ngủ đêm nay bên dưới để thức dậy sáng mai thật sảng khoái. Đừng quên thiết lập Lịch ngày mai để đón đầu năng lượng nhé!")
                      : (isEn
                          ? "Today's schedule uses your onboarding profile estimate. You can adjust it below or set up your busy hours to customize precisely!"
                          : "Lịch hôm nay đang dùng ước tính ban đầu từ khảo sát của bạn. Bạn có thể tùy chỉnh ngay giờ ngủ bên dưới để phù hợp với lịch thực tế!")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTab('tomorrow')}
                className="px-5 py-2.5 rounded-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] text-xs sm:text-sm font-bold shrink-0 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap hover:-translate-y-0.5"
              >
                <span>{isEn ? "Plan Tomorrow →" : "Lập lịch ngày mai →"}</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider">
                {planningMode === 'tomorrow'
                  ? (isEn ? "Step 3: Tomorrow's Recommended Sleep Schedule" : "Bước 3: Lịch ngủ ngày mai đề xuất")
                  : (isEn ? "Step 3: Today's Recommended Sleep Schedule" : "Bước 3: Lịch ngủ hôm nay đề xuất")}
              </div>

              {planningMode === 'tomorrow' && (tomorrowSavedData || isTomorrowSavedBanner) && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 text-[#007b4d] dark:text-[#62D2FB] border border-[#007b4d]/30 dark:border-[#62D2FB]/30">
                  <span>✓</span>
                  <span>{isEn ? "Saved for tomorrow" : "Đã lưu cho ngày mai"}</span>
                </span>
              )}

              {planningMode === 'today' && isDayOneUser && !isRolledFromTomorrow && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 text-[#007b4d] dark:text-[#62D2FB] border border-[#007b4d]/30 dark:border-[#62D2FB]/30">
                  <span>🌱</span>
                  <span>{isEn ? "Day 1 Initial Estimate" : "Ước tính Ngày 1 (Khảo sát)"}</span>
                </span>
              )}

              {planningMode === 'today' && isRolledFromTomorrow && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 text-[#007b4d] dark:text-[#62D2FB] border border-[#007b4d]/30 dark:border-[#62D2FB]/30">
                  <span>✓</span>
                  <span>{isEn ? "Active from tomorrow's plan" : "Kích hoạt từ lịch ngày mai"}</span>
                </span>
              )}

              {planningMode === 'today' && !isDayOneUser && !isRolledFromTomorrow && (isScheduleAppliedToday || isTodaySavedBanner || localStorage.getItem('owlup_schedule_applied') === 'true') && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 text-[#007b4d] dark:text-[#62D2FB] border border-[#007b4d]/30 dark:border-[#62D2FB]/30">
                  <span>✓</span>
                  <span>{isEn ? "Saved for today" : "Đã lưu hôm nay"}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedGoal && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span>
                    {selectedGoal === 'healthy_balanced' && '🌱 Cân bằng lành mạnh'}
                    {selectedGoal === 'max_productivity' && '🚀 Năng suất tối đa'}
                    {selectedGoal === 'catch_up' && '⚡ Ngủ bù & Phục hồi'}
                    {selectedGoal === 'night_owl' && '🦉 Cú đêm / Ca muộn'}
                  </span>
                  <button 
                    onClick={() => setStep(2)}
                    className="text-[#007b4d] dark:text-[#62D2FB] hover:underline ml-1 cursor-pointer font-bold"
                  >
                    ({isEn ? "Change" : "Đổi"})
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-10">
             <h3 className="text-3xl sm:text-4xl font-heading font-bold text-[#1F2937] dark:text-white">
               {isEn ? "Scored" : "Đạt"} <span className="text-[#007b4d] dark:text-[#62D2FB]">{score}/100</span> {isEn ? "points" : "điểm"}
             </h3>
          </div>

          {/* Smart Sleep Debt Compensation Banner */}
          {historyAnalysis.hasDebt && (
            <div className="w-full mb-8 p-5 sm:p-6 rounded-2xl bg-[#FFFBEB] dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 shadow-sm flex items-start gap-4 animate-fade-in text-left">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-400/20 flex items-center justify-center shrink-0 text-xl">
                ⚖️
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
                    {isEn ? "Smart Sleep Debt Compensation" : "Bù đắp nợ ngủ thông minh"}
                  </span>
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {isEn 
                      ? `Yesterday's sleep deficit: ${historyAnalysis.yesterdaySleep}h slept (Debt: ${historyAnalysis.sleepDebtHours}h)` 
                      : `Phát hiện thiếu ngủ hôm trước: đã ngủ ${historyAnalysis.yesterdaySleep} giờ (Nợ ngủ: ${historyAnalysis.sleepDebtHours} giờ)`}
                  </span>
                </div>
                <p className="text-sm text-amber-800/90 dark:text-amber-200/80 leading-relaxed font-sans">
                  {isEn
                    ? `Based on your sleep debt from yesterday, OwlUp has automatically extended tonight's recommended sleep window and prioritized a restorative ${recNapDurationMins}-minute power nap to discharge accumulated adenosine and restore cognitive focus.`
                    : `Dựa trên nợ ngủ ${historyAnalysis.sleepDebtHours} giờ từ hôm trước, OwlUp đã tự động tối ưu lịch trình hôm nay: kéo dài thời gian ngủ đêm và sắp xếp giấc chợp mắt buổi trưa ${recNapDurationMins} phút để đào thải adenosine tích tụ và phục hồi sự tỉnh táo tối đa.`}
                </p>
              </div>
            </div>
          )}
          
          {/* Values resolution for display */}
          {(() => {
            const displayBed = planningMode === 'tomorrow'
              ? (tomorrowSavedData?.bedtimeTonight || customBedtime || recBedtime)
              : (customBedtime || bedtime || recBedtime);

            const displayWake = planningMode === 'tomorrow'
              ? (tomorrowSavedData?.wakeTimeTomorrow || customWakeTime || recWake)
              : (customWakeTime || wakeTime || recWake);

            const displayNStart = planningMode === 'tomorrow'
              ? (tomorrowSavedData?.napTomorrowStart || napStart || recNapStart)
              : (napStart || plannedNap?.start || recNapStart);

            let displayNDur: number;
            if (planningMode === 'tomorrow') {
              if (tomorrowSavedData?.napTomorrowDuration !== undefined) {
                displayNDur = Number(tomorrowSavedData.napTomorrowDuration);
              } else {
                const parsed = parseInt(napDuration);
                displayNDur = !isNaN(parsed) ? parsed : recNapDurationMins;
              }
            } else {
              const parsed = parseInt(napDuration);
              if (!isNaN(parsed)) {
                displayNDur = parsed;
              } else if (plannedNap?.duration !== undefined) {
                displayNDur = plannedNap.duration;
              } else {
                displayNDur = recNapDurationMins;
              }
            }

            const [dbh, dbm] = displayBed.split(':').map(Number);
            const [dwh, dwm] = displayWake.split(':').map(Number);
            let nSleepMins = (dwh * 60 + dwm) - (dbh * 60 + dbm);
            if (nSleepMins < 0) nSleepMins += 24 * 60;
            const displaySleepDuration = (nSleepMins / 60).toFixed(1);

            let caffCurfewMins = (dbh * 60 + dbm) - 10 * 60;
            while (caffCurfewMins < 0) caffCurfewMins += 24 * 60;
            const displayCaffeineCutoff = formatMins(caffCurfewMins);

            const [dnh, dnm] = displayNStart.split(':').map(Number);
            const displayNEnd = formatMins((dnh * 60 + dnm + displayNDur) % 1440);

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
                  {/* 1. Afternoon Power Nap */}
                  <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-3xl p-5 sm:p-6 lg:p-8 bg-white dark:bg-[#0F172A] shadow-sm overflow-hidden">
                    <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] tracking-wider mb-4 uppercase">
                      {planningMode === 'tomorrow'
                        ? (isEn ? "TOMORROW'S POWER NAP" : "CHỢP MẮT TRƯA MAI")
                        : (isEn ? "TODAY'S POWER NAP" : "CHỢP MẮT TRƯA NAY")}
                    </div>
                    {displayNDur > 0 ? (
                      <>
                        <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                          <span className="whitespace-nowrap">{formatDisplayTime(displayNStart, isEn)}</span>
                          <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                          <span className="whitespace-nowrap">{formatDisplayTime(displayNEnd, isEn)}</span>
                        </div>
                        <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">{isEn ? `Duration: ${displayNDur} min` : `Thời lượng: ${displayNDur} phút`}</div>
                        <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-4 leading-relaxed">
                          {isEn ? "Scheduled in your open window to discharge adenosine." : "Được lên lịch vào khung giờ rảnh để xả adenosine."}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xl sm:text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
                          {isEn ? "No Nap Scheduled" : "Không xếp lịch chợp mắt"}
                        </div>
                        <p className="text-sm text-[#1F2937]/70 dark:text-white/70 leading-relaxed mt-2 font-sans">
                          {isEn 
                            ? "Your busy commitments occupy the entire afternoon dip window. OwlUp protects your focus and prioritizes full restorative night sleep instead." 
                            : "Lịch bận kéo dài qua khung giờ trưa/chiều, không còn khoảng trống an toàn. OwlUp sẽ tối ưu giấc ngủ đêm để bù đắp năng lượng trọn vẹn cho bạn."}
                        </p>
                      </>
                    )}
                  </div>

                  {/* 2. Main Night Sleep */}
                  <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-3xl p-5 sm:p-6 lg:p-8 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
                    <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-4 uppercase">
                      {planningMode === 'tomorrow'
                        ? (isEn ? "MAIN NIGHT SLEEP TOMORROW" : "GIẤC NGỦ ĐÊM MAI")
                        : (isEn ? "MAIN NIGHT SLEEP TONIGHT" : "GIẤC NGỦ ĐÊM NAY")}
                    </div>
                    <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                      <span className="whitespace-nowrap">{formatDisplayTime(displayBed, isEn)}</span>
                      <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                      <span className="whitespace-nowrap">{formatDisplayTime(displayWake, isEn)}</span>
                    </div>
                    <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">{isEn ? `Duration: ${displaySleepDuration} hours` : `Thời lượng: ${displaySleepDuration} giờ`}</div>
                    <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-4 leading-relaxed">
                      {planningMode === 'tomorrow'
                        ? (isEn ? "Target bedtime tonight to ensure fresh awakening tomorrow." : "Giờ đi ngủ đêm nay để đảm bảo thức dậy sáng mai sảng khoái.")
                        : (isEn ? "Aligned with open windows to maximize restorative sleep." : "Giờ đi ngủ đêm nay để đảm bảo thức dậy sáng mai sảng khoái.")}
                    </div>
                  </div>

                  {/* 3. Recommended Caffeine Curfew */}
                  <div className="border border-red-200 dark:border-red-500/30 rounded-3xl p-5 sm:p-6 lg:p-8 bg-[#FEF5F5] dark:bg-red-950/20 shadow-sm overflow-hidden md:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300 tracking-wider mb-4 uppercase">
                      <span>🚫</span> {isEn ? "RECOMMENDED CAFFEINE CURFEW TIME" : "THỜI GIAN NGỪNG CAFFEINE ĐỀ XUẤT"}
                    </div>
                    <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 tabular-nums">
                      {formatDisplayTime(displayCaffeineCutoff, isEn)}
                    </div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                      {isEn 
                        ? `(10 hours before your ${formatDisplayTime(displayBed, isEn)} bedtime)` 
                        : `(10 tiếng trước giờ đi ngủ ${formatDisplayTime(displayBed, isEn)})`}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {isEn 
                        ? "This bedtime is used to determine your optimal caffeine curfew, ensuring your body eliminates caffeine before entering deep sleep cycles."
                        : "Thời gian ngủ này được dùng làm cơ sở đề xuất giờ ngừng nạp caffeine, đảm bảo cơ thể kịp đào thải sạch trước khi bước vào chu kỳ ngủ sâu."}
                    </div>
                  </div>
                </div>

                {/* Bottom action bar (Image 2 style) */}
                <div className="flex justify-between items-center mt-4">
                  <button 
                    onClick={() => setStep(2)} 
                    className="text-slate-400 hover:text-[#007b4d] dark:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
                  </button>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <button 
                      onClick={() => {
                        setCustomBedtime(displayBed);
                        setCustomWakeTime(displayWake);
                        setNapStart(displayNStart);
                        setNapDuration(displayNDur.toString());
                        setHasAppliedOptimal(false);
                        setStep(4);
                      }} 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-base sm:text-lg cursor-pointer transition-colors"
                    >
                      {isEn ? "Customize Schedule" : "Tùy chỉnh lịch trình"}
                    </button>
                    {!(planningMode === 'tomorrow'
                      ? Boolean(tomorrowSavedData || isTomorrowSavedBanner || localStorage.getItem('owlup_tomorrow_schedule'))
                      : Boolean(isScheduleAppliedToday || isTodaySavedBanner || localStorage.getItem('owlup_schedule_applied') === 'true')
                    ) && (
                      <button 
                        onClick={() => {
                          setCustomBedtime(displayBed);
                          setCustomWakeTime(displayWake);
                          setNapStart(displayNStart);
                          setNapDuration(displayNDur.toString());
                          try {
                            if (planningMode === 'tomorrow') {
                              const tomorrowData = {
                                bedtimeTonight: displayBed,
                                wakeTimeTomorrow: displayWake,
                                napTomorrowStart: displayNStart,
                                napTomorrowDuration: displayNDur,
                                expectedBedtimeTomorrow: tomorrowPredictedBedtime || '23:00',
                                goal: selectedGoal || 'healthy_balanced',
                                commitments: commitments,
                                createdAt: new Date().toISOString()
                              };
                              localStorage.setItem('owlup_tomorrow_commitments', JSON.stringify(commitments));
                              localStorage.setItem('owlup_tomorrow_recovery_goal', selectedGoal || 'healthy_balanced');
                              localStorage.setItem('owlup_tomorrow_schedule', JSON.stringify(tomorrowData));
                              setTomorrowSavedData(tomorrowData);
                              setIsTomorrowSavedBanner(true);
                              setIsTodaySavedBanner(false);
                              setStep(5); // Hiện thông báo đã lưu thành công kèm các tác vụ!
                              return;
                            } else {
                              localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                              localStorage.setItem('owlup_recovery_goal', selectedGoal || 'healthy_balanced');
                              localStorage.setItem('owlup_schedule_applied', 'true');
                              onApplySchedule(displayBed, displayWake, displaySleepDuration, displayNStart, displayNDur.toString());
                              setIsTodaySavedBanner(true);
                              setIsTomorrowSavedBanner(false);
                              setStep(5); // Hiện thông báo đã lưu thành công kèm các tác vụ!
                              return;
                            }
                          } catch {}
                        }}
                        className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] rounded-full px-8 sm:px-14 py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all duration-300 shadow-md cursor-pointer hover:-translate-y-1"
                      >
                        {isEn ? "Agree" : "Đồng ý"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* STEP 4: CUSTOMIZE */}
      {step === 4 && (
        <div className="w-full relative animate-fade-in text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider">
              {planningMode === 'tomorrow'
                ? (isEn ? "Step 4: Adjustment Hub (Tomorrow)" : "Bước 4: Trung tâm tùy chỉnh lịch trình (Ngày mai)")
                : (isEn ? "Step 4: Adjustment Hub (Today)" : "Bước 4: Trung tâm tùy chỉnh lịch trình (Hôm nay)")}
            </div>
          </div>
          
          <h3 className="text-3xl sm:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-2 text-left">
            {planningMode === 'tomorrow'
              ? (isEn ? "Customize Tomorrow's Schedule" : "Tùy chỉnh lịch trình ngày mai")
              : (isEn ? "Customize Today's Schedule" : "Tùy chỉnh lịch trình hôm nay")}
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6">
            {isEn
              ? "You can let OwlUp auto-recalculate by updating your commitments or recovery goal, or manually fine-tune sleep & nap hours below."
              : "Bạn có thể để OwlUp tự động tính lại bằng cách cập nhật lịch bận/mục tiêu phục hồi, hoặc tự tinh chỉnh giờ ngủ bên dưới."}
          </p>

          {/* Quick Adjustment Options: Commitments & Goal (Solution 2) */}
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base sm:text-lg">⚡</span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {isEn ? "Auto-Recalculate Sleep Cycles" : "Tự động tính lại chu kỳ tối ưu"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              {isEn
                ? "Changed your daytime plans? Update your busy slots or sleep goal to let OwlUp recalculate fresh optimal sleep windows:"
                : "Lịch trình thực tế có thay đổi? Hãy cập nhật khung giờ bận hoặc mục tiêu để OwlUp tính lại lịch ngủ phù hợp nhất:"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Button 1: Edit commitments */}
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 hover:border-[#007b4d] dark:hover:border-[#62D2FB] hover:shadow-md transition-all group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#007b4d] dark:text-[#62D2FB] flex items-center justify-center text-xl shrink-0">
                    📅
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#007b4d] dark:group-hover:text-[#62D2FB] transition-colors">
                      {planningMode === 'tomorrow'
                        ? (isEn ? "Edit Tomorrow's Commitments" : "Sửa khung giờ bận ngày mai")
                        : (isEn ? "Edit Today's Commitments" : "Sửa khung giờ bận hôm nay")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {commitments.length > 0
                        ? (isEn ? `${commitments.length} busy slot(s) added` : `Đang có ${commitments.length} khung giờ bận`)
                        : (isEn ? "No commitments added yet" : "Chưa có khung giờ bận")}
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#007b4d] dark:group-hover:text-[#62D2FB] group-hover:bg-emerald-50 dark:group-hover:bg-[#62D2FB]/10 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Button 2: Change recovery goal */}
              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 hover:border-[#007b4d] dark:hover:border-[#62D2FB] hover:shadow-md transition-all group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#007b4d] dark:group-hover:text-[#62D2FB] transition-colors">
                      {isEn ? "Change Recovery Goal" : "Đổi mục tiêu phục hồi"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedGoal === 'high_performance'
                        ? (isEn ? "Peak Recovery (8.5 - 9h)" : "Phục hồi tối đa (8.5 - 9h)")
                        : selectedGoal === 'exam_crunch'
                        ? (isEn ? "Busy & Exam Mode (6 - 7h)" : "Ôn thi & Bận rộn (6 - 7h)")
                        : (isEn ? "Balanced & Natural (7.5 - 8h)" : "Cân bằng & Tự nhiên (7.5 - 8h)")}
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#007b4d] dark:group-hover:text-[#62D2FB] group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {/* Section title for manual fine-tuning */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span>✍️</span>
              <span>{isEn ? "Or fine-tune sleep & nap hours manually:" : "Hoặc tự tinh chỉnh giờ ngủ & chợp mắt thủ công:"}</span>
            </div>
            {!hasAppliedOptimal && (
              <button
                onClick={() => {
                  if (tipData) {
                    setCustomBedtime(tipData.optimalBedtime);
                    setCustomWakeTime(tipData.optimalWake);
                    setNapStart(tipData.optimalNapStart);
                    setNapDuration(tipData.optimalNapDuration);
                    setHasAppliedOptimal(true);
                  }
                }}
                className="text-xs sm:text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>✨</span>
                <span>{isEn ? "Reset to optimal" : "Lấy lại giờ tối ưu"}</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mt-4 mb-10">
            {/* 1. Power Nap (Yellow) */}
            <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0F172A] shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] mb-4 uppercase">
                {planningMode === 'tomorrow'
                  ? (isEn ? "TOMORROW'S POWER NAP" : "CHỢP MẮT TRƯA MAI")
                  : (isEn ? "AFTERNOON POWER NAP" : "CHỢP MẮT BUỔI CHIỀU")}
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-[#FDE047]/80 pb-1 overflow-hidden">
                    <TimePickerInput value={napStart} onChange={(val) => { setNapStart(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                    {planningMode === 'tomorrow' ? (isEn ? "Nap Start" : "Giờ chợp mắt") : (isEn ? "Nap start" : "Giờ chợp mắt")}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <input type="number" value={napDuration} onChange={(e) => { 
                    let val = parseInt(e.target.value) || 0;
                    if (val > 90) {
                      val = 90;
                      setShowNapWarning(true);
                      setTimeout(() => setShowNapWarning(false), 3000);
                    }
                    setNapDuration(val.toString()); 
                    setHasAppliedOptimal(false); 
                  }} className="w-full bg-transparent border-b border-[#FDE047]/80 px-1 py-1 font-heading text-xl sm:text-2xl lg:text-[26px] font-bold text-[#1F2937] dark:text-white focus:outline-none focus:border-[#EAB308] transition-colors tabular-nums tracking-tight"/>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                    {isEn ? "Duration (min)" : "Thời lượng (phút)"}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Main night sleep (Green) */}
            <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-2xl p-5 sm:p-6 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] mb-4 uppercase">
                {planningMode === 'tomorrow'
                  ? (isEn ? "MAIN NIGHT SLEEP TOMORROW" : "GIẤC NGỦ ĐÊM MAI")
                  : (isEn ? "MAIN NIGHT SLEEP" : "GIẤC NGỦ ĐÊM NAY")}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mb-2">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-slate-300 dark:border-slate-500 pb-1 overflow-hidden">
                    <TimePickerInput value={customBedtime} onChange={(val) => { setCustomBedtime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                    {planningMode === 'tomorrow' ? (isEn ? "Bedtime" : "Giờ đi ngủ") : (isEn ? "Bedtime" : "Giờ đi ngủ")}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-slate-300 dark:border-slate-500 pb-1 overflow-hidden">
                    <TimePickerInput value={customWakeTime} onChange={(val) => { setCustomWakeTime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                    {planningMode === 'tomorrow' ? (isEn ? "Wake time" : "Giờ thức dậy") : (isEn ? "Wake time" : "Giờ thức dậy")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 TIME VALIDATION ERROR ALERT */}
          {(() => {
            const step3Errors: string[] = [];
            
            // Validate napStart
            // Check if napDuration is valid (allowed to be 0 if nap is omitted due to busy afternoon)
            const napDurNum = parseInt(napDuration) || 0;
            if (napDurNum < 0) {
              step3Errors.push(isEn ? "Nap duration cannot be negative." : "Thời lượng chợp mắt không được là số âm.");
            }

            // Only validate nap start and bedtime proximity if nap is active (> 0 min)
            if (napDurNum > 0) {
              const napStartErr = validateSingleTime(napStart, isEn ? "nap start time" : "thời gian bắt đầu chợp mắt");
              if (napStartErr) {
                step3Errors.push(napStartErr);
              } else if (!napStart || napStart === '--:--' || !napStart.includes(':')) {
                step3Errors.push(isEn ? "Please enter a valid nap start time." : "Vui lòng nhập giờ bắt đầu chợp mắt hợp lệ.");
              } else if (!isNapInCircadianWindow) {
                step3Errors.push(
                  isEn
                    ? "Afternoon power nap must be scheduled between 11:00 AM and 04:30 PM (11:00 - 16:30) to match circadian rhythms."
                    : "Giấc chợp mắt buổi chiều phải nằm trong khoảng 11:00 đến 16:30 để đồng bộ với nhịp trũng sinh học."
                );
              }

              if (isTimeFormatValid(napStart) && isTimeFormatValid(customBedtime) && !isNapFarFromBedtime) {
                step3Errors.push(
                  isEn
                    ? "Nap ends too close to bedtime. Keep at least 3 hours buffer before night sleep."
                    : "Giờ chợp mắt quá gần giờ ngủ đêm. Cần cách giờ đi ngủ tối thiểu 3 tiếng để tránh mất ngủ đêm."
                );
              }
            }

            // Validate customBedtime
            const bedErr = validateSingleTime(customBedtime, isEn ? "bedtime" : "giờ đi ngủ");
            if (bedErr) {
              step3Errors.push(bedErr);
            } else if (!customBedtime || customBedtime === '--:--' || !customBedtime.includes(':')) {
              step3Errors.push(isEn ? "Please enter a valid bedtime." : "Vui lòng nhập giờ đi ngủ hợp lệ.");
            }

            // Validate customWakeTime
            const wakeErr = validateSingleTime(customWakeTime, isEn ? "wake time" : "giờ thức dậy");
            if (wakeErr) {
              step3Errors.push(wakeErr);
            } else if (!customWakeTime || customWakeTime === '--:--' || !customWakeTime.includes(':')) {
              step3Errors.push(isEn ? "Please enter a valid wake time." : "Vui lòng nhập giờ thức dậy hợp lệ.");
            } else if (!hasValidNightSleep) {
              step3Errors.push(
                isEn
                  ? "Night sleep duration must be at least 4 hours."
                  : "Thời lượng giấc ngủ đêm tối thiểu phải từ 4 tiếng trở lên."
              );
            }

            if (step3Errors.length === 0) return null;

            return (
              <div className="mb-8 flex items-start gap-2.5 p-4 rounded-2xl bg-[#FEF5F5] dark:bg-[#7F1D1D]/20 border border-[#C10007]/30 dark:border-[#C10007]/50 text-[#C10007] dark:text-[#FCA5A5] text-sm font-medium animate-fade-in text-left">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C10007] dark:text-[#FCA5A5]" />
                <div className="flex flex-col gap-1">
                  {step3Errors.map((err, i) => (
                    <span key={i}>{err}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* LIVE SCORE BOX */}
          <div className="mb-10 text-[#1F2937] dark:text-white animate-fade-in">
            <div className={`inline-block px-4 py-1.5 text-white text-sm sm:text-base font-bold tracking-wider uppercase rounded-lg mb-4 shadow-sm ${
              !isStep3Valid 
                ? 'bg-[#C10007]' 
                : (isQualified ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]')
            }`}>
              {!isStep3Valid
                ? (isEn ? 'INVALID TIME' : 'THỜI GIAN KHÔNG HỢP LỆ')
                : (liveScore >= 90 ? (isEn ? 'QUALIFIED' : 'ĐẠT CHUẨN') : (hasAppliedOptimal ? (isEn ? 'OPTIMIZED' : 'ĐÃ TỐI ƯU') : (isEn ? 'NEEDS REFINEMENT' : 'CẦN TINH CHỈNH')))}
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg sm:text-xl font-bold font-heading">
                {isEn ? "Live Sleep Architecture Score:" : "Điểm Cấu trúc Giấc ngủ:"}
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold tabular-nums">
                {!isStep3Valid ? '--' : liveScore}/100
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm sm:text-base font-medium">
                  <span>{isEn ? "Total Sleep Duration:" : "Tổng thời lượng ngủ:"} {!isStep3Valid ? '--' : (totalSleepMins/60).toFixed(1)} {isEn ? "hrs" : "giờ"}</span>
                  <span className="text-slate-500 tabular-nums">({!isStep3Valid ? 0 : scoreDuration}/55)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className={`h-full ${scoreDuration >= 50 ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]'}`} style={{width: `${!isStep3Valid ? 0 : (scoreDuration/55)*100}%`}}></div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm sm:text-base font-medium">
                  <span>{isEn ? `Circadian Consistency: ${!isStep3Valid ? '--' : (liveCircadianShiftMins/60).toFixed(1)}h variance` : `Độ ổn định: chênh lệch ${!isStep3Valid ? '--' : (liveCircadianShiftMins/60).toFixed(1)}h`}</span>
                  <span className="text-slate-500 tabular-nums">({!isStep3Valid ? 0 : scoreCircadian}/45)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className={`h-full ${scoreCircadian >= 40 ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]'}`} style={{width: `${!isStep3Valid ? 0 : (scoreCircadian/45)*100}%`}}></div>
                </div>
              </div>
            </div>

            {!isQualified && tipData && (
              <div className={`mt-6 p-5 rounded-2xl border ${tipData.bg} ${tipData.border}`}>
                <div className={`text-base font-bold mb-1 ${tipData.color}`}>{tipData.title}</div>
                <div className="text-sm text-[#1F2937] dark:text-white font-medium leading-relaxed">
                  {tipData.desc}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button 
              onClick={() => {
                setStep(3);
              }} 
              className="text-slate-400 hover:text-[#007b4d] dark:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2 transition-colors cursor-pointer py-2 sm:py-0"
            >
              <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
            </button>
            
            {isQualified ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8 animate-fade-in">
                <button onClick={() => {
                  setStep(3);
                }} className="text-[#999999] hover:text-[#1F2937] font-bold text-base sm:text-lg cursor-pointer transition-colors py-2 text-center">
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button 
                  onClick={() => {
                    if (!isStep3Valid) return;
                    try {
                      if (planningMode === 'tomorrow') {
                        const tomorrowData = {
                          bedtimeTonight: customBedtime,
                          wakeTimeTomorrow: customWakeTime,
                          napTomorrowStart: napStart,
                          napTomorrowDuration: parseInt(napDuration) || 20,
                          expectedBedtimeTomorrow: tomorrowPredictedBedtime || '23:00',
                          goal: selectedGoal || 'healthy_balanced',
                          commitments: commitments,
                          createdAt: new Date().toISOString()
                        };
                        localStorage.setItem('owlup_tomorrow_commitments', JSON.stringify(commitments));
                        localStorage.setItem('owlup_tomorrow_recovery_goal', selectedGoal || 'healthy_balanced');
                        localStorage.setItem('owlup_tomorrow_schedule', JSON.stringify(tomorrowData));
                        setTomorrowSavedData(tomorrowData);
                        setIsTomorrowSavedBanner(true);
                        setStep(5); // Hiện thông báo đã lưu thành công
                        return;
                      } else {
                        localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                        localStorage.setItem('owlup_recovery_goal', selectedGoal || 'healthy_balanced');
                        localStorage.setItem('owlup_schedule_applied', 'true');
                        onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                        setIsTodaySavedBanner(true);
                        setIsTomorrowSavedBanner(false);
                        setStep(5); // Hiện thông báo đã lưu thành công
                      }
                    } catch {
                      if (planningMode === 'tomorrow') {
                        setStep(5);
                      } else {
                        onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                        setIsTodaySavedBanner(true);
                        setIsTomorrowSavedBanner(false);
                        setStep(5);
                      }
                    }
                  }} 
                  disabled={!isStep3Valid}
                  className={`rounded-full px-8 sm:px-12 py-3 sm:py-3.5 text-base sm:text-lg font-bold transition-all shadow-md text-center ${
                    isStep3Valid 
                      ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white cursor-pointer hover:-translate-y-1' 
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isEn ? (planningMode === 'today' ? "Save Schedule" : "Agree") : (planningMode === 'today' ? "Lưu lịch trình" : "Đồng ý")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 animate-fade-in">
                <button 
                  onClick={() => {
                    if (!isStep3Valid) return;
                    try {
                      if (planningMode === 'tomorrow') {
                        const tomorrowData = {
                          bedtimeTonight: customBedtime,
                          wakeTimeTomorrow: customWakeTime,
                          napTomorrowStart: napStart,
                          napTomorrowDuration: parseInt(napDuration) || 20,
                          expectedBedtimeTomorrow: tomorrowPredictedBedtime || '23:00',
                          goal: selectedGoal || 'healthy_balanced',
                          commitments: commitments,
                          createdAt: new Date().toISOString()
                        };
                        localStorage.setItem('owlup_tomorrow_commitments', JSON.stringify(commitments));
                        localStorage.setItem('owlup_tomorrow_recovery_goal', selectedGoal || 'healthy_balanced');
                        localStorage.setItem('owlup_tomorrow_schedule', JSON.stringify(tomorrowData));
                        setTomorrowSavedData(tomorrowData);
                        setIsTomorrowSavedBanner(true);
                        setStep(5); // Hiện thông báo đã lưu thành công
                        return;
                      } else {
                        localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                        localStorage.setItem('owlup_recovery_goal', selectedGoal || 'healthy_balanced');
                        localStorage.setItem('owlup_schedule_applied', 'true');
                        onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                        setIsTodaySavedBanner(true);
                        setIsTomorrowSavedBanner(false);
                        setStep(5); // Hiện thông báo đã lưu thành công
                      }
                    } catch {
                      if (planningMode === 'tomorrow') {
                        setStep(5);
                      } else {
                        onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                        setIsTodaySavedBanner(true);
                        setIsTomorrowSavedBanner(false);
                        setStep(5);
                      }
                    }
                  }} 
                  disabled={!isStep3Valid}
                  className={`font-bold text-sm sm:text-base md:text-lg px-5 sm:px-6 py-2.5 sm:py-3 border-2 border-dashed rounded-full text-center transition-all ${
                    isStep3Valid
                      ? 'border-slate-300 text-slate-500 hover:text-[#1F2937] hover:bg-slate-50 cursor-pointer'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isEn ? (planningMode === 'today' ? "Save Custom" : "Keep Custom") : (planningMode === 'today' ? "Lưu lịch tùy chỉnh" : "Giữ tùy chỉnh")}
                </button>
                <button 
                  onClick={() => {
                    if (tipData) {
                      setCustomBedtime(tipData.optimalBedtime);
                      setCustomWakeTime(tipData.optimalWake);
                      setNapStart(tipData.optimalNapStart);
                      setNapDuration(tipData.optimalNapDuration);
                      setHasAppliedOptimal(true);
                    }
                  }} 
                  className="bg-[#EAB308] hover:bg-[#CA8A04] text-white rounded-full px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-1 flex items-center justify-center gap-2 text-center"
                >
                  <span className="text-xl">✨</span> {isEn ? "Apply Optimal Cycles" : "Áp dụng tối ưu"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS / SUMMARY */}
      {step === 5 && (() => {
        const effectiveBed = planningMode === 'tomorrow'
          ? (tomorrowSavedData?.bedtimeTonight || customBedtime || '22:30')
          : (customBedtime || bedtime || '22:30');
        const effectiveWake = planningMode === 'tomorrow'
          ? (tomorrowSavedData?.wakeTimeTomorrow || customWakeTime || '06:30')
          : (customWakeTime || wakeTime || '06:30');
        const effectiveNStart = planningMode === 'tomorrow'
          ? (tomorrowSavedData?.napTomorrowStart || napStart || '12:30')
          : (napStart || plannedNap?.start || '12:30');
        const rawDurNum = planningMode === 'tomorrow'
          ? (tomorrowSavedData?.napTomorrowDuration !== undefined ? Number(tomorrowSavedData.napTomorrowDuration) : parseInt(napDuration))
          : parseInt(napDuration);
        const effectiveNDur = !isNaN(rawDurNum) ? rawDurNum : (plannedNap?.duration !== undefined ? plannedNap.duration : 0);
        const [nh, nm] = effectiveNStart.split(':').map(Number);
        const nEndMins = (nh * 60 + nm + effectiveNDur) % 1440;
        const neh = Math.floor(nEndMins / 60);
        const nem = nEndMins % 60;
        const effectiveNEnd = `${neh.toString().padStart(2, '0')}:${nem.toString().padStart(2, '0')}`;
        const [bh, bm] = effectiveBed.split(':').map(Number);
        const [wh, wm] = effectiveWake.split(':').map(Number);
        let sleepMins = (wh * 60 + wm) - (bh * 60 + bm);
        if (sleepMins < 0) sleepMins += 24 * 60;
        const nightHours = sleepMins / 60;
        const formattedNightDuration = Number.isInteger(nightHours)
          ? `${nightHours} ${isEn ? "hrs" : "giờ"}`
          : `${nightHours.toFixed(1)} ${isEn ? "hrs" : "giờ"}`;

        let summaryCurfewMins = (bh * 60 + bm) - 10 * 60;
        while (summaryCurfewMins < 0) summaryCurfewMins += 24 * 60;
        const summaryCurfew = formatMins(summaryCurfewMins);

        return (
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="bg-white dark:bg-[#233355] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#4CB28E] dark:bg-[#62D2FB]"></div>
            
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-[#4CB28E] dark:text-[#62D2FB]" />
            </div>

            <h3 className="text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
              {planningMode === 'tomorrow'
                ? (isEn ? "Tomorrow's Schedule Saved!" : "Đã lưu lịch ngày mai thành công!")
                : (isEn ? "Schedule Successfully Saved!" : "Đã lưu lịch ngủ thành công!")}
            </h3>

            {planningMode === 'tomorrow' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                {isEn
                  ? "This schedule will automatically become Today's sleep schedule and sync to Timeline after 00:00 midnight (Day 2)."
                  : "Lịch trình này sẽ tự động chuyển thành Lịch ngủ hôm nay và đồng bộ vào Dòng thời gian sau 00:00 đêm nay (khi bước sang Ngày 2)."}
              </p>
            )}
            
            <div className={`flex flex-col text-left mb-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#233355] rounded-2xl p-5 shadow-sm ${planningMode === 'tomorrow' ? 'mt-3' : 'mt-6'}`}>
              <div className="py-3.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-baseline gap-3 sm:gap-4">
                  <div className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {planningMode === 'tomorrow' ? (isEn ? "Tomorrow's Nap" : "Chợp mắt trưa mai") : (isEn ? "Afternoon Nap" : "Chợp mắt buổi trưa")}
                  </div>
                  {effectiveNDur > 0 ? (
                    <div className="text-base sm:text-lg md:text-xl font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB] tabular-nums text-right whitespace-nowrap shrink-0 inline-flex items-baseline">
                      <span className="whitespace-nowrap">{formatDisplayTime(effectiveNStart, isEn)}</span>
                      <span className="font-sans font-normal text-slate-400 mx-1 sm:mx-1.5 shrink-0">→</span>
                      <span className="whitespace-nowrap">{formatDisplayTime(effectiveNEnd, isEn)}</span>
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base font-heading font-bold text-[#1F2937] dark:text-white text-right whitespace-nowrap shrink-0">
                      {isEn ? "No Nap Scheduled" : "Không xếp lịch chợp mắt"}
                    </div>
                  )}
                </div>
                {effectiveNDur > 0 && (
                  <div className="flex justify-end mt-0.5">
                    <span className="text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-400 whitespace-nowrap">
                      {effectiveNDur} {isEn ? "min" : "phút"}
                    </span>
                  </div>
                )}
              </div>

              <div className="py-3.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-baseline gap-3 sm:gap-4">
                  <div className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {planningMode === 'tomorrow' ? (isEn ? "Tomorrow's Sleep" : "Giấc ngủ đêm mai") : (isEn ? "Main Sleep" : "Giấc ngủ đêm")}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB] tabular-nums text-right whitespace-nowrap shrink-0 inline-flex items-baseline">
                    <span className="whitespace-nowrap">{formatDisplayTime(effectiveBed, isEn)}</span>
                    <span className="font-sans font-normal text-slate-400 mx-1 sm:mx-1.5 shrink-0">→</span>
                    <span className="whitespace-nowrap">{formatDisplayTime(effectiveWake, isEn)}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className="text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-400 whitespace-nowrap">
                    {formattedNightDuration}
                  </span>
                </div>
              </div>

              <div className="py-3.5">
                <div className="flex justify-between items-baseline gap-3 sm:gap-4">
                  <div className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {planningMode === 'tomorrow' ? (isEn ? "Tomorrow's Caffeine Curfew" : "Ngừng Caffeine ngày mai") : (isEn ? "Caffeine Curfew" : "Ngừng Caffeine")}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB] tabular-nums text-right whitespace-nowrap shrink-0">
                    {formatDisplayTime(summaryCurfew, isEn)}
                  </div>
                </div>
              </div>
            </div>

            {planningMode === 'today' && (
              <div className="mb-6 p-4 rounded-2xl bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d]/30 dark:border-[#62D2FB]/30 text-left animate-fade-in flex items-start gap-3 shadow-sm">
                <span className="text-xl shrink-0 mt-0.5">💡</span>
                <div>
                  <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB]">
                    {isEn ? "Tonight's Routine Tip" : "Gợi ý lịch trình buổi tối"}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed font-sans">
                    {isEn
                      ? "You now have an optimal plan for today! In the evening (after 20:00 before bed), come back to plan for tomorrow to stay ahead of your energy curve."
                      : "Bạn đã có lịch tối ưu cho hôm nay! Vào buổi tối (từ 20:00 trước khi đi ngủ), hãy quay lại sắp xếp lịch cho ngày mai để đón đầu năng lượng nhé."}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {planningMode === 'today' && (
                <button 
                  onClick={() => {
                    if (onNavigateToCaffeine) onNavigateToCaffeine();
                  }}
                  className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white rounded-full py-4 text-lg font-bold transition-all duration-300 shadow-md hover:-translate-y-1 cursor-pointer"
                >
                  {isEn ? "Log Caffeine" : "Nhập Caffeine"}
                </button>
              )}

              <button 
                onClick={() => {
                  if (onNavigateToDashboard) onNavigateToDashboard();
                }}
                className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white rounded-full py-4 text-lg font-bold transition-all duration-300 shadow-md hover:-translate-y-1 cursor-pointer"
              >
                {isEn ? "Back to Dashboard" : "Về Tổng quan"}
              </button>

              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 bg-transparent border border-slate-300 dark:border-slate-600 hover:border-[#4CB28E] dark:hover:border-[#62D2FB] text-slate-600 dark:text-slate-300 hover:text-[#4CB28E] dark:hover:text-[#62D2FB] rounded-full py-3 text-sm sm:text-base font-bold transition-colors cursor-pointer text-center"
                >
                  {isEn ? "View Schedule Card" : "Xem thẻ lịch ngủ"}
                </button>
                <button 
                  onClick={() => setStep(4)}
                  className="flex-1 bg-transparent border border-slate-300 dark:border-slate-600 hover:border-[#4CB28E] dark:hover:border-[#62D2FB] text-slate-600 dark:text-slate-300 hover:text-[#4CB28E] dark:hover:text-[#62D2FB] rounded-full py-3 text-sm sm:text-base font-bold transition-colors cursor-pointer text-center"
                >
                  {isEn ? "Adjust Sleep & Nap Again" : "Chỉnh sửa lại giấc ngủ"}
                </button>
              </div>

              {planningMode === 'today' ? (
                <button 
                  onClick={() => handleSwitchTab('tomorrow')}
                  className="mt-2 text-xs sm:text-sm font-semibold text-[#007b4d] dark:text-[#62D2FB] hover:underline flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>🌅</span>
                  <span>{isEn ? "Plan for Tomorrow (Optional) →" : "Lập luôn lịch ngày mai (Tùy chọn) →"}</span>
                </button>
              ) : (
                <button 
                  onClick={() => handleSwitchTab('today')}
                  className="mt-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-[#007b4d] dark:hover:text-[#62D2FB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>🌙</span>
                  <span>{isEn ? "Switch to Today Schedule" : "Chuyển sang Lịch ngủ hôm nay"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      </div>
    </div>
  );
};
export default RecoveryPlanner;
