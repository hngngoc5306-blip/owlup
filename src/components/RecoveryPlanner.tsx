import React, { useState } from 'react';
import { UserProfile, AppLanguage } from '../types';
import { CheckCircle2, ArrowRight, Plus, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
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
  plannedNap = { start: '12:30', end: '12:50', duration: 20 },
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

  // If user already applied schedule today, start at Step 4; otherwise start at Step 1
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    return isScheduleAppliedToday ? 4 : 1;
  });
  
  // Step 1 states with LocalStorage persistence
  const [isAdding, setIsAdding] = useState(false);
  const [commitments, setCommitments] = useState<{title: string, start: string, end: string}[]>(() => {
    if (!isScheduleAppliedToday) return [];
    if (commitmentsProp && commitmentsProp.length > 0) return commitmentsProp;
    try {
      const saved = localStorage.getItem('owlup_commitments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('06:45');
  const [newEnd, setNewEnd] = useState('11:45');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Customization states (Step 3) with LocalStorage persistence
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

  // Synchronize with App-level schedule when props update
  React.useEffect(() => {
    if (step !== 3) {
      if (bedtime) setCustomBedtime(bedtime);
      if (wakeTime) setCustomWakeTime(wakeTime);
      if (plannedNap?.start) setNapStart(plannedNap.start);
      if (plannedNap?.duration) setNapDuration(plannedNap.duration.toString());
    }
  }, [bedtime, wakeTime, plannedNap, step]);

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

  const liveScore = scoreDuration + scoreCircadian;
  const isQualified = liveScore >= 90 || hasAppliedOptimal;

  const getTipContent = () => {
    if (isQualified) return null;
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
    setNewTitle(comm.title);
    setNewStart(comm.start);
    setNewEnd(comm.end);
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleStartAdd = () => {
    setNewTitle('');
    setNewStart('09:00');
    setNewEnd('17:00');
    setEditingIndex(null);
    setIsAdding(true);
  };

  const handleSaveCommitment = () => {
    if (!newStart || !newEnd) {
      setIsAdding(false);
      setEditingIndex(null);
      return;
    }
    
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
        localStorage.setItem('owlup_commitments', JSON.stringify(finalMerged));
        localStorage.setItem('owlup_schedule_date', getTodayDateStr());
    } catch {}
    if (onUpdateCommitments) onUpdateCommitments(finalMerged);
    
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
    } catch {}
    if (onUpdateCommitments) onUpdateCommitments(updated);
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
  
  // Target Sleep Duration: 8 hours (480 mins) + extra restorative time if user has sleep debt
  const extraDebtMins = historyAnalysis.hasDebt ? Math.min(60, Math.round(historyAnalysis.sleepDebtHours * 30)) : 0;
  const targetDurationMins = 8 * 60 + extraDebtMins; 

  // 1. Determine Required Wake Time (Giờ thức dậy)
  const morningComms = commitments
    .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
    .filter(c => c.startMins >= 4 * 60 && c.startMins <= 12 * 60)
    .sort((a, b) => a.startMins - b.startMins);

  const hasMorningComm = morningComms.length > 0;
  let requiredWakeMins = hasMorningComm
    ? Math.max(4 * 60 + 30, morningComms[0].startMins - 15) // 15 mins buffer before first class/shift
    : 7 * 60; // Default natural wake: 07:00

  // 2. Continuous time helper: maps minutes so evening -> night -> next morning is monotonic
  // 12:00 PM = 720, 23:59 = 1439, 01:00 AM next day = 1500, 06:00 AM next day = 1800
  const toContMins = (mins: number) => (mins < 12 * 60 ? mins + 24 * 60 : mins);

  // Find latest busy commitment in the evening/night (after 18:00 or past midnight)
  // IMPORTANT: Daytime commitments (e.g. morning classes 06:45 - 09:20, afternoon 12:45 - 15:00)
  // belong to the day and do NOT keep the user awake tonight.
  let latestBusyContMins = 0;
  commitments.forEach(c => {
    const s = parseMins(c.start);
    const e = parseMins(c.end);

    // Check if this commitment is in the evening/night:
    // - Starts at or after 18:00 (e.g. 19:00 - 22:00, 22:00 - 01:00)
    // - Starts in late night / early hours past midnight before 04:00 (e.g. 00:30 - 02:30)
    // - Starts in afternoon and ends after 19:00 (e.g. 15:00 - 21:00)
    const isEveningNight = 
      s >= 18 * 60 || 
      s < 4 * 60 || 
      (s >= 12 * 60 && (e > 19 * 60 || e < s));

    if (isEveningNight) {
      let eCont = toContMins(e);
      const sCont = toContMins(s);
      if (eCont < sCont) eCont += 24 * 60; // Crosses midnight
      if (eCont > latestBusyContMins) {
        latestBusyContMins = eCont;
      }
    }
  });

  // Earliest possible bedtime after evening commitments (plus 20 mins wind-down)
  const earliestBedContMins = latestBusyContMins > 0 ? latestBusyContMins + 20 : 0;

  // 3. Adaptive Bedtime Selection:
  // - Ideal circadian sleep duration: 8 hours (480 mins)
  // - If the user has early free time: prioritize the healthy circadian window (21:00 - 23:30)
  // - If the user is busy late into the night: flexibly start bedtime after their commitment + wind-down.
  let idealBedContMins: number;

  if (hasMorningComm) {
    // Back-calculate 8 hours from required wake time:
    const wakeCont = toContMins(requiredWakeMins);
    let calcBed = wakeCont - targetDurationMins;

    // Healthy circadian priority window: 21:00 (1260) to 23:30 (1410)
    if (calcBed < toContMins(21 * 60)) calcBed = toContMins(21 * 60);
    if (calcBed > toContMins(23 * 60 + 30)) calcBed = toContMins(23 * 60 + 30);
    idealBedContMins = calcBed;
  } else {
    // No morning commitment: comfortable circadian bedtime
    idealBedContMins = isNightOwl ? toContMins(23 * 60) : toContMins(22 * 60 + 30);
  }

  let chosenBedContMins: number;

  if (earliestBedContMins > 0) {
    // User has commitments in the evening/night:
    // Bedtime cannot be before earliestBedContMins.
    // If they finish early (e.g. 21:00 + 20m = 21:20), they sleep at idealBedContMins (22:30).
    // If they finish late (e.g. 23:30 + 20m = 23:50 or 01:00 + 20m = 01:20), bedtime shifts flexibly!
    chosenBedContMins = Math.max(idealBedContMins, earliestBedContMins);

    // If user has NO morning commitment, wake time flexibly extends to guarantee 8h:
    if (!hasMorningComm) {
      requiredWakeMins = (chosenBedContMins + targetDurationMins) % (24 * 60);
    }
  } else {
    // Completely free in the evening: use ideal circadian bedtime
    chosenBedContMins = idealBedContMins;

    // If user has NO morning commitment, wake time guarantees 8h:
    if (!hasMorningComm) {
      requiredWakeMins = (chosenBedContMins + targetDurationMins) % (24 * 60);
    }
  }

  // Convert continuous bedtime and wake time back to 24h minutes (0 - 1439)
  let finalBedtimeMins = chosenBedContMins % (24 * 60);
  let finalWakeMins = requiredWakeMins % (24 * 60);

  // Round to nearest 5 minutes for clean time display
  finalBedtimeMins = Math.round(finalBedtimeMins / 5) * 5 % (24 * 60);
  finalWakeMins = Math.round(finalWakeMins / 5) * 5 % (24 * 60);

  // Actual night sleep duration
  let actualRecDurationMins = finalWakeMins - finalBedtimeMins;
  if (actualRecDurationMins < 0) actualRecDurationMins += 24 * 60;
  const lostSleepMins = Math.max(0, targetDurationMins - actualRecDurationMins);

  // 4. Calculate Afternoon Power Nap (12:00 - 16:30)
  // If night sleep was shortened due to late commitments, automatically extend nap duration to compensate!
  const userHasNapCrave = userProfile?.craves?.includes('nap') 
    || userProfile?.energyCraves?.includes('nap')
    || userProfile?.energyCrave === 'nap'
    || (Array.isArray(userProfile?.energyCrave) && userProfile.energyCrave.includes('nap'));
  
  let baseNap = userHasNapCrave ? 30 : 20;
  if (historyAnalysis.hasDebt) {
    baseNap = Math.max(baseNap, 25);
  }
  // If lost sleep > 30m, add compensatory nap time (up to 45-60m max)
  let calcNapDuration = Math.min(60, baseNap + Math.min(30, Math.floor(lostSleepMins / 30) * 15));

  // Ideal afternoon nap start: 12:30 PM (750 mins)
  let napStartMins = 12 * 60 + 30;
  
  // Nap Collision with Commitments
  if (commitments.length > 0) {
    const sortedComms = [...commitments]
      .map(c => ({ ...c, startMins: parseMins(c.start), endMins: parseMins(c.end) }))
      .sort((a, b) => a.startMins - b.startMins);

    for (const c of sortedComms) {
      const napEndMins = napStartMins + calcNapDuration;
      if (napStartMins < c.endMins && napEndMins > c.startMins) {
        napStartMins = c.endMins + 15;
      }
    }

    // Safety guard: power nap should stay in the afternoon (12:00 - 16:30)
    if (napStartMins > 16 * 60 + 30 || napStartMins < 11 * 60) {
      napStartMins = 12 * 60 + 30;
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

  // Score calculation
  let score = 100;
  const shiftDiffMins = getShiftMins(finalBedtimeMins, baseBedtimeMins);
  if (shiftDiffMins > 30) {
    score -= Math.floor(shiftDiffMins / 30) * 2; // -2 points for every 30m deviation from their natural chronotype/bedtime
  }
  if (score < 60) score = 60; // floor



  return (
    <div className="w-full max-w-[1100px] w-[94%] sm:w-[90%] mx-auto pb-20 animate-fade-in font-sans mt-4 sm:mt-12">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading text-center text-[#1F2937] dark:text-[#F8FAFC] mb-8 sm:mb-12">
        {isEn ? "Synchronize Sleep & Power Nap" : "Đồng bộ Giấc ngủ & Chợp mắt"}
      </h2>

      {/* STEP 1: COMMITMENTS */}
      {step === 1 && (
        <div className="bg-[#fffff8] dark:bg-[#233355] rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-8 md:p-14 relative animate-fade-in">
          
          <div className="inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-6 sm:mb-8">
            {isEn ? "Step 1: Your busy hours" : "Bước 1: Khung giờ bận trong ngày"}
          </div>
          
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-2">
            {isEn ? "When are you busy today?" : "Hôm nay bạn bận khi nào?"}
          </h3>
          <p className="text-slate-500 mb-8 sm:mb-10 text-sm sm:text-base md:text-lg">
            {isEn ? "Enter classes, shifts, meetings, or workouts" : "Nhập lịch học, ca làm, họp hoặc tập luyện"}
          </p>
          
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
                  <div className="flex-1"><TimePickerInput value={newStart} onChange={setNewStart} isEn={isEn} /></div>
                  <ArrowRight className="w-5 h-5 text-[#007b4d] dark:text-[#62D2FB]/50 shrink-0 mx-auto rotate-90 sm:rotate-0" />
                  <div className="flex-1"><TimePickerInput value={newEnd} onChange={setNewEnd} isEn={isEn} /></div>
                </div>
                <div className="flex justify-end items-center gap-4 sm:gap-8 pt-4">
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingIndex(null);
                      setNewTitle('');
                    }} 
                    className="text-slate-500 font-bold hover:text-slate-700 text-base sm:text-lg cursor-pointer"
                  >
                    {isEn ? "Cancel" : "Hủy"}
                  </button>
                  <button onClick={handleSaveCommitment} className="text-white font-bold text-base sm:text-lg bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] px-6 sm:px-10 py-2.5 sm:py-3 rounded-full transition-colors shadow-md cursor-pointer">{isEn ? "Save" : "Lưu"}</button>
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
          
          <div className="flex justify-end mt-12">
            <button 
              onClick={() => setStep(2)}
              disabled={commitments.length === 0}
              className={`rounded-full px-12 py-3.5 text-lg font-bold transition-all whitespace-nowrap ${
                commitments.length > 0 
                  ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white shadow-md cursor-pointer hover:-translate-y-1' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isEn ? "Next" : "Tiếp"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RECOMMENDATION */}
      {step === 2 && (
        <div className="bg-[#fffff8] dark:bg-[#233355] rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-14 relative animate-fade-in">
          <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-8">
            {isEn ? "Step 2: Recommended recovery routine" : "Bước 2: Lịch phục hồi đề xuất"}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
            {/* 1. Afternoon Power Nap */}
            <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-3xl p-5 sm:p-6 lg:p-8 bg-white dark:bg-[#0F172A] shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] tracking-wider mb-4 uppercase">{isEn ? "AFTERNOON POWER NAP" : "CHỢP MẮT BUỔI CHIỀU"}</div>
              <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                <span className="whitespace-nowrap">{formatDisplayTime(recNapStart, isEn)}</span>
                <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                <span className="whitespace-nowrap">{formatDisplayTime(recNapEnd, isEn)}</span>
              </div>
              <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">{isEn ? `Duration: ${recNapDurationMins} min` : `Thời lượng: ${recNapDurationMins} phút`}</div>
              <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-4 leading-relaxed">{isEn ? "Scheduled during the circadian dip to discharge adenosine." : "Được lên lịch vào vùng trũng sinh học để xả adenosine."}</div>
            </div>

            {/* 2. Main Night Sleep */}
            <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-3xl p-5 sm:p-6 lg:p-8 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-4 uppercase">{isEn ? "MAIN NIGHT SLEEP" : "GIẤC NGỦ ĐÊM NAY"}</div>
              <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-heading font-bold text-[#1F2937] dark:text-white mb-4 flex items-center flex-wrap gap-x-2 gap-y-1 tabular-nums">
                <span className="whitespace-nowrap">{formatDisplayTime(recBedtime, isEn)}</span>
                <span className="text-slate-400 font-sans font-normal shrink-0">→</span>
                <span className="whitespace-nowrap">{formatDisplayTime(recWake, isEn)}</span>
              </div>
              <div className="text-base font-medium text-[#1F2937] dark:text-white mb-1">{isEn ? `Duration: ${recSleepDuration} hours` : `Thời lượng: ${recSleepDuration} giờ`}</div>
              <div className="text-sm text-[#1F2937]/70 dark:text-white/70 mt-4 leading-relaxed">{isEn ? "Aligned with open windows to maximize restorative REM." : "Đồng bộ hóa với lịch rảnh để tối ưu giấc ngủ REM."}</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <button 
              onClick={() => setStep(1)} 
              className="text-slate-400 hover:text-[#007b4d] dark:text-[#62D2FB] font-bold text-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
            </button>
            <div className="flex items-center gap-6">
              <button onClick={() => {
                setCustomBedtime(recBedtime);
                setCustomWakeTime(recWake);
                setNapStart(recNapStart);
                setNapDuration(recNapDurationMins.toString());
                setHasAppliedOptimal(false);
                setStep(3);
              }} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer transition-colors">{isEn ? "Adjust Sleep Times" : "Tùy chỉnh giờ ngủ"}</button>
              <button 
                onClick={() => {
                  setCustomBedtime(recBedtime);
                  setCustomWakeTime(recWake);
                  setNapStart(recNapStart);
                  setNapDuration(recNapDurationMins.toString());
                  try {
                    localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                  } catch {}
                  onApplySchedule(recBedtime, recWake, recSleepDuration, recNapStart, recNapDurationMins.toString());
                  setStep(4);
                }}
                className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white rounded-full px-14 py-4 text-lg font-bold transition-all duration-300 shadow-md cursor-pointer hover:-translate-y-1"
              >
                {isEn ? "Agree" : "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CUSTOMIZE */}
      {step === 3 && (
        <div className="bg-[#fffff8] dark:bg-[#233355] rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-14 relative animate-fade-in">
          <div className="inline-block px-5 py-2 rounded-full text-sm font-bold bg-[#E6F8F0] dark:bg-[#62D2FB]/10 border border-[#007b4d] dark:border-[#62D2FB] text-[#007b4d] dark:text-[#62D2FB] tracking-wider mb-8">
            {isEn ? "Step 3: Flexible customization" : "Bước 3: Tùy chỉnh linh hoạt"}
          </div>
          
          <h3 className="text-3xl sm:text-4xl font-heading font-bold text-[#1F2937] dark:text-white mb-8 text-left">
            {isEn ? "Customize Sleep, Nap, or Both" : "Tùy chỉnh lịch trình hôm nay"}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mt-4 mb-10">
            {/* 1. Power Nap (Yellow) */}
            <div className="border border-[#FDE047] dark:border-amber-400/30 rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0F172A] shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#CA8A04] dark:text-[#FCD34D] mb-4 uppercase">
                {isEn ? "AFTERNOON POWER NAP" : "CHỢP MẮT BUỔI CHIỀU"}
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-[#FDE047]/80 pb-1 overflow-hidden">
                    <TimePickerInput value={napStart} onChange={(val) => { setNapStart(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{isEn ? "Nap start" : "Bắt đầu chợp mắt"}</div>
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
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{isEn ? "Duration (min)" : "Thời lượng (phút)"}</div>
                </div>
              </div>
            </div>

            {/* 2. Main night sleep (Green) */}
            <div className="border border-[#007b4d] dark:border-[#62D2FB] rounded-2xl p-5 sm:p-6 bg-[#E6F8F0] dark:bg-[#62D2FB]/10 shadow-sm overflow-hidden">
              <div className="text-sm font-bold text-[#007b4d] dark:text-[#62D2FB] mb-4 uppercase">
                {isEn ? "MAIN NIGHT SLEEP" : "GIẤC NGỦ ĐÊM NAY"}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mb-2">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-slate-300 dark:border-slate-500 pb-1 overflow-hidden">
                    <TimePickerInput value={customBedtime} onChange={(val) => { setCustomBedtime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{isEn ? "Bedtime" : "Giờ đi ngủ"}</div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="border-b border-slate-300 dark:border-slate-500 pb-1 overflow-hidden">
                    <TimePickerInput value={customWakeTime} onChange={(val) => { setCustomWakeTime(val); setHasAppliedOptimal(false); }} isEn={isEn} variant="underline" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{isEn ? "Wake time" : "Giờ thức dậy"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE SCORE BOX */}
          <div className="mb-10 text-[#1F2937] dark:text-white animate-fade-in">
            <div className={`inline-block px-4 py-1.5 text-white text-sm sm:text-base font-bold tracking-wider uppercase rounded-lg mb-4 shadow-sm ${isQualified ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]'}`}>
              {liveScore >= 90 ? (isEn ? 'QUALIFIED' : 'ĐẠT CHUẨN') : (hasAppliedOptimal ? (isEn ? 'OPTIMIZED' : 'ĐÃ TỐI ƯU') : (isEn ? 'NEEDS REFINEMENT' : 'CẦN TINH CHỈNH'))}
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg sm:text-xl font-bold font-heading">
                {isEn ? "Live Sleep Architecture Score:" : "Điểm Cấu trúc Giấc ngủ:"}
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold tabular-nums">
                {liveScore}/100
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm sm:text-base font-medium">
                  <span>{isEn ? "Total Sleep Duration:" : "Tổng thời lượng ngủ:"} {(totalSleepMins/60).toFixed(1)} {isEn ? "hrs" : "giờ"}</span>
                  <span className="text-slate-500 tabular-nums">({scoreDuration}/55)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className={`h-full ${scoreDuration >= 50 ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]'}`} style={{width: `${(scoreDuration/55)*100}%`}}></div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm sm:text-base font-medium">
                  <span>{isEn ? `Circadian Consistency: ${(liveCircadianShiftMins/60).toFixed(1)}h variance` : `Độ ổn định: chênh lệch ${(liveCircadianShiftMins/60).toFixed(1)}h`}</span>
                  <span className="text-slate-500 tabular-nums">({scoreCircadian}/45)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className={`h-full ${scoreCircadian >= 40 ? 'bg-[#4CB28E] dark:bg-[#62D2FB]' : 'bg-[#EAB308]'}`} style={{width: `${(scoreCircadian/45)*100}%`}}></div>
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
              onClick={() => setStep(2)} 
              className="text-slate-400 hover:text-[#007b4d] dark:text-[#62D2FB] font-bold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2 transition-colors cursor-pointer py-2 sm:py-0"
            >
              <ArrowLeft className="w-5 h-5" /> {isEn ? "Back" : "Quay lại"}
            </button>
            
            {isQualified ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8 animate-fade-in">
                <button onClick={() => setStep(2)} className="text-[#999999] hover:text-[#1F2937] font-bold text-base sm:text-lg cursor-pointer transition-colors py-2 text-center">
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button 
                  onClick={() => {
                    try {
                      localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                    } catch {}
                    onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                    setStep(4);
                  }} 
                  className="bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] text-white rounded-full px-8 sm:px-12 py-3 sm:py-3.5 text-base sm:text-lg font-bold transition-all shadow-md cursor-pointer hover:-translate-y-1 text-center"
                >
                  {isEn ? "Next" : "Tiếp theo"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 animate-fade-in">
                <button 
                  onClick={() => {
                    try {
                      localStorage.setItem('owlup_commitments', JSON.stringify(commitments));
                    } catch {}
                    onApplySchedule(customBedtime, customWakeTime, (totalSleepMins / 60).toFixed(1), napStart, napDuration);
                    setStep(4);
                  }} 
                  className="text-slate-500 hover:text-[#1F2937] font-bold text-sm sm:text-base md:text-lg px-5 sm:px-6 py-2.5 sm:py-3 border-2 border-dashed border-slate-300 rounded-full hover:bg-slate-50 cursor-pointer text-center"
                >
                  {isEn ? "Keep Custom" : "Giữ tùy chỉnh"}
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

      {/* STEP 4: SUCCESS / QUALIFIED */}
      {step === 4 && (() => {
        const effectiveBed = customBedtime || bedtime || '22:30';
        const effectiveWake = customWakeTime || wakeTime || '06:30';
        const effectiveNStart = napStart || plannedNap?.start || '12:30';
        const effectiveNDur = parseInt(napDuration) || plannedNap?.duration || 20;
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

        return (
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="bg-white dark:bg-[#233355] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#4CB28E] dark:bg-[#62D2FB]"></div>
            
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-[#4CB28E] dark:text-[#62D2FB]" />
            </div>

            <h3 className="text-2xl font-heading font-bold text-[#1F2937] dark:text-white mb-8">
              {isEn ? "Schedule Successfully Saved!" : "Đã lưu lịch ngủ thành công!"}
            </h3>
            
            <div className="flex flex-col text-left mb-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#233355] rounded-2xl p-5 shadow-sm">
              <div className="py-3.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-baseline gap-3 sm:gap-4">
                  <div className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {isEn ? "Afternoon Nap" : "Chợp mắt buổi trưa"}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl font-heading font-bold text-[#4CB28E] dark:text-[#62D2FB] tabular-nums text-right whitespace-nowrap shrink-0 inline-flex items-baseline">
                    <span className="whitespace-nowrap">{formatDisplayTime(effectiveNStart, isEn)}</span>
                    <span className="font-sans font-normal text-slate-400 mx-1 sm:mx-1.5 shrink-0">→</span>
                    <span className="whitespace-nowrap">{formatDisplayTime(effectiveNEnd, isEn)}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className="text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-400 whitespace-nowrap">
                    {effectiveNDur} {isEn ? "min" : "phút"}
                  </span>
                </div>
              </div>

              <div className="py-3.5">
                <div className="flex justify-between items-baseline gap-3 sm:gap-4">
                  <div className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {isEn ? "Main Sleep" : "Giấc ngủ đêm"}
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
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (onNavigateToCaffeine) onNavigateToCaffeine();
                }}
                className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white rounded-full py-4 text-lg font-bold transition-all duration-300 shadow-md hover:-translate-y-1 cursor-pointer"
              >
                {isEn ? "Log Caffeine" : "Nhập Caffeine"}
              </button>

              <button 
                onClick={() => {
                  if (onNavigateToDashboard) onNavigateToDashboard();
                }}
                className="w-full bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:bg-[#62D2FB] text-white rounded-full py-4 text-lg font-bold transition-all duration-300 shadow-md hover:-translate-y-1 cursor-pointer"
              >
                {isEn ? "Back to Dashboard" : "Về Tổng quan"}
              </button>

              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-transparent border border-slate-300 dark:border-slate-600 hover:border-[#4CB28E] dark:hover:border-[#62D2FB] text-slate-600 dark:text-slate-300 hover:text-[#4CB28E] dark:hover:text-[#62D2FB] rounded-full py-3.5 text-base font-bold transition-colors cursor-pointer"
                >
                  {isEn ? "Edit Busy Schedule" : "Sửa lịch bận"}
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 bg-transparent border border-slate-300 dark:border-slate-600 hover:border-[#4CB28E] dark:hover:border-[#62D2FB] text-slate-600 dark:text-slate-300 hover:text-[#4CB28E] dark:hover:text-[#62D2FB] rounded-full py-3.5 text-base font-bold transition-colors cursor-pointer"
                >
                  {isEn ? "Adjust Sleep Times" : "Tùy chỉnh giờ ngủ"}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
export default RecoveryPlanner;
