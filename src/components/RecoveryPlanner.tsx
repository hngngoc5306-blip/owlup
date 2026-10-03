import React, { useState, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  Coffee, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Sliders, 
  ChevronRight, 
  Sparkles, 
  Info,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  X,
  Sunrise
} from 'lucide-react';
import { TimePickerInput } from './TimePickerInput';
import { AppLanguage, UserProfile, DayRecoveryGoal } from '../types';
import { formatDisplayTime } from '../utils/timeFormat';

export interface RecoveryPlannerProps {
  isNight: boolean;
  language?: AppLanguage;
  userProfile?: UserProfile | null;
  bedtime?: string;
  wakeTime?: string;
  totalSleepHours?: string;
  plannedNap?: { start: string; end: string; duration: number } | null;
  commitments?: { title: string; start: string; end: string }[];
  onApplySchedule: (bedtime: string, wakeTime: string, totalHours: string, napStart?: string, napDuration?: string) => void;
  onUpdateCommitments?: (commitments: { title: string; start: string; end: string }[]) => void;
  onNavigateToTimeline?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToCaffeine?: () => void;
}

export const RecoveryPlanner: React.FC<RecoveryPlannerProps> = ({
  isNight,
  language = 'en',
  userProfile,
  bedtime,
  wakeTime,
  totalSleepHours,
  plannedNap,
  commitments: commitmentsProp,
  onApplySchedule,
  onUpdateCommitments,
  onNavigateToTimeline,
  onNavigateToDashboard,
  onNavigateToCaffeine,
}) => {
  const isEn = language === 'en';

  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── Context-Aware Time Windows ──────────────────────────────────────────────
  // 1. Sáng & Trưa (< 14:00): Full day planning (Daytime commitments + Nap + Night sleep)
  // 2. Chiều (14:00 - 18:00): Afternoon & evening planning (< 15:30 quick nap; >= 15:30 no nap + tip)
  // 3. Tối (>= 18:00): Evening commitments + Night sleep focus (No nap)
  const currentHour = new Date().getHours();
  const currentMinutes = currentHour * 60 + new Date().getMinutes();
  const isMorningWindow = currentHour < 14;
  const isAfternoonWindow = currentHour >= 14 && currentHour < 18;
  const isEveningWindow = currentHour >= 18;
  const isPastNapSafeCutoff = currentMinutes >= 15 * 60 + 30; // 15:30 cutoff for safe power napping

  const isScheduleAppliedToday = (() => {
    try {
      const todayStr = getTodayDateStr();
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      return applied === 'true' && (scheduleDate === todayStr || !scheduleDate);
    } catch {
      return false;
    }
  })();

  const [scheduleSaved, setScheduleSaved] = useState<boolean>(() => isScheduleAppliedToday);
  const hasSavedSchedule = scheduleSaved || isScheduleAppliedToday;

  // ── Core Anchor: Latest Wake-Up Time Tomorrow Morning ───────────────────────
  // Default: 07:00 or user's stored preference
  const [latestWakeUpTime, setLatestWakeUpTime] = useState<string>(() => {
    try {
      return localStorage.getItem('owlup_latest_waketime') || localStorage.getItem('owlup_waketime') || '07:00';
    } catch {
      return '07:00';
    }
  });

  // Selected Recovery Goal (4 scientific goals)
  const [selectedGoal, setSelectedGoal] = useState<'healthy_balanced' | 'max_productivity' | 'catch_up' | 'night_owl' | null>(() => {
    try {
      const savedGoal = localStorage.getItem('owlup_recovery_goal');
      if (savedGoal && ['healthy_balanced', 'max_productivity', 'catch_up', 'night_owl'].includes(savedGoal)) {
        return savedGoal as any;
      }
      return userProfile?.energyCrave === 'productivity' ? 'max_productivity' : 'healthy_balanced';
    } catch {
      return 'healthy_balanced';
    }
  });

  // Step state machine:
  // 1: Busy commitments (Context-aware form)
  // 2: Circadian Wake-Up Anchor & Recovery Goal
  // 3: Recommended recovery routine & caffeine curfew
  // 4: Flexible customization hub
  // 5: Success confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(() => {
    try {
      if (isScheduleAppliedToday) return 3;
      const savedComms = localStorage.getItem('owlup_commitments');
      if (savedComms && JSON.parse(savedComms).length > 0) return 2;
    } catch {}
    return 1;
  });

  const [isSavedBanner, setIsSavedBanner] = useState(false);

  // Commitments State
  const [isAdding, setIsAdding] = useState(false);
  const [commitments, setCommitments] = useState<{ title: string; start: string; end: string }[]>(() => {
    try {
      const saved = localStorage.getItem('owlup_commitments');
      if (saved) return JSON.parse(saved);
      if (commitmentsProp && commitmentsProp.length > 0) return commitmentsProp;
      return [];
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Customization states (Step 4)
  const [customBedtime, setCustomBedtime] = useState(() => {
    return bedtime || (() => {
      try { return localStorage.getItem('owlup_bedtime') || '22:30'; } catch { return '22:30'; }
    })();
  });
  const [customWakeTime, setCustomWakeTime] = useState(() => {
    return wakeTime || (() => {
      try { return localStorage.getItem('owlup_waketime') || '07:00'; } catch { return '07:00'; }
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
          if (parsed.duration !== undefined) return parsed.duration.toString();
        }
      } catch {}
      return '20';
    })();
  });
  const [hasAppliedOptimal, setHasAppliedOptimal] = useState(false);
  const [showNapWarning, setShowNapWarning] = useState(false);

  React.useEffect(() => {
    if (commitmentsProp && commitmentsProp.length > 0) {
      setCommitments(commitmentsProp);
    }
  }, [commitmentsProp]);

  // ── Helper math & formatters ────────────────────────────────────────────────
  const parseMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  
  const formatMins = (m: number) => {
    const total = (Math.round(m) + 24 * 60 * 2) % (24 * 60);
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
  
  // Calculate Scores (Duration max 55 pts, Circadian max 45 pts)
  let scoreDuration = 55 - Math.max(0, (7.5 * 60 - totalSleepMins) / 60) * 12;
  if (scoreDuration < 0) scoreDuration = 0;
  if (scoreDuration > 55) scoreDuration = 55;
  scoreDuration = Math.round(scoreDuration);

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
  const isNapInCircadianWindow = isTimeFormatValid(napStart) && napStartMinsVal >= 11 * 60 && napStartMinsVal <= 16 * 60 + 30;
  const hasValidNightSleep = isTimeFormatValid(customBedtime) && isTimeFormatValid(customWakeTime) && liveDurationMins >= 4 * 60;

  const isNapFarFromBedtime = (() => {
    if (!isTimeFormatValid(napStart) || !isTimeFormatValid(customBedtime)) return false;
    const napDur = parseInt(napDuration) || 0;
    const napEnd = napStartMinsVal + napDur;
    let diffToBed = liveBedtimeMins - napEnd;
    if (diffToBed < 0 && liveBedtimeMins < 12 * 60) diffToBed += 24 * 60;
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

  // ── Sleep Debt Analysis ─────────────────────────────────────────────────────
  const historyAnalysis = (() => {
    try {
      const raw = localStorage.getItem('owlup_history');
      if (raw) {
        const historyObj: Record<string, any> = JSON.parse(raw);
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let targetEntry = historyObj[yesterdayStr];
        if (!targetEntry) {
          const keys = Object.keys(historyObj).filter(k => k < getTodayDateStr()).sort().reverse();
          if (keys.length > 0) targetEntry = historyObj[keys[0]];
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

  // ── 1. Target Durations and Circadian Ideal Bedtimes per Goal ──────────────
  let goalTargetSleepMins = 8 * 60; // 8h default (healthy_balanced)
  let goalIdealBedMins = 22 * 60 + 30; // 22:30 ideal circadian bedtime
  let goalBaseNap = 20;

  if (selectedGoal === 'catch_up') {
    goalTargetSleepMins = 8 * 60 + 45; // 8h45m
    goalIdealBedMins = 21 * 60 + 45; // 21:45 early sleep for deep restoration
    goalBaseNap = 30;
  } else if (selectedGoal === 'max_productivity') {
    goalTargetSleepMins = 7 * 60 + 15; // 7h15m
    goalIdealBedMins = 22 * 60 + 30; // 22:30 -> wake at 05:45/06:00
    goalBaseNap = 20;
  } else if (selectedGoal === 'night_owl') {
    goalTargetSleepMins = 7 * 60 + 45; // 7h45m
    goalIdealBedMins = 23 * 60 + 45; // 23:45
    goalBaseNap = 25;
  }

  const extraDebtMins = historyAnalysis.hasDebt ? Math.min(60, Math.round(historyAnalysis.sleepDebtHours * 30)) : 0;
  const targetDurationMins = goalTargetSleepMins + extraDebtMins;

  // ── 2. Calculate Wake Deadline anchored by latestWakeUpTime ─────────────────
  const morningComms = commitments
    .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
    .filter(c => c.startMins >= 4 * 60 && c.startMins <= 10 * 60)
    .sort((a, b) => a.startMins - b.startMins);

  const hasMorningComm = morningComms.length > 0;
  const latestWakeMins = parseMins(latestWakeUpTime || '07:00');

  // Deadline for wake up: earliest of morning commitments (with 30m prep) and latestWakeUpTime
  let deadlineWakeMins = latestWakeMins;
  if (hasMorningComm) {
    const commWakeRequired = Math.max(4 * 60 + 30, morningComms[0].startMins - 30);
    deadlineWakeMins = Math.min(commWakeRequired, latestWakeMins);
  }

  // ── 3. Evening Commitments Constraint ───────────────────────────────────────
  let latestEveningBusyMins = 0;
  commitments.forEach(c => {
    const s = parseMins(c.start);
    let e = parseMins(c.end);
    if (e < s) e += 24 * 60;
    if (e > 20 * 60 && e > latestEveningBusyMins) {
      latestEveningBusyMins = e;
    }
  });

  const earliestBedAfterCommMins = latestEveningBusyMins > 0 ? latestEveningBusyMins + 30 : 0;

  // ── 4. Harmonize Bedtime & Wake Time ─────────────────────────────────────────
  // Default bedtime starts at the natural circadian ideal (e.g. 22:30 for balanced):
  let chosenBedContMins = goalIdealBedMins;
  if (chosenBedContMins < 12 * 60) chosenBedContMins += 24 * 60;

  // If user is busy past the ideal bedtime, delay bedtime accordingly:
  if (earliestBedAfterCommMins > 0 && earliestBedAfterCommMins > chosenBedContMins) {
    chosenBedContMins = earliestBedAfterCommMins;
  }

  // Continuous wake deadline (next morning):
  let contDeadlineWake = deadlineWakeMins;
  while (contDeadlineWake <= chosenBedContMins) contDeadlineWake += 24 * 60;

  // Check if sleeping at chosenBedContMins would cause user to wake up AFTER the deadline:
  let naturalWakeContMins = chosenBedContMins + targetDurationMins;

  // If natural wake exceeds deadline, bedtime must shift earlier:
  if (naturalWakeContMins > contDeadlineWake) {
    let shiftedBedMins = contDeadlineWake - targetDurationMins;
    if (earliestBedAfterCommMins > 0 && shiftedBedMins < earliestBedAfterCommMins) {
      shiftedBedMins = earliestBedAfterCommMins;
    }
    chosenBedContMins = shiftedBedMins;
  }

  // Calculate final wake time (cannot exceed contDeadlineWake):
  let finalWakeContMins = chosenBedContMins + targetDurationMins;
  if (finalWakeContMins > contDeadlineWake) {
    finalWakeContMins = contDeadlineWake;
  }

  let finalBedtimeMins = chosenBedContMins % (24 * 60);
  let finalWakeMins = finalWakeContMins % (24 * 60);

  // Biological Clamp: Keep night bedtime between 21:00 and 01:30
  if (finalBedtimeMins > 1 * 60 + 30 && finalBedtimeMins < 20 * 60) {
    finalBedtimeMins = selectedGoal === 'night_owl' ? 0 * 60 + 30 : 22 * 60 + 30;
  }

  finalBedtimeMins = Math.round(finalBedtimeMins / 5) * 5 % (24 * 60);
  finalWakeMins = Math.round(finalWakeMins / 5) * 5 % (24 * 60);

  let actualRecDurationMins = finalWakeContMins - chosenBedContMins;
  if (actualRecDurationMins < 0) actualRecDurationMins += 24 * 60;
  const lostSleepMins = Math.max(0, targetDurationMins - actualRecDurationMins);

  // ── 3. Calculate Power Nap (Respects Context Windows) ────────────────────────
  let canNapToday = true;
  let calcNapDuration = 20;

  // Science rule: If user opens app in the evening (>= 18:00) or past afternoon cutoff (>= 15:30),
  // napping is omitted to protect night sleep adenosine pressure!
  if (isEveningWindow || (isAfternoonWindow && isPastNapSafeCutoff)) {
    canNapToday = false;
    calcNapDuration = 0;
  } else {
    const userHasNapCrave = userProfile?.craves?.includes('nap') 
      || userProfile?.energyCraves?.includes('nap')
      || userProfile?.energyCrave === 'nap'
      || (Array.isArray(userProfile?.energyCrave) && userProfile.energyCrave.includes('nap'));
    
    let baseNap = userHasNapCrave ? Math.max(goalBaseNap, 30) : goalBaseNap;
    if (historyAnalysis.hasDebt) baseNap = Math.max(baseNap, 25);
    calcNapDuration = Math.min(45, baseNap + Math.min(20, Math.floor(lostSleepMins / 30) * 10));

    // If in afternoon window (14:00 - 15:30), cap nap to 20m quick nap
    if (isAfternoonWindow && !isPastNapSafeCutoff) {
      calcNapDuration = Math.min(20, calcNapDuration);
    }
  }

  let idealNapStartMins = isAfternoonWindow 
    ? Math.max(14 * 60 + 15, currentMinutes + 15) // quick nap starting soon
    : (selectedGoal === 'night_owl' ? 13 * 60 + 15 : 13 * 60);
  let napStartMins = idealNapStartMins;

  // Check nap collisions with commitments
  if (canNapToday && commitments.length > 0) {
    const sortedComms = [...commitments]
      .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
      .sort((a, b) => a.startMins - b.startMins);

    const POST_COMMITMENT_BUFFER = 30;
    const PRE_COMMITMENT_BUFFER = 15;

    const isOverlapWithBuffer = (s: number, dur: number) => {
      const e = s + dur;
      return sortedComms.some(c => {
        const effectiveBusyStart = c.startMins - PRE_COMMITMENT_BUFFER;
        const effectiveBusyEnd = c.endMins + POST_COMMITMENT_BUFFER;
        return s < effectiveBusyEnd && e > effectiveBusyStart;
      });
    };

    if (isOverlapWithBuffer(napStartMins, calcNapDuration)) {
      let foundSlot = false;
      for (const c of sortedComms) {
        let candidateStart = Math.ceil((c.endMins + POST_COMMITMENT_BUFFER) / 5) * 5;
        if (candidateStart >= 12 * 60 && candidateStart + calcNapDuration <= 15 * 60 + 30) {
          if (!isOverlapWithBuffer(candidateStart, calcNapDuration)) {
            napStartMins = candidateStart;
            foundSlot = true;
            break;
          }
        }
      }
      if (!foundSlot) {
        canNapToday = false;
        calcNapDuration = 0;
      }
    }
  }

  const recBedtime = formatMins(finalBedtimeMins);
  const recWake = formatMins(finalWakeMins);
  const recSleepDuration = (actualRecDurationMins / 60).toFixed(1);
  const recNapStart = formatMins(napStartMins);
  const recNapEnd = formatMins(napStartMins + calcNapDuration);
  const recNapDurationMins = calcNapDuration;

  // Caffeine Curfew: 10h before bedtime
  let cutoffMins = finalBedtimeMins - 10 * 60;
  while (cutoffMins < 0) cutoffMins += 24 * 60;
  const recCaffeineCutoff = formatMins(cutoffMins);

  // Helper for Step 2 cards: calculate bedtime for each goal dynamically
  const getBedtimeForGoal = (goalId: 'healthy_balanced' | 'max_productivity' | 'catch_up' | 'night_owl') => {
    let dur = 8 * 60;
    let idealBed = 22 * 60 + 30; // 22:30 ideal
    if (goalId === 'max_productivity') {
      dur = 7 * 60 + 15;
      idealBed = 22 * 60 + 30; // 22:30
    } else if (goalId === 'catch_up') {
      dur = 8 * 60 + 45;
      idealBed = 21 * 60 + 45; // 21:45
    } else if (goalId === 'night_owl') {
      dur = 7 * 60 + 45;
      idealBed = 23 * 60 + 45; // 23:45
    }

    const wMins = parseMins(latestWakeUpTime || '07:00');
    let contDeadline = wMins;
    while (contDeadline <= idealBed) contDeadline += 24 * 60;

    let chosenBed = idealBed;
    // If waking up naturally exceeds the latest wake deadline, shift bedtime earlier:
    if (idealBed + dur > contDeadline) {
      chosenBed = contDeadline - dur;
      while (chosenBed < 0) chosenBed += 24 * 60;
    }

    chosenBed = Math.round(chosenBed / 5) * 5 % (24 * 60);
    return formatMins(chosenBed);
  };

  // Free Recovery Windows Calculation
  const getFreeWindows = () => {
    if (commitments.length === 0) return ["00:00 - 23:59"];
    const parsed = commitments.map(c => ({
      start: parseMins(c.start),
      end: parseMins(c.end)
    })).sort((a, b) => a.start - b.start);
    
    const merged: { start: number; end: number }[] = [];
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
    const wakeStr = latestWakeUpTime || '07:00';
    const wakeMinsVal = parseMins(wakeStr);
    const firstComm = merged[0];
    
    if (firstComm && firstComm.start >= wakeMinsVal + 30) {
      gaps.push(`${formatMins(wakeMinsVal)} - ${formatMins(firstComm.start)}`);
    }

    let current = firstComm ? firstComm.end : 0;
    for (let i = 1; i < merged.length; i++) {
      const m = merged[i];
      if (m.start > current) {
        if (m.start - current >= 15) {
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

  // Commitments Form handlers
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
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else {
      setStep(4);
    }
  };

  const validateTimes = (start: string, end: string): { valid: boolean; error: string | null } => {
    if (!start || !end || start === '--:--' || end === '--:--' || !start.includes(':') || !end.includes(':')) {
      return {
        valid: false,
        error: isEn ? "Please enter both start and end times." : "Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc."
      };
    }
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em) || sh < 0 || sh > 23 || eh < 0 || eh > 23 || sm < 0 || sm > 59 || em < 0 || em > 59) {
      return {
        valid: false,
        error: isEn ? "Time out of range (00:00 - 23:59). Please re-enter." : "Thời gian ngoài phạm vi (00:00 - 23:59). Vui lòng điền lại."
      };
    }
    if (sh * 60 + sm >= eh * 60 + em) {
      return {
        valid: false,
        error: isEn
          ? "Start time must be earlier than end time (e.g. 09:00 AM → 10:00 AM)."
          : "Thời gian bắt đầu phải sớm hơn thời gian kết thúc (VD: 09:00 → 10:00)."
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
    const addedTitle = newTitle.trim() || (isEn ? 'Busy Block' : 'Lịch bận');
    
    let list = editingIndex !== null && editingIndex >= 0 && editingIndex < commitments.length
      ? commitments.map((c, idx) => idx === editingIndex ? { title: addedTitle, start: newStart, end: newEnd } : c)
      : [...commitments, { title: addedTitle, start: newStart, end: newEnd }];

    list.sort((a, b) => parseMins(a.start) - parseMins(b.start));
    setCommitments(list);
    try {
      localStorage.setItem('owlup_commitments', JSON.stringify(list));
      localStorage.setItem('owlup_schedule_date', getTodayDateStr());
      if (onUpdateCommitments) onUpdateCommitments(list);
    } catch {}

    setIsAdding(false);
    setEditingIndex(null);
    setNewTitle('');
  };

  const removeCommitment = (index: number) => {
    const updated = commitments.filter((_, i) => i !== index);
    setCommitments(updated);
    try {
      localStorage.setItem('owlup_commitments', JSON.stringify(updated));
      localStorage.setItem('owlup_schedule_date', getTodayDateStr());
      if (onUpdateCommitments) onUpdateCommitments(updated);
    } catch {}
  };

  // Score
  let score = 96;
  if (selectedGoal === 'max_productivity') score = 94;
  else if (selectedGoal === 'catch_up') score = 95;
  else if (selectedGoal === 'night_owl') score = 93;
  if (historyAnalysis.hasDebt) score -= 2;
  if (lostSleepMins > 45) score -= 2;
  if (score < 90) score = 90;

  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      {/* HEADER BANNER */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-xs sm:text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] mb-3">
          <span>🔄</span>
          <span>{isEn ? "24-Hour Circadian Recovery Cycle" : "Chu kỳ Phục hồi Nhịp Sinh Học 24h"}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-[#1F2937] dark:text-[#F8FAFC]">
          {isEn ? "Synchronize Sleep & Power Nap" : "Đồng bộ Giấc ngủ & Chợp mắt"}
        </h2>
      </div>

      {/* UNIFIED CONTAINER CARD */}
      <div className="relative w-full rounded-[32px] border bg-[#fffff8] dark:bg-[#233355] border-slate-200 dark:border-slate-700 shadow-[0_12px_40px_rgba(0,0,0,0.06)] z-10 p-6 sm:p-10 md:p-12 transition-all">
        {/* Success Banner */}
        {isSavedBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] flex items-center justify-between gap-3 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#007b4d] dark:text-[#62D2FB]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {isEn 
                  ? "Sleep schedule saved and synced to your 24h Recovery Timeline!"
                  : "Đã lưu lịch ngủ và đồng bộ trực tiếp vào Lộ trình Phục hồi 24h!"}
              </span>
            </div>
            <button onClick={() => setIsSavedBanner(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 1: CONTEXT-AWARE COMMITMENTS FORM ────────────────────────── */}
        {step === 1 && (
          <div className="w-full relative animate-fade-in text-left">
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
                  {isEn ? "Step 1: Your Busy Hours" : "Bước 1: Khung giờ bận của bạn"}
                </div>
              </div>
            </div>

            {/* Context-Aware Heading based on Current Real Time */}
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
              {isMorningWindow
                ? (isEn ? "When are you busy today?" : "Hôm nay bạn bận khi nào?")
                : isAfternoonWindow
                ? (isEn ? "What are your plans for this afternoon & evening?" : "Chiều & tối nay bạn còn bận việc gì không?")
                : (isEn ? "Any commitments before bedtime tonight?" : "Từ giờ đến khi đi ngủ, bạn còn bận việc gì không?")}
            </h3>

            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
              {isMorningWindow
                ? (isEn ? "Enter classes, shifts, meetings, or workouts for today" : "Nhập lịch học, ca làm, họp hoặc tập luyện trong ngày")
                : isAfternoonWindow
                ? (isEn ? "Enter afternoon/evening classes, shifts, workouts, or commitments" : "Nhập các ca học chiều/tối, ca làm, tập gym hoặc việc bận từ giờ đến đêm")
                : (isEn ? "Enter late shifts, study sessions, or evening activities" : "Nhập lịch tăng ca, học bài hoặc các hoạt động buổi tối")}
            </p>

            {/* Commitments List */}
            <div className="mb-12">
              {commitments.length > 0 && !isAdding && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                  {commitments.map((c, i) => (
                    <div key={i} className="flex flex-col p-6 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl relative shadow-sm">
                      <div className="font-bold text-[#1F2937] dark:text-white text-lg mb-2 pr-24 truncate">{c.title}</div>
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
                  ))}

                  <button 
                    onClick={handleStartAdd}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-[#E6F8F0] dark:bg-[#62D2FB]/10 transition-colors gap-2 text-[#4CB28E] dark:text-[#62D2FB] font-bold text-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E6F8F0] dark:bg-[#62D2FB]/10 flex items-center justify-center text-[#007b4d] dark:text-[#62D2FB] font-heading text-xl">+</div>
                    {isEn ? "Add busy slot" : "Thêm khung giờ bận"}
                  </button>
                </div>
              )}

              {commitments.length > 0 && !isAdding && (
                <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                  <div className="text-base font-bold text-[#1F2937] dark:text-white mb-4">{isEn ? "Available Free Time for Rest:" : "Khung giờ rảnh để nghỉ ngơi:"}</div>
                  <div className="flex flex-wrap gap-3">
                    {freeWindows.map((win, idx) => (
                      <div key={idx} className="bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB]/30 text-[#007b4d] dark:text-[#62D2FB] px-4 py-2 rounded-xl text-lg font-heading font-bold shadow-sm">
                        {formatDisplayTime(win, isEn)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add / Edit Commitment Modal */}
              {isAdding && (
                <div className="p-4 sm:p-8 border border-[#007b4d] dark:border-[#62D2FB] bg-[#E6F8F0] dark:bg-[#62D2FB]/10 rounded-2xl space-y-4 sm:space-y-6 animate-fade-in">
                  <div className="text-base sm:text-lg font-bold text-[#007b4d] dark:text-[#62D2FB]">
                    {editingIndex !== null ? (isEn ? "Edit busy time" : "Chỉnh sửa lịch bận") : (isEn ? "Add busy time" : "Thêm lịch bận")}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">
                      {isEn ? "Title (e.g. Work, Meeting, Workout)" : "Tên hoạt động (VD: Họp, Học bài, Tập gym)"}
                    </div>
                    <input 
                      type="text" 
                      placeholder={
                        isMorningWindow 
                          ? (isEn ? "Morning Lecture" : "VD: Học buổi sáng")
                          : isAfternoonWindow
                          ? (isEn ? "Afternoon Meeting" : "VD: Họp chiều, tập gym...")
                          : (isEn ? "Overtime, studying..." : "VD: Tăng ca, ôn thi...")
                      }
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-[#1F2937] dark:text-white focus:outline-none focus:border-[#4CB28E]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 py-2">
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">
                        {isEn ? "Start time (e.g. 09:00)" : "Bắt đầu (VD: 09:00)"}
                      </div>
                      <TimePickerInput 
                        value={newStart} 
                        onChange={(val) => setNewStart(val)} 
                        onRangeDetected={(start, end) => { setNewStart(start); setNewEnd(end); }}
                        isEn={isEn} 
                        placeholder="09:00" 
                      />
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#007b4d] dark:text-[#62D2FB]/50 shrink-0 mx-auto rotate-90 sm:rotate-0 mt-6" />
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm text-[#007b4d] dark:text-[#62D2FB]/80 mb-2 font-medium">
                        {isEn ? "End time (e.g. 12:00)" : "Kết thúc (VD: 12:00)"}
                      </div>
                      <TimePickerInput 
                        value={newEnd} 
                        onChange={(val) => setNewEnd(val)} 
                        onRangeDetected={(start, end) => { setNewStart(start); setNewEnd(end); }}
                        isEn={isEn} 
                        placeholder="12:00" 
                      />
                    </div>
                  </div>

                  {timeError && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#FEF5F5] dark:bg-[#7F1D1D]/20 border border-[#C10007]/30 text-[#C10007] dark:text-[#FCA5A5] text-sm font-medium animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{timeError}</span>
                    </div>
                  )}

                  <div className="flex justify-end items-center gap-4 sm:gap-8 pt-4">
                    <button 
                      onClick={() => { setIsAdding(false); setEditingIndex(null); setNewTitle(''); setTimeError(null); }} 
                      className="text-slate-500 font-bold hover:text-slate-700 text-base sm:text-lg cursor-pointer"
                    >
                      {isEn ? "Cancel" : "Hủy"}
                    </button>
                    <button 
                      onClick={handleSaveCommitment} 
                      disabled={!validateTimes(newStart, newEnd).valid}
                      className={`font-bold text-base sm:text-lg px-6 sm:px-10 py-2.5 sm:py-3 rounded-full transition-all shadow-md ${
                        validateTimes(newStart, newEnd).valid
                          ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white cursor-pointer'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
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
                    className="flex-[1] py-4 px-6 border-2 border-dashed border-[#4CB28E] dark:border-[#62D2FB] bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-[#E6F8F0] dark:bg-[#62D2FB]/10 transition-colors flex items-center justify-center gap-3 text-[#4CB28E] dark:text-[#62D2FB] font-bold text-lg cursor-pointer"
                  >
                    <Plus className="w-5 h-5" /> {isEn ? "Add busy time" : "Thêm lịch bận"}
                  </button>
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-[1] py-4 px-6 border-2 border-dashed border-slate-300 bg-white dark:bg-[#0f172a] rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 text-slate-500 font-bold text-lg cursor-pointer"
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
                  className="rounded-full px-8 sm:px-12 py-3.5 text-base sm:text-lg font-bold bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white shadow-md cursor-pointer hover:-translate-y-1 transition-all"
                >
                  {isEn ? "Next" : "Tiếp theo"} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: WAKE ANCHOR & RECOVERY GOAL ─────────────────────────────── */}
        {step === 2 && (
          <div className="w-full relative animate-fade-in text-left">
            <div className="inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-6 sm:mb-8">
              {isEn ? "Step 2: Circadian Anchor & Recovery Goal" : "Bước 2: Mốc giờ dậy & Mục tiêu phục hồi"}
            </div>

            {/* PROMINENT ANCHOR BOX: LATEST WAKE-UP TIME TOMORROW MORNING */}
            <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border-2 border-[#007b4d] dark:border-[#62D2FB] shadow-md animate-fade-in text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#007b4d] dark:text-[#62D2FB] mb-1.5">
                    <span>⏰</span>
                    <span>{isEn ? "Tomorrow's Wake-Up Target" : "Mốc giờ thức dậy sáng mai"}</span>
                  </div>
                  <h4 className="font-heading font-bold text-xl sm:text-2xl text-[#1F2937] dark:text-white leading-snug">
                    {isEn ? "What is the latest time you must wake up tomorrow?" : "Sáng mai bạn cần thức dậy muộn nhất lúc mấy giờ?"}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {isEn
                      ? "OwlUp calculates backwards from this anchor to determine tonight's optimal bedtime, ensuring you wake up fully recharged without sleep debt."
                      : "OwlUp sẽ tính toán lùi từ mốc giờ này để đề xuất giờ lên giường tối nay, đảm bảo bạn thức dậy đúng giờ và cơ thể được phục hồi trọn vẹn."}
                  </p>
                </div>
                <div className="w-full sm:w-48 shrink-0">
                  <TimePickerInput
                    value={latestWakeUpTime}
                    onChange={(val) => {
                      setLatestWakeUpTime(val);
                      try { localStorage.setItem('owlup_latest_waketime', val); } catch {}
                    }}
                    isEn={isEn}
                    placeholder="07:00"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
              {isEn ? "Choose your recovery goal" : "Mục tiêu phục hồi của bạn"}
            </h3>
            <p className="text-slate-500 mb-8 text-sm sm:text-base leading-relaxed">
              {isEn 
                ? "Select one of the 4 goals below. OwlUp dynamically adapts your bedtime based on your wake-up anchor above."
                : "Chọn 1 trong 4 mục tiêu dưới đây để OwlUp đề xuất giờ lên giường tối nay tương ứng với mốc giờ dậy sáng mai."}
            </p>

            {/* 4 Scientific Recovery Goals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
              {[
                {
                  id: 'healthy_balanced' as const,
                  icon: '🌱',
                  title: isEn ? 'Healthy Balanced' : 'Cân bằng lành mạnh',
                  durationLabel: isEn ? '8.0 hours' : '8.0 tiếng',
                  desc: isEn 
                    ? 'Naturally aligned with biological circadian rhythms, guaranteeing a full 8-hour sleep.'
                    : 'Đồng bộ với nhịp sinh học tự nhiên, đảm bảo giấc ngủ trọn vẹn 8 tiếng để cơ thể tràn đầy sinh lực.',
                },
                {
                  id: 'max_productivity' as const,
                  icon: '🚀',
                  title: isEn ? 'Max Productivity' : 'Năng suất tối đa',
                  durationLabel: isEn ? '7h15m + Nap' : '7h15m + Chợp mắt',
                  desc: isEn 
                    ? 'Maximizes awake hours for deep work, combined with a power nap to maintain sharp focus.'
                    : 'Tối ưu thời gian tỉnh táo ban ngày, kết hợp chợp mắt nhanh để duy trì sự sắc bén.',
                },
                {
                  id: 'catch_up' as const,
                  icon: '⚡',
                  title: isEn ? 'Catch Up & Sleep' : 'Ngủ bù & Phục hồi',
                  durationLabel: isEn ? '8h45m deep sleep' : '8h45m ngủ sâu',
                  desc: isEn 
                    ? 'Prioritizes earlier bedtime and longer deep sleep to pay down accumulated sleep debt.'
                    : 'Ưu tiên đi ngủ sớm hơn và kéo dài thời gian ngủ sâu để bù đắp nợ ngủ, xua tan mệt mỏi.',
                },
                {
                  id: 'night_owl' as const,
                  icon: '🦉',
                  title: isEn ? 'Night Owl / Shift' : 'Cú đêm / Ca muộn',
                  durationLabel: isEn ? '7h45m late cycle' : '7h45m chu kỳ muộn',
                  desc: isEn 
                    ? 'Smoothly shifts sleep window later while protecting total recovery sleep after late hours.'
                    : 'Linh hoạt lùi giờ ngủ muộn hơn, bảo vệ giấc ngủ sau các buổi làm việc hoặc học tập ca tối.',
                },
              ].map(goal => {
                const isSelected = selectedGoal === goal.id;
                const dynamicBedtime = getBedtimeForGoal(goal.id);
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl shrink-0 leading-none">{goal.icon}</span>
                          <h4 className="font-heading font-bold text-lg sm:text-xl text-[#1F2937] dark:text-white leading-snug">
                            {goal.title}
                          </h4>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {goal.durationLabel}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        {goal.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="text-xs sm:text-sm font-semibold text-[#007b4d] dark:text-[#62D2FB]">
                        <span>{isEn ? "Bedtime tonight: " : "Giờ ngủ đề xuất: "}</span>
                        <span className="font-heading font-bold text-base">{dynamicBedtime}</span>
                      </div>
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
                className="rounded-full px-8 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg font-bold bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white shadow-md cursor-pointer hover:-translate-y-1 transition-all"
              >
                {isEn ? "View Recommended Schedule" : "Xem đề xuất lịch ngủ"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: RECOMMENDED SLEEP SCHEDULE CARD ────────────────────────── */}
        {step === 3 && (
          <div className="w-full relative animate-fade-in text-left">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider">
                {isEn ? "Step 3: Recommended Sleep Schedule" : "Bước 3: Lịch ngủ đề xuất tối ưu"}
              </div>

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

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl sm:text-4xl font-heading font-bold text-[#1F2937] dark:text-white">
                {isEn ? "Circadian Score:" : "Điểm chuẩn sinh học:"} <span className="text-[#007b4d] dark:text-[#62D2FB]">{score}/100</span>
              </h3>
            </div>

            {/* Smart Sleep Debt Compensation Banner */}
            {historyAnalysis.hasDebt && (
              <div className="w-full mb-8 p-5 sm:p-6 rounded-2xl bg-[#FFFBEB] dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 shadow-sm flex items-start gap-4 animate-fade-in text-left">
                <span className="text-2xl shrink-0 mt-0.5">⚖️</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isEn 
                      ? `Yesterday's sleep deficit: ${historyAnalysis.yesterdaySleep}h (Debt: ${historyAnalysis.sleepDebtHours}h)` 
                      : `Phát hiện nợ ngủ hôm qua: ${historyAnalysis.yesterdaySleep}h (Thiếu: ${historyAnalysis.sleepDebtHours}h)`}
                  </div>
                  <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                    {isEn
                      ? `OwlUp has automatically extended tonight's recommended sleep window and scheduled a restorative power nap to discharge adenosine.`
                      : `OwlUp đã tự động điều chỉnh lịch tối nay: ngủ sớm hơn và sắp xếp giấc chợp mắt phù hợp để bạn nhanh chóng cân bằng năng lượng.`}
                  </p>
                </div>
              </div>
            )}

            {/* Schedule Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
              {/* 1. Afternoon Power Nap */}
              <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-3xl p-5 sm:p-6 lg:p-8 dark:bg-[#0F172A] shadow-sm overflow-hidden" style={{ backgroundColor: '#FFFFF8' }}>
                <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] tracking-wider mb-4 uppercase">
                  {isEn ? "AFTERNOON POWER NAP" : "CHỢP MẮT BUỔI TRƯA/CHIỀU"}
                </div>
                {canNapToday && recNapDurationMins > 0 ? (
                  <>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                      <span className="whitespace-nowrap">{formatDisplayTime(recNapStart, isEn)}</span>
                      <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                      <span className="whitespace-nowrap">{formatDisplayTime(recNapEnd, isEn)}</span>
                    </div>
                    <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">
                      {isEn ? `Duration: ${recNapDurationMins} min` : `Thời lượng: ${recNapDurationMins} phút`}
                    </div>
                    <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-3 leading-relaxed">
                      {isEn ? "Scheduled in your natural circadian dip to discharge adenosine." : "Được lên lịch vào vùng trũng sinh học để xả mệt mỏi mà không gây uể oải."}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
                      {isEn ? "No Nap Scheduled" : "Không xếp lịch chợp mắt"}
                    </div>
                    <p className="text-sm text-[#1F2937]/70 dark:text-white/70 leading-relaxed mt-2 font-sans">
                      {isEveningWindow || isPastNapSafeCutoff
                        ? (isEn 
                            ? "It's past the optimal afternoon dip window (>3:30 PM). Taking a late nap will deplete your adenosine and disrupt tonight's sleep. OwlUp prioritizes deep night sleep instead."
                            : "Đã qua khung giờ chợp mắt sinh học lý tưởng (>15:30). Ngủ muộn lúc này sẽ làm giảm áp lực buồn ngủ tự nhiên và gây mất ngủ đêm. OwlUp dồn toàn bộ cho giấc ngủ đêm chất lượng.")
                        : (isEn 
                            ? "Your commitments occupy the midday dip window. OwlUp protects your nighttime sleep efficiency."
                            : "Lịch bận kéo dài qua khung giờ trưa, OwlUp sẽ tối ưu giấc ngủ đêm để bù đắp năng lượng trọn vẹn cho bạn.")}
                    </p>
                  </>
                )}
              </div>

              {/* 2. Main Night Sleep */}
              <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-3xl p-5 sm:p-6 lg:p-8 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
                <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-4 uppercase">
                  {isEn ? "MAIN NIGHT SLEEP TONIGHT" : "GIẤC NGỦ ĐÊM NAY"}
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                  <span className="whitespace-nowrap">{formatDisplayTime(recBedtime, isEn)}</span>
                  <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                  <span className="whitespace-nowrap">{formatDisplayTime(recWake, isEn)}</span>
                </div>
                <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">
                  {isEn ? `Duration: ${recSleepDuration} hours` : `Thời lượng: ${recSleepDuration} giờ`}
                </div>
                <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-3 leading-relaxed">
                  {isEn 
                    ? `Calculated backwards to ensure you wake up fresh at ${formatDisplayTime(recWake, isEn)}.`
                    : `Tính toán lùi chính xác để đảm bảo bạn thức dậy sảng khoái lúc ${formatDisplayTime(recWake, isEn)} sáng mai.`}
                </div>
              </div>

              {/* 3. Recommended Caffeine Curfew */}
              <div className="border border-red-200 dark:border-red-500/30 rounded-3xl p-5 sm:p-6 lg:p-8 bg-[#FEF5F5] dark:bg-red-950/20 shadow-sm overflow-hidden md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300 tracking-wider mb-4 uppercase">
                  <span>🚫</span> {isEn ? "RECOMMENDED CAFFEINE CURFEW TIME" : "GIỜ NGỪNG CAFFEINE ĐỀ XUẤT"}
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-3 tabular-nums">
                  {formatDisplayTime(recCaffeineCutoff, isEn)}
                </div>
                <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                  {isEn 
                    ? `(10 hours before your ${formatDisplayTime(recBedtime, isEn)} bedtime)` 
                    : `(10 tiếng trước giờ đi ngủ ${formatDisplayTime(recBedtime, isEn)})`}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {isEn 
                    ? "Stopping caffeine 10 hours before sleep ensures your body eliminates residual caffeine before entering deep REM sleep cycles."
                    : "Ngừng nạp caffeine 10 tiếng trước khi ngủ đảm bảo cơ thể kịp đào thải sạch trước khi bước vào chu kỳ ngủ sâu."}
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={() => setStep(2)} 
                className="text-slate-400 hover:text-[#007b4d] dark:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
              </button>
              <div className="flex items-center gap-4 sm:gap-6">
                {hasSavedSchedule ? (
                  <button 
                    onClick={() => {
                      setCustomBedtime(recBedtime);
                      setCustomWakeTime(recWake);
                      setNapStart(recNapStart);
                      setNapDuration(recNapDurationMins.toString());
                      setHasAppliedOptimal(false);
                      setStep(4);
                    }} 
                    className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#0E172A] rounded-full px-8 sm:px-14 py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-1"
                  >
                    {isEn ? "Customize Schedule" : "Tùy chỉnh lịch trình"}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setCustomBedtime(recBedtime);
                        setCustomWakeTime(recWake);
                        setNapStart(recNapStart);
                        setNapDuration(recNapDurationMins.toString());
                        setHasAppliedOptimal(false);
                        setStep(4);
                      }} 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-base sm:text-lg cursor-pointer transition-colors"
                    >
                      {isEn ? "Customize Schedule" : "Tùy chỉnh lịch trình"}
                    </button>
                    <button 
                      onClick={() => {
                        setCustomBedtime(recBedtime);
                        setCustomWakeTime(recWake);
                        setNapStart(recNapStart);
                        setNapDuration(recNapDurationMins.toString());
                        try {
                          localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                          localStorage.setItem('owlup_recovery_goal', selectedGoal || 'healthy_balanced');
                          localStorage.setItem('owlup_latest_waketime', recWake);
                          localStorage.setItem('owlup_waketime', recWake);
                          localStorage.setItem('owlup_bedtime', recBedtime);
                          localStorage.setItem('owlup_schedule_applied', 'true');
                          localStorage.setItem('owlup_schedule_date', getTodayDateStr());
                          setScheduleSaved(true);
                          onApplySchedule(recBedtime, recWake, recSleepDuration, recNapStart, recNapDurationMins.toString());
                          setIsSavedBanner(true);
                          setStep(5);
                        } catch {}
                      }}
                      className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#0E172A] rounded-full px-8 sm:px-14 py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-1"
                    >
                      {isEn ? "Agree" : "Đồng ý"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: CUSTOMIZE SCHEDULE ────────────────────────────────────── */}
        {step === 4 && (
          <div className="w-full relative animate-fade-in text-left">
            <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-6">
              {isEn ? "Step 4: Adjustment Hub" : "Bước 4: Trung tâm tùy chỉnh lịch trình"}
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
              {isEn ? "Fine-Tune Your Schedule" : "Tinh chỉnh lịch trình của bạn"}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6">
              {isEn
                ? "You can let OwlUp recalculate by updating your commitments or recovery goal, or manually fine-tune sleep & nap hours below."
                : "Bạn có thể để OwlUp tự động tính lại bằng cách cập nhật lịch bận/mục tiêu, hoặc tự tinh chỉnh giờ ngủ bên dưới."}
            </p>

            {/* Quick Adjustment Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 hover:border-[#007b4d] hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#007b4d] dark:text-[#62D2FB] flex items-center justify-center text-xl shrink-0">
                    📅
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                      {isEn ? "Edit Busy Hours" : "Sửa khung giờ bận"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {commitments.length > 0 ? `${commitments.length} ${isEn ? "slots" : "khung giờ"}` : (isEn ? "None added" : "Chưa có")}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 hover:border-[#007b4d] hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                      {isEn ? "Change Recovery Goal" : "Đổi mục tiêu phục hồi"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedGoal === 'max_productivity' ? 'Năng suất tối đa' : selectedGoal === 'catch_up' ? 'Ngủ bù & Phục hồi' : selectedGoal === 'night_owl' ? 'Cú đêm / Ca muộn' : 'Cân bằng lành mạnh'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Manual Sliders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-8">
              {/* Power Nap */}
              <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-2xl p-5 sm:p-6 dark:bg-[#0F172A] shadow-sm overflow-hidden" style={{ backgroundColor: '#FFFFF8' }}>
                <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] mb-4 uppercase">
                  {isEn ? "AFTERNOON POWER NAP" : "CHỢP MẮT BUỔI TRƯA/CHIỀU"}
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="border-b border-[#FDE047]/80 pb-1">
                      <TimePickerInput value={napStart} onChange={(val) => { setNapStart(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                      {isEn ? "Nap Start" : "Giờ chợp mắt"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <input 
                      type="number" 
                      value={napDuration} 
                      onChange={(e) => { 
                        let val = parseInt(e.target.value) || 0;
                        if (val > 90) { val = 90; setShowNapWarning(true); setTimeout(() => setShowNapWarning(false), 3000); }
                        setNapDuration(val.toString()); 
                        setHasAppliedOptimal(false); 
                      }} 
                      className="w-full bg-transparent border-b border-[#FDE047]/80 px-1 py-1 font-heading text-xl sm:text-2xl font-bold text-[#1F2937] dark:text-white focus:outline-none tabular-nums"
                    />
                    <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                      {isEn ? "Duration (min)" : "Thời lượng (phút)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Night Sleep */}
              <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-2xl p-5 sm:p-6 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
                <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] mb-4 uppercase">
                  {isEn ? "MAIN NIGHT SLEEP" : "GIẤC NGỦ ĐÊM NAY"}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="border-b border-slate-300 dark:border-slate-500 pb-1">
                      <TimePickerInput value={customBedtime} onChange={(val) => { setCustomBedtime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                      {isEn ? "Bedtime" : "Giờ đi ngủ"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="border-b border-slate-300 dark:border-slate-500 pb-1">
                      <TimePickerInput value={customWakeTime} onChange={(val) => { setCustomWakeTime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                      {isEn ? "Wake time" : "Giờ thức dậy"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Score */}
            <div className="mb-10 text-[#1F2937] dark:text-white">
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
                    <span>{isEn ? "Total Sleep:" : "Tổng thời lượng ngủ:"} {!isStep3Valid ? '--' : (totalSleepMins/60).toFixed(1)} {isEn ? "hrs" : "giờ"}</span>
                    <span className="text-slate-500 tabular-nums">({!isStep3Valid ? 0 : scoreDuration}/55)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreDuration >= 50 ? 'bg-[#4CB28E]' : 'bg-[#EAB308]'}`} style={{ width: `${!isStep3Valid ? 0 : (scoreDuration/55)*100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm sm:text-base font-medium">
                    <span>{isEn ? `Circadian Shift: ${!isStep3Valid ? '--' : (liveCircadianShiftMins/60).toFixed(1)}h` : `Độ ổn định nhịp: lệch ${!isStep3Valid ? '--' : (liveCircadianShiftMins/60).toFixed(1)}h`}</span>
                    <span className="text-slate-500 tabular-nums">({!isStep3Valid ? 0 : scoreCircadian}/45)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreCircadian >= 40 ? 'bg-[#4CB28E]' : 'bg-[#EAB308]'}`} style={{ width: `${!isStep3Valid ? 0 : (scoreCircadian/45)*100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <button 
                onClick={() => setStep(3)} 
                className="text-slate-400 hover:text-[#007b4d] font-bold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    if (isStep3Valid) {
                      try {
                        localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                        localStorage.setItem('owlup_recovery_goal', selectedGoal || 'healthy_balanced');
                        localStorage.setItem('owlup_latest_waketime', customWakeTime);
                        localStorage.setItem('owlup_waketime', customWakeTime);
                        localStorage.setItem('owlup_bedtime', customBedtime);
                        localStorage.setItem('owlup_schedule_applied', 'true');
                        localStorage.setItem('owlup_schedule_date', getTodayDateStr());
                        setScheduleSaved(true);
                        onApplySchedule(customBedtime, customWakeTime, (liveDurationMins / 60).toFixed(1), napStart, napDuration);
                        setIsSavedBanner(true);
                        setStep(5);
                      } catch {}
                    }
                  }} 
                  disabled={!isStep3Valid}
                  className={`font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-3 rounded-full text-center transition-all ${
                    isStep3Valid
                      ? 'bg-[#4CB28E] hover:bg-[#007b4d] text-white cursor-pointer shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isEn ? "Save Custom Schedule" : "Lưu lịch tùy chỉnh"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: SUCCESS / SUMMARY ─────────────────────────────────────── */}
        {step === 5 && (() => {
          const effectiveBed = customBedtime || recBedtime;
          const effectiveWake = customWakeTime || recWake;
          const effectiveNStart = napStart || recNapStart;
          const effectiveNDur = parseInt(napDuration) || 0;
          const [bh, bm] = effectiveBed.split(':').map(Number);
          const [wh, wm] = effectiveWake.split(':').map(Number);
          let sleepMins = (wh * 60 + wm) - (bh * 60 + bm);
          if (sleepMins < 0) sleepMins += 24 * 60;
          const nightHours = (sleepMins / 60).toFixed(1);

          let summaryCurfewMins = (bh * 60 + bm) - 10 * 60;
          while (summaryCurfewMins < 0) summaryCurfewMins += 24 * 60;
          const summaryCurfew = formatMins(summaryCurfewMins);

          return (
            <div className="max-w-lg mx-auto animate-fade-in text-center">
              <div className="bg-white dark:bg-[#233355] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#4CB28E] dark:bg-[#62D2FB]"></div>
                
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-[#4CB28E] dark:text-[#62D2FB]" />
                </div>

                <h3 className="text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
                  {isEn ? "Schedule Successfully Saved!" : "Đã lưu lịch phục hồi thành công!"}
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  {isEn ? "Synced to your 24-hour rolling Recovery Timeline." : "Đã đồng bộ vào Lộ trình Phục hồi 24h của bạn."}
                </p>

                <div className="flex flex-col text-left mb-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#233355] rounded-2xl p-5 shadow-sm">
                  {/* Nap */}
                  <div className="py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">{isEn ? "Power Nap:" : "Chợp mắt:"}</span>
                    <span className="font-heading font-bold text-[#4CB28E]">
                      {effectiveNDur > 0 ? `${formatDisplayTime(effectiveNStart, isEn)} (${effectiveNDur}m)` : (isEn ? "None" : "Không có")}
                    </span>
                  </div>

                  {/* Night Sleep */}
                  <div className="py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">{isEn ? "Night Sleep:" : "Giấc ngủ đêm:"}</span>
                    <span className="font-heading font-bold text-[#4CB28E]">
                      {formatDisplayTime(effectiveBed, isEn)} → {formatDisplayTime(effectiveWake, isEn)} ({nightHours}h)
                    </span>
                  </div>

                  {/* Caffeine Curfew */}
                  <div className="py-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">{isEn ? "Caffeine Curfew:" : "Ngừng Caffeine:"}</span>
                    <span className="font-heading font-bold text-red-600">
                      {formatDisplayTime(summaryCurfew, isEn)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {onNavigateToCaffeine && (
                    <button 
                      onClick={onNavigateToCaffeine}
                      className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-white rounded-full py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>☕</span>
                      <span>{isEn ? "Go to Caffeine Advisor" : "Tư vấn & Ghi nhận Caffeine"}</span>
                    </button>
                  )}

                  <button 
                    onClick={() => { if (onNavigateToTimeline) onNavigateToTimeline(); }}
                    className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white dark:text-[#0E172A] rounded-full py-3.5 sm:py-4 text-base sm:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                  >
                    {isEn ? "View Recovery Timeline" : "Xem Lộ trình Phục hồi"}
                  </button>

                  <button 
                    onClick={() => { if (onNavigateToDashboard) onNavigateToDashboard(); }}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full py-3 text-base font-bold transition-all cursor-pointer"
                  >
                    {isEn ? "Back to Dashboard" : "Về Tổng quan"}
                  </button>

                  <div className="flex gap-2.5 mt-1">
                    <button 
                      onClick={() => setStep(3)}
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-full py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#4CB28E] transition-colors cursor-pointer text-center"
                    >
                      {isEn ? "View Schedule Summary" : "Xem thẻ đề xuất"}
                    </button>
                    <button 
                      onClick={() => setStep(4)}
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-full py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#4CB28E] transition-colors cursor-pointer text-center"
                    >
                      {isEn ? "Fine-Tune Hours" : "Tự chỉnh lại giờ"}
                    </button>
                  </div>
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
