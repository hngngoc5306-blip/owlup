/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LandingScreen } from './components/LandingScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { InstructionModal, FeatureGuideType } from './components/InstructionModal';
import { Dashboard } from './components/Dashboard';
import { RecoveryPlanner } from './components/RecoveryPlanner';
import { CaffeineAdvisor } from './components/CaffeineAdvisor';
import { RecoveryTimeline } from './components/RecoveryTimeline';
import { SettingsModal } from './components/SettingsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { AppFeature, UserSettings, CaffeineItem, UserProfile, DayRecoveryGoal } from './types';
import { Logo } from './components/Logo';
import { formatDisplayTime } from './utils/timeFormat';
export const getCaffeineLimitsByFrequency = (frequency?: string): { dailyLimitMg: number; thresholdMg: number } => {
  switch (frequency) {
    case 'never':
      return { dailyLimitMg: 100, thresholdMg: 15 };
    case 'rarely':
      return { dailyLimitMg: 200, thresholdMg: 20 };
    case 'few_times_week':
      return { dailyLimitMg: 300, thresholdMg: 25 };
    case 'once_a_day':
      return { dailyLimitMg: 350, thresholdMg: 25 };
    case 'multiple_times_day':
    case 'multiple_times_a_day':
      return { dailyLimitMg: 400, thresholdMg: 30 };
    default:
      return { dailyLimitMg: 300, thresholdMg: 25 };
  }
};

const getDeviceLanguage = (): 'en' | 'vi' => {
  try {
    const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    return browserLang.startsWith('vi') ? 'vi' : 'en';
  } catch {
    return 'en';
  }
};

const INITIAL_SETTINGS: UserSettings = {
  themeMode: 'auto',
  language: getDeviceLanguage(),
  fallAsleepMinutes: 14,
  caffeineThresholdMg: 25,
  dailyCaffeineLimitMg: 400,
  notifications: {
    recoveryReminders: true,
    napReminders: true,
    caffeineReminders: true,
    sleepReminders: true,
    soundMode: 'sound',
  },
};

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEMO_STUDENT_EMAIL = 'k63.2412550051@ftu.edu.vn';

interface StoredAccount {
  profile: UserProfile;
  settings?: UserSettings;
  bedtime?: string;
  wakeTime?: string;
  totalSleepHours?: string;
  caffeineLog?: CaffeineItem[];
  commitments?: any[];
  history?: Record<string, any>;
  lastActiveDate?: string;
}

const createDemoStudentAccount = (): StoredAccount => {
  const day3 = getPastDateStr(3);
  const day2 = getPastDateStr(2);
  const yesterday = getPastDateStr(1);
  return {
    profile: {
      name: 'Bùi Ngọc Yến',
      age: 20,
      usualBedtime: '23:30',
      chronotype: 'night_owl',
      energyCrave: 'nap',
      energyCraves: ['nap'],
      caffeineFrequency: 'once_a_day',
      email: DEMO_STUDENT_EMAIL,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
    },
    settings: {
      ...INITIAL_SETTINGS,
      language: 'vi',
      dailyCaffeineLimitMg: 400,
    },
    bedtime: '23:30',
    wakeTime: '07:30',
    totalSleepHours: '8.0',
    caffeineLog: [],
    commitments: [],
    lastActiveDate: yesterday,
    history: {
      [day3]: {
        date: day3,
        sleepHours: 7.5,
        sleepDurationHours: 7.5,
        sleepScore: 88,
        caffeineMg: 120,
        status: 'optimal'
      },
      [day2]: {
        date: day2,
        sleepHours: 6.0,
        sleepDurationHours: 6.0,
        sleepScore: 72,
        caffeineMg: 240,
        status: 'deficit'
      },
      [yesterday]: {
        date: yesterday,
        sleepHours: 5.5,
        sleepDurationHours: 5.5,
        sleepScore: 64,
        caffeineMg: 280,
        status: 'deficit'
      }
    }
  };
};

const getStoredAccounts = (): Record<string, StoredAccount> => {
  try {
    const raw = localStorage.getItem('owlup_accounts');
    const accounts = raw ? JSON.parse(raw) : {};
    let modified = false;
    for (const key of Object.keys(accounts)) {
      if (accounts[key]?.profile?.caffeineFrequency) {
        const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(accounts[key].profile.caffeineFrequency);
        if (accounts[key].settings) {
          if (accounts[key].settings.dailyCaffeineLimitMg === 450 || accounts[key].settings.dailyCaffeineLimitMg === 400 || !accounts[key].settings.dailyCaffeineLimitMg) {
            accounts[key].settings.dailyCaffeineLimitMg = dailyLimitMg;
            accounts[key].settings.caffeineThresholdMg = thresholdMg;
            modified = true;
          }
        }
      }
      if (accounts[key]?.settings?.dailyCaffeineLimitMg && accounts[key].settings.dailyCaffeineLimitMg > 400) {
        accounts[key].settings.dailyCaffeineLimitMg = 400;
        modified = true;
      }
    }
    if (!accounts[DEMO_STUDENT_EMAIL]) {
      accounts[DEMO_STUDENT_EMAIL] = createDemoStudentAccount();
      modified = true;
    }
    if (modified) {
      localStorage.setItem('owlup_accounts', JSON.stringify(accounts));
    }
    return accounts;
  } catch {
    const fallback: Record<string, StoredAccount> = {};
    fallback[DEMO_STUDENT_EMAIL] = createDemoStudentAccount();
    return fallback;
  }
};

const saveAccountData = (email: string, data: Partial<StoredAccount>) => {
  if (!email || email === 'guest') return;
  try {
    const accounts = getStoredAccounts();
    const existing = accounts[email] || {
      profile: {
        name: 'OwlUp User',
        age: 25,
        usualBedtime: '23:00',
        chronotype: 'night_owl',
        energyCrave: 'nap',
        caffeineFrequency: 'once_a_day',
        email,
        authProvider: 'google',
      }
    };
    accounts[email] = {
      ...existing,
      ...data,
      profile: data.profile || existing.profile,
    };
    localStorage.setItem('owlup_accounts', JSON.stringify(accounts));
  } catch {}
};

const calculateDefaultWakeTime = (bedtimeStr: string, sleepHours = 8) => {
  try {
    const [h, m] = bedtimeStr.split(':').map(Number);
    const totalWakeMins = (h * 60 + m + sleepHours * 60) % 1440;
    const wh = Math.floor(totalWakeMins / 60);
    const wm = totalWakeMins % 60;
    return `${wh.toString().padStart(2, '0')}:${wm.toString().padStart(2, '0')}`;
  } catch {
    return '06:30';
  }
};

export default function App() {
  const [activeFeature, setActiveFeature] = useState<AppFeature>('dashboard');
  const [plannerKey, setPlannerKey] = useState<number>(0);

  const handleSelectFeature = (feature: AppFeature) => {
    if (feature === 'planner') {
      setPlannerKey((prev) => prev + 1);
    }
    setActiveFeature(feature);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeFeature]);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [previewThemeMode, setPreviewThemeMode] = useState<ThemeMode | null>(null);
  const [isInstructionOpen, setIsInstructionOpen] = useState<boolean>(false);

  // User Profile state with LocalStorage persistence
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('owlup_user_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  // Dedicated Landing Screen: displayed when user has not yet authenticated / logged in
  const [showLandingScreen, setShowLandingScreen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('owlup_user_profile');
      return !stored;
    } catch {
      return true;
    }
  });

  const [featureGuideFocus, setFeatureGuideFocus] = useState<FeatureGuideType>('all');

  // Onboarding pop-up state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isGuestOnboarding, setIsGuestOnboarding] = useState<boolean>(false);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    setIsGuestOnboarding(false);
  };

  const handleCloseInstruction = () => {
    setIsInstructionOpen(false);
    try {
      localStorage.setItem('owlup_instruction_tour_completed', 'true');
    } catch {}
  };

  const handleManualOpenGuide = () => {
    setFeatureGuideFocus('all');
    setIsInstructionOpen(true);
  };

  // Dedicated Edit Profile pop-up state (Questions 2, 3, 4, 5)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);

  const handleSaveProfileChanges = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    try {
      localStorage.setItem('owlup_user_profile', JSON.stringify(updatedProfile));
    } catch {}

    // Recalculate caffeine limits based on new frequency (strictly capped at FDA 400mg)
    const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(updatedProfile.caffeineFrequency);
    const newSettings: UserSettings = {
      ...settings,
      dailyCaffeineLimitMg: dailyLimitMg,
      caffeineThresholdMg: thresholdMg,
    };
    setSettings(newSettings);
    try {
      localStorage.setItem('owlup_user_settings', JSON.stringify(newSettings));
    } catch {}

    // Sync bedtime and wakeTime with the new usualBedtime
    const newBedtime = updatedProfile.usualBedtime || '22:30';
    const newWakeTime = calculateDefaultWakeTime(newBedtime, Number(totalSleepHours) || 8);
    setBedtime(newBedtime);
    setWakeTime(newWakeTime);
    try {
      localStorage.setItem('owlup_bedtime', newBedtime);
      localStorage.setItem('owlup_waketime', newWakeTime);
    } catch {}

    // Save to accounts database if active email is logged in
    const activeEmail = localStorage.getItem('owlup_active_email');
    if (activeEmail && activeEmail !== 'guest') {
      saveAccountData(activeEmail, {
        profile: updatedProfile,
        settings: newSettings,
        bedtime: newBedtime,
        wakeTime: newWakeTime,
      });
    }

    setIsEditProfileOpen(false);
    setIsSettingsOpen(true);
  };

  const handleCompleteProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    const email = profile.email ? profile.email.toLowerCase().trim() : null;
    let isNewRegistration = true;
    const todayStr = getTodayDateStr();

    if (email && profile.authProvider === 'google') {
      localStorage.setItem('owlup_active_email', email);
      
      const accounts = getStoredAccounts();
      const existingAccount = accounts[email];
      if (existingAccount) {
        isNewRegistration = false;
        // Update account profile with newly submitted nickname & settings
        existingAccount.profile = {
          ...existingAccount.profile,
          ...profile,
          name: profile.name || existingAccount.profile.name,
        };
        saveAccountData(email, existingAccount);
        setUserProfile(existingAccount.profile);
        localStorage.setItem('owlup_user_profile', JSON.stringify(existingAccount.profile));

        // Load existing account data
        if (existingAccount.settings) {
          const loadedSettings = { ...existingAccount.settings };
          if (existingAccount.profile?.caffeineFrequency) {
            const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(existingAccount.profile.caffeineFrequency);
            if (loadedSettings.dailyCaffeineLimitMg === 450 || loadedSettings.dailyCaffeineLimitMg === 400 || !loadedSettings.dailyCaffeineLimitMg) {
              loadedSettings.dailyCaffeineLimitMg = dailyLimitMg;
              loadedSettings.caffeineThresholdMg = thresholdMg;
            }
          }
          if (loadedSettings.dailyCaffeineLimitMg && loadedSettings.dailyCaffeineLimitMg > 400) {
            loadedSettings.dailyCaffeineLimitMg = 400;
          }
          setSettings(loadedSettings);
          localStorage.setItem('owlup_user_settings', JSON.stringify(loadedSettings));
        }
        if (existingAccount.history) {
          localStorage.setItem('owlup_history', JSON.stringify(existingAccount.history));
        }

        // Check if new day
        const lastActive = existingAccount.lastActiveDate;
        if (lastActive && lastActive !== todayStr) {
          // New day rollover
          localStorage.removeItem('owlup_schedule_applied');
          localStorage.removeItem('owlup_schedule_date');
          localStorage.removeItem('owlup_commitments');
          localStorage.removeItem('owlup_planned_nap');
          localStorage.removeItem('owlup_caffeine_log');
          localStorage.setItem('owlup_last_active_date', todayStr);

          setCommitments([]);
          setCaffeineLog([]);
          setPlannedNap(null);
          existingAccount.commitments = [];
          existingAccount.caffeineLog = [];
          existingAccount.lastActiveDate = todayStr;
          saveAccountData(email, existingAccount);
        } else {
          localStorage.setItem('owlup_last_active_date', todayStr);
          if (existingAccount.bedtime) {
            setBedtime(existingAccount.bedtime);
            localStorage.setItem('owlup_bedtime', existingAccount.bedtime);
          }
          if (existingAccount.wakeTime) {
            setWakeTime(existingAccount.wakeTime);
            localStorage.setItem('owlup_waketime', existingAccount.wakeTime);
          }
          if (existingAccount.totalSleepHours) {
            setTotalSleepHours(existingAccount.totalSleepHours);
            localStorage.setItem('owlup_total_sleep_hours', existingAccount.totalSleepHours);
          }
          if (Array.isArray(existingAccount.caffeineLog) && existingAccount.caffeineLog.length > 0) {
            const items = existingAccount.caffeineLog.map((it: any) => ({ ...it, timestamp: new Date(it.timestamp) }));
            setCaffeineLog(items);
            localStorage.setItem('owlup_caffeine_log', JSON.stringify(existingAccount.caffeineLog));
          } else {
            setCaffeineLog([]);
            localStorage.removeItem('owlup_caffeine_log');
          }
          if (Array.isArray(existingAccount.commitments) && existingAccount.commitments.length > 0) {
            setCommitments(existingAccount.commitments);
            localStorage.setItem('owlup_commitments', JSON.stringify(existingAccount.commitments));
          } else {
            setCommitments([]);
            localStorage.removeItem('owlup_commitments');
          }
        }
      } else {
        // Brand new account for this email: start completely fresh!
        const initialBedtime = profile.usualBedtime || '22:30';
        const initialWakeTime = calculateDefaultWakeTime(initialBedtime, 8);
        setBedtime(initialBedtime);
        setWakeTime(initialWakeTime);
        setTotalSleepHours('8.0');
        setCaffeineLog([]);
        setPlannedNap(null);
        setCommitments([]);
        localStorage.removeItem('owlup_commitments');
        localStorage.removeItem('owlup_caffeine_log');
        localStorage.removeItem('owlup_planned_nap');
        localStorage.removeItem('owlup_schedule_applied');
        localStorage.removeItem('owlup_schedule_date');
        localStorage.removeItem('owlup_history');
        localStorage.removeItem('owlup_has_rolled_over');
        localStorage.removeItem('owlup_has_passed_midnight');
        // Clear any stale tomorrow / planning-mode data from previous sessions
        localStorage.removeItem('owlup_planning_mode');
        localStorage.removeItem('owlup_tomorrow_schedule');
        localStorage.removeItem('owlup_tomorrow_commitments');
        localStorage.removeItem('owlup_tomorrow_recovery_goal');
        localStorage.removeItem('owlup_recovery_goal');
        localStorage.setItem('owlup_last_active_date', todayStr);
        localStorage.setItem('owlup_bedtime', initialBedtime);
        localStorage.setItem('owlup_waketime', initialWakeTime);
        localStorage.setItem('owlup_total_sleep_hours', '8.0');

        saveAccountData(email, {
          profile,
          settings,
          bedtime: initialBedtime,
          wakeTime: initialWakeTime,
          totalSleepHours: '8.0',
          caffeineLog: [],
          commitments: [],
          lastActiveDate: todayStr,
        });
      }
    } else {
      // Guest mode: completely fresh session, previous logs/schedules cleared!
      localStorage.setItem('owlup_active_email', 'guest');
      setCaffeineLog([]);
      setPlannedNap(null);
      setCommitments([]);
      localStorage.removeItem('owlup_commitments');
      localStorage.removeItem('owlup_caffeine_log');
      localStorage.removeItem('owlup_planned_nap');
      localStorage.removeItem('owlup_schedule_applied');
      localStorage.removeItem('owlup_schedule_date');
      localStorage.removeItem('owlup_history');
      localStorage.removeItem('owlup_has_rolled_over');
      localStorage.removeItem('owlup_has_passed_midnight');
      // Clear any stale tomorrow / planning-mode data from previous sessions
      localStorage.removeItem('owlup_planning_mode');
      localStorage.removeItem('owlup_tomorrow_schedule');
      localStorage.removeItem('owlup_tomorrow_commitments');
      localStorage.removeItem('owlup_tomorrow_recovery_goal');
      localStorage.removeItem('owlup_recovery_goal');
      localStorage.setItem('owlup_last_active_date', todayStr);
      const initialBedtime = profile.usualBedtime || '22:30';
      const initialWakeTime = calculateDefaultWakeTime(initialBedtime, 8);
      setBedtime(initialBedtime);
      setWakeTime(initialWakeTime);
      setTotalSleepHours('8.0');
      localStorage.setItem('owlup_bedtime', initialBedtime);
      localStorage.setItem('owlup_waketime', initialWakeTime);
      localStorage.setItem('owlup_total_sleep_hours', '8.0');
    }

    try {
      localStorage.setItem('owlup_user_profile', JSON.stringify(profile));
      localStorage.setItem('owlup_onboarding_completed', 'true');
    } catch {}

    // Adjust caffeine limits based on frequency (strictly capped at FDA 400mg safe ceiling)
    const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(profile.caffeineFrequency);
    handleUpdateSettings({ caffeineThresholdMg: thresholdMg, dailyCaffeineLimitMg: dailyLimitMg });

    setShowLandingScreen(false);
    setIsOnboardingOpen(false);
    setActiveFeature('dashboard');

    if (isNewRegistration) {
      setFeatureGuideFocus('all');
      setIsInstructionOpen(true);
      try {
        localStorage.setItem('owlup_instruction_tour_completed', 'true');
      } catch {}
    }
  };

  const handleLoginWithGoogle = (googleUser: { email: string; name: string; picture?: string }) => {
    const email = googleUser.email.trim().toLowerCase();
    const accounts = getStoredAccounts();
    const account = accounts[email];
    if (account) {
      handleLoginWithEmail(email);
      setShowLandingScreen(false);
      return;
    }

    // Auto-create account for new Google user
    const newProfile: UserProfile = {
      name: googleUser.name || 'OwlUp User',
      age: 22,
      usualBedtime: '23:00',
      targetBedtime: '23:00',
      chronotype: 'night_owl',
      energyCrave: 'balanced',
      energyCraves: ['balanced'],
      caffeineFrequency: 'once_a_day',
      email,
      authProvider: 'google',
      photoUrl: googleUser.picture,
      createdAt: new Date().toISOString(),
    };

    saveAccountData(email, {
      profile: newProfile,
      lastActiveDate: getTodayDateStr(),
    });

    setUserProfile(newProfile);
    localStorage.setItem('owlup_active_email', email);
    localStorage.setItem('owlup_user_profile', JSON.stringify(newProfile));
    setShowLandingScreen(false);
    setIsOnboardingOpen(false);
  };

  const handleLoginWithEmail = (emailInput: string): boolean => {
    const email = emailInput.trim().toLowerCase();
    const accounts = getStoredAccounts();
    const account = accounts[email];
    if (!account) return false;

    setUserProfile(account.profile);
    localStorage.setItem('owlup_active_email', email);
    localStorage.setItem('owlup_user_profile', JSON.stringify(account.profile));

    const todayStr = getTodayDateStr();
    const lastActive = account.lastActiveDate;

    // Load account history
    if (account.history) {
      localStorage.setItem('owlup_history', JSON.stringify(account.history));
    } else {
      localStorage.removeItem('owlup_history');
    }

    if (account.settings) {
      const loadedSettings = { ...account.settings };
      if (account.profile?.caffeineFrequency) {
        const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(account.profile.caffeineFrequency);
        if (loadedSettings.dailyCaffeineLimitMg === 450 || loadedSettings.dailyCaffeineLimitMg === 400 || !loadedSettings.dailyCaffeineLimitMg) {
          loadedSettings.dailyCaffeineLimitMg = dailyLimitMg;
          loadedSettings.caffeineThresholdMg = thresholdMg;
        }
      }
      if (loadedSettings.dailyCaffeineLimitMg && loadedSettings.dailyCaffeineLimitMg > 400) {
        loadedSettings.dailyCaffeineLimitMg = 400;
      }
      setSettings(loadedSettings);
      localStorage.setItem('owlup_user_settings', JSON.stringify(loadedSettings));
    }

    // CHECK IF THIS IS A NEW DAY
    if (lastActive && lastActive !== todayStr) {
      // It's a new day!
      // Archive previous day's data into history if not already present
      try {
        const rawHist = localStorage.getItem('owlup_history');
        const hist = rawHist ? JSON.parse(rawHist) : (account.history || {});
        if (!hist[lastActive] && account.bedtime && account.wakeTime) {
          const [bh, bm] = account.bedtime.split(':').map(Number);
          const [wh, wm] = account.wakeTime.split(':').map(Number);
          let diff = (wh * 60 + wm) - (bh * 60 + bm);
          if (diff <= 0) diff += 24 * 60;
          const dur = Number((diff / 60).toFixed(1));
          const totalCaff = (account.caffeineLog || []).reduce((sum: number, it: any) => sum + (it.caffeineMg || 0), 0);
          hist[lastActive] = {
            date: lastActive,
            sleepHours: dur,
            sleepDurationHours: dur,
            sleepScore: dur >= 7.5 ? 88 : dur >= 6.5 ? 75 : 62,
            caffeineMg: totalCaff,
            status: dur >= 7.0 ? 'optimal' : 'deficit'
          };
          localStorage.setItem('owlup_history', JSON.stringify(hist));
          account.history = hist;
        }
      } catch {}

      // Migrate tomorrow's plan if available, or reset schedule and caffeine for new day
      handleDailyRollover(todayStr);
      account.commitments = [];
      account.caffeineLog = [];
      account.lastActiveDate = todayStr;
      saveAccountData(email, account);
    } else {
      // Same day login: restore active data
      localStorage.setItem('owlup_last_active_date', todayStr);
      if (account.bedtime) {
        setBedtime(account.bedtime);
        localStorage.setItem('owlup_bedtime', account.bedtime);
      }
      if (account.wakeTime) {
        setWakeTime(account.wakeTime);
        localStorage.setItem('owlup_waketime', account.wakeTime);
      }
      if (account.totalSleepHours) {
        setTotalSleepHours(account.totalSleepHours);
        localStorage.setItem('owlup_total_sleep_hours', account.totalSleepHours);
      }
      if (Array.isArray(account.caffeineLog) && account.caffeineLog.length > 0) {
        const items = account.caffeineLog.map((it: any) => ({ ...it, timestamp: new Date(it.timestamp) }));
        setCaffeineLog(items);
        localStorage.setItem('owlup_caffeine_log', JSON.stringify(account.caffeineLog));
      } else {
        setCaffeineLog([]);
        localStorage.removeItem('owlup_caffeine_log');
      }
      if (Array.isArray(account.commitments) && account.commitments.length > 0) {
        setCommitments(account.commitments);
        localStorage.setItem('owlup_commitments', JSON.stringify(account.commitments));
      } else {
        setCommitments([]);
        localStorage.removeItem('owlup_commitments');
      }
    }

    setShowLandingScreen(false);
    setActiveFeature('dashboard');
    return true;
  };

  const handleContinueAsGuest = () => {
    setIsGuestOnboarding(true);
    setIsOnboardingOpen(true);
  };

  const handleSignOut = () => {
    const activeEmail = localStorage.getItem('owlup_active_email');
    if (activeEmail && activeEmail !== 'guest') {
      try {
        const commitmentsRaw = localStorage.getItem('owlup_commitments');
        const commitments = commitmentsRaw ? JSON.parse(commitmentsRaw) : [];
        saveAccountData(activeEmail, {
          bedtime,
          wakeTime,
          totalSleepHours,
          caffeineLog,
          commitments,
          settings,
        });
      } catch {}
    } else {
      // Guest sign out: wipe all temporary guest data completely!
      try {
        localStorage.removeItem('owlup_commitments');
        localStorage.removeItem('owlup_caffeine_log');
        localStorage.removeItem('owlup_bedtime');
        localStorage.removeItem('owlup_waketime');
        localStorage.removeItem('owlup_total_sleep_hours');
        localStorage.removeItem('owlup_nap_start');
        localStorage.removeItem('owlup_nap_end');
        localStorage.removeItem('owlup_planned_nap');
        localStorage.removeItem('owlup_schedule_applied');
        localStorage.removeItem('owlup_has_rolled_over');
        localStorage.removeItem('owlup_has_passed_midnight');
      } catch {}
      setCaffeineLog([]);
      setBedtime('22:30');
      setWakeTime('06:30');
      setTotalSleepHours('8.0');
    }

    setUserProfile(null);
    try {
      localStorage.removeItem('owlup_user_profile');
      localStorage.removeItem('owlup_active_email');
    } catch {}
    setIsSettingsOpen(false);
    setShowLandingScreen(true);
  };

  // Settings state with LocalStorage persistence
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const storedSettings = localStorage.getItem('owlup_user_settings');
      const storedProfile = localStorage.getItem('owlup_user_profile');
      let profileFreq: string | undefined;
      if (storedProfile) {
        try { profileFreq = JSON.parse(storedProfile)?.caffeineFrequency; } catch {}
      }

      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (profileFreq) {
          const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(profileFreq);
          if (parsed.dailyCaffeineLimitMg === 450 || parsed.dailyCaffeineLimitMg === 400 || !parsed.dailyCaffeineLimitMg) {
            parsed.dailyCaffeineLimitMg = dailyLimitMg;
            parsed.caffeineThresholdMg = thresholdMg;
            try {
              localStorage.setItem('owlup_user_settings', JSON.stringify({ ...INITIAL_SETTINGS, ...parsed }));
            } catch {}
          }
        }
        if (parsed.dailyCaffeineLimitMg && parsed.dailyCaffeineLimitMg > 400) {
          parsed.dailyCaffeineLimitMg = 400;
        }
        return { ...INITIAL_SETTINGS, ...parsed };
      }
    } catch {}
    return INITIAL_SETTINGS;
  });

  // Shared recovery schedule state across planner, caffeine, and timeline
  const [bedtime, setBedtime] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('owlup_bedtime');
      if (stored && stored !== '01:00') return stored;
    } catch {}
    return '22:30';
  });
  const [wakeTime, setWakeTime] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('owlup_waketime');
      if (stored === '06:00') {
        localStorage.setItem('owlup_waketime', '06:30');
        return '06:30';
      }
      if (stored) return stored;
    } catch {}
    return '06:30';
  });
  const [totalSleepHours, setTotalSleepHours] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('owlup_total_sleep_hours');
      if (stored) {
        const match = stored.match(/[\d.]+/);
        return match ? match[0] : '8.0';
      }
    } catch {}
    return '8.0';
  });

  // Reactive commitments state shared across tabs
  const [commitments, setCommitments] = useState<{ title: string; start: string; end: string }[]>(() => {
    try {
      const todayStr = getTodayDateStr();
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      if (applied === 'true' && scheduleDate === todayStr) {
        const stored = localStorage.getItem('owlup_commitments');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  // Reactive planned nap state shared across tabs
  const [plannedNap, setPlannedNap] = useState<{ start: string; end: string; duration: number } | null>(() => {
    try {
      const todayStr = getTodayDateStr();
      const applied = localStorage.getItem('owlup_schedule_applied');
      const scheduleDate = localStorage.getItem('owlup_schedule_date');
      if (applied === 'true' && scheduleDate === todayStr) {
        const stored = localStorage.getItem('owlup_planned_nap');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  // Helper to validate if a caffeine log should be kept
  const isLogValid = (log: CaffeineItem, nowMs: number) => {
    try {
      const timeMs = log.timestamp instanceof Date ? log.timestamp.getTime() : new Date(log.timestamp).getTime();
      if (isNaN(timeMs)) return false;
      const ageHours = (nowMs - timeMs) / (1000 * 60 * 60);
      if (ageHours < 0) return true; // Logged for today (future or just entered)
      if (log.caffeineMg > 0) {
        // Half-life decay: check if remaining caffeine is > 1mg
        const remaining = log.caffeineMg * Math.pow(0.5, ageHours / 5);
        return remaining > 1;
      } else {
        // For water (0mg), keep for 24 hours
        return ageHours < 24;
      }
    } catch {
      return true;
    }
  };

  // Shared caffeine drinks log with LocalStorage persistence
  const [caffeineLog, setCaffeineLog] = useState<CaffeineItem[]>(() => {
    const nowMs = Date.now();
    try {
      const stored = localStorage.getItem('owlup_caffeine_log');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const loaded = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
          // Automatically clear logs that have fully decayed or are >24h old
          return loaded.filter((log: CaffeineItem) => isLogValid(log, nowMs));
        }
      }
    } catch {}
    
    return [];
  });

  const handleUpdateCaffeineLog = (newItems: CaffeineItem[]) => {
    setCaffeineLog(newItems);
    try {
      localStorage.setItem('owlup_caffeine_log', JSON.stringify(newItems));
      const activeEmail = localStorage.getItem('owlup_active_email');
      if (activeEmail && activeEmail !== 'guest') {
        saveAccountData(activeEmail, { caffeineLog: newItems });
      }
    } catch {}
  };

  const handleClearCaffeineLog = () => {
    setCaffeineLog([]);
    try {
      localStorage.removeItem('owlup_caffeine_log');
      const activeEmail = localStorage.getItem('owlup_active_email');
      if (activeEmail && activeEmail !== 'guest') {
        saveAccountData(activeEmail, { caffeineLog: [] });
      }
    } catch {}
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const sanitizedSettings = { ...newSettings };
      if (typeof sanitizedSettings.dailyCaffeineLimitMg === 'number') {
        sanitizedSettings.dailyCaffeineLimitMg = Math.min(400, Math.max(50, sanitizedSettings.dailyCaffeineLimitMg));
      }
      const updated = { ...prev, ...sanitizedSettings };
      try {
        localStorage.setItem('owlup_user_settings', JSON.stringify(updated));
        const activeEmail = localStorage.getItem('owlup_active_email');
        if (activeEmail && activeEmail !== 'guest') {
          saveAccountData(activeEmail, { settings: updated });
        }
      } catch {}
      return updated;
    });
  };

  const handleApplySchedule = (newBedtime: string, newWakeTime: string, newHours: string, napStart?: string, napDuration?: string) => {
    setBedtime(newBedtime);
    setWakeTime(newWakeTime);
    setTotalSleepHours(newHours);
    try {
      localStorage.setItem('owlup_bedtime', newBedtime);
      localStorage.setItem('owlup_waketime', newWakeTime);
      localStorage.setItem('owlup_total_sleep_hours', newHours);
      localStorage.setItem('owlup_schedule_applied', 'true');
      const todayDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      localStorage.setItem('owlup_schedule_date', todayDateStr);
      const dur = parseInt(napDuration || '0');
      if (napStart && dur > 0) {
        const h = parseInt(napStart.split(':')[0]);
        const m = parseInt(napStart.split(':')[1]);
        const endMins = h * 60 + m + dur;
        const endH = Math.floor(endMins / 60) % 24;
        const endM = endMins % 60;
        const endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        const napObj = { start: napStart, end: endStr, duration: dur };
        localStorage.setItem('owlup_planned_nap', JSON.stringify(napObj));
        setPlannedNap(napObj);
      } else {
        localStorage.removeItem('owlup_planned_nap');
        setPlannedNap(null);
      }
      const commitmentsRaw = localStorage.getItem('owlup_commitments');
      const comms = commitmentsRaw ? JSON.parse(commitmentsRaw) : [];
      setCommitments(comms);
      const activeEmail = localStorage.getItem('owlup_active_email');
      if (activeEmail && activeEmail !== 'guest') {
        const commitmentsRaw = localStorage.getItem('owlup_commitments');
        const commitments = commitmentsRaw ? JSON.parse(commitmentsRaw) : [];
        saveAccountData(activeEmail, {
          bedtime: newBedtime,
          wakeTime: newWakeTime,
          totalSleepHours: newHours,
          commitments,
        });
      }
    } catch {}
    
    // Also trigger a re-render of Timeline/Dashboard by firing an event if needed, 
    // but React state change on ActiveFeature might be enough.
  };

  const handleUpdateBedtime = (newBedtime: string) => {
    setBedtime(newBedtime);
    try {
      localStorage.setItem('owlup_bedtime', newBedtime);
      const activeEmail = localStorage.getItem('owlup_active_email');
      if (activeEmail && activeEmail !== 'guest') {
        saveAccountData(activeEmail, { bedtime: newBedtime });
      }
    } catch {}
  };

  // Daily rollover logic: migrate tomorrow's plan or reset today's active plan if new day begins (00:00)
  const handleDailyRollover = (todayStr: string) => {
    localStorage.setItem('owlup_has_rolled_over', 'true');
    localStorage.setItem('owlup_has_passed_midnight', 'true');

    // Archive previous day's metrics into history if not already archived
    const lastActive = localStorage.getItem('owlup_last_active_date');
    if (lastActive && lastActive !== todayStr) {
      try {
        const rawHist = localStorage.getItem('owlup_history');
        const hist = rawHist ? JSON.parse(rawHist) : {};
        if (!hist[lastActive] && bedtime && wakeTime) {
          const [bh, bm] = bedtime.split(':').map(Number);
          const [wh, wm] = wakeTime.split(':').map(Number);
          let diff = (wh * 60 + wm) - (bh * 60 + bm);
          if (diff <= 0) diff += 24 * 60;
          const dur = Number((diff / 60).toFixed(1));
          const currentCaff = caffeineLog || [];
          const totalCaff = currentCaff.reduce((sum: number, it: any) => sum + (it.caffeineMg || 0), 0);
          hist[lastActive] = {
            date: lastActive,
            sleepHours: dur,
            sleepDurationHours: dur,
            sleepScore: dur >= 7.5 ? 88 : dur >= 6.5 ? 75 : 62,
            caffeineMg: totalCaff,
            status: dur >= 7.0 ? 'optimal' : 'deficit'
          };
          localStorage.setItem('owlup_history', JSON.stringify(hist));
        }
      } catch {}
    }

    // Check if user had scheduled a plan for tomorrow
    const savedTomorrow = localStorage.getItem('owlup_tomorrow_schedule');
    const savedTomorrowGoal = localStorage.getItem('owlup_tomorrow_recovery_goal');

    if (savedTomorrow) {
      try {
        const parsedTomorrow = JSON.parse(savedTomorrow);
        // Prioritize exact bedtime from tomorrow's plan preview
        const newBed = parsedTomorrow.bedtimeTonight || parsedTomorrow.expectedBedtimeTomorrow || '22:30';
        const newWake = parsedTomorrow.wakeTimeTomorrow || '06:30';
        const [bh, bm] = newBed.split(':').map(Number);
        const [wh, wm] = newWake.split(':').map(Number);
        let diff = (wh * 60 + wm) - (bh * 60 + bm);
        if (diff <= 0) diff += 24 * 60;
        const durHours = (diff / 60).toFixed(1);

        setBedtime(newBed);
        setWakeTime(newWake);
        setTotalSleepHours(durHours);
        localStorage.setItem('owlup_bedtime', newBed);
        localStorage.setItem('owlup_waketime', newWake);
        localStorage.setItem('owlup_total_sleep_hours', durHours);
        localStorage.setItem('owlup_schedule_applied', 'true');
        localStorage.setItem('owlup_schedule_date', todayStr);
        localStorage.setItem('owlup_schedule_rolled_from_tomorrow', 'true');

        // Transfer commitments if tomorrow had any
        if (Array.isArray(parsedTomorrow.commitments) && parsedTomorrow.commitments.length > 0) {
          localStorage.setItem('owlup_commitments', JSON.stringify(parsedTomorrow.commitments));
          setCommitments(parsedTomorrow.commitments);
        } else {
          localStorage.removeItem('owlup_commitments');
          setCommitments([]);
        }

        // Power nap from preview
        if (parsedTomorrow.napTomorrowDuration && parsedTomorrow.napTomorrowDuration > 0 && parsedTomorrow.napTomorrowStart) {
          const [nh, nm] = parsedTomorrow.napTomorrowStart.split(':').map(Number);
          const endMins = (nh * 60 + nm + parsedTomorrow.napTomorrowDuration) % 1440;
          const endH = Math.floor(endMins / 60);
          const endM = endMins % 60;
          const napObj = {
            start: parsedTomorrow.napTomorrowStart,
            end: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
            duration: parsedTomorrow.napTomorrowDuration
          };
          localStorage.setItem('owlup_planned_nap', JSON.stringify(napObj));
          setPlannedNap(napObj);
        } else {
          localStorage.removeItem('owlup_planned_nap');
          setPlannedNap(null);
        }

        // Recovery Goal
        if (savedTomorrowGoal) {
          localStorage.setItem('owlup_recovery_goal', savedTomorrowGoal);
        }

        // Clean up tomorrow keys now that they are rolled into today
        localStorage.removeItem('owlup_tomorrow_schedule');
        localStorage.removeItem('owlup_tomorrow_commitments');
        localStorage.removeItem('owlup_tomorrow_recovery_goal');
      } catch {
        // Fallback if parsing fails
        localStorage.removeItem('owlup_schedule_applied');
        localStorage.removeItem('owlup_schedule_date');
        localStorage.removeItem('owlup_planned_nap');
        localStorage.removeItem('owlup_commitments');
        localStorage.removeItem('owlup_schedule_rolled_from_tomorrow');
        setPlannedNap(null);
        setCommitments([]);
      }
    } else {
      localStorage.removeItem('owlup_schedule_applied');
      localStorage.removeItem('owlup_schedule_date');
      localStorage.removeItem('owlup_planned_nap');
      localStorage.removeItem('owlup_commitments');
      localStorage.removeItem('owlup_schedule_rolled_from_tomorrow');
      setPlannedNap(null);
      setCommitments([]);
    }

    // Tomorrow commitments are strictly cleared from data for the new day
    localStorage.removeItem('owlup_tomorrow_commitments');

    // Caffeine log is cleared every day at 00:00 rollover
    localStorage.removeItem('owlup_caffeine_log');
    localStorage.setItem('owlup_last_active_date', todayStr);
    setCaffeineLog([]);

    const activeEmail = localStorage.getItem('owlup_active_email');
    if (activeEmail && activeEmail !== 'guest') {
      saveAccountData(activeEmail, {
        commitments: [],
        caffeineLog: [],
        lastActiveDate: todayStr,
      });
    }
  };

  useEffect(() => {
    const todayStr = getTodayDateStr();
    const lastActive = localStorage.getItem('owlup_last_active_date');
    if (lastActive && lastActive !== todayStr) {
      handleDailyRollover(todayStr);
    } else if (!lastActive) {
      localStorage.setItem('owlup_last_active_date', todayStr);
    }
  }, []);

  // Keep caffeine limit synchronized with user profile habit (e.g. few_times_week -> 300mg)
  useEffect(() => {
    if (userProfile?.caffeineFrequency) {
      const { dailyLimitMg, thresholdMg } = getCaffeineLimitsByFrequency(userProfile.caffeineFrequency);
      if (settings.dailyCaffeineLimitMg !== dailyLimitMg) {
        handleUpdateSettings({ dailyCaffeineLimitMg: dailyLimitMg, caffeineThresholdMg: thresholdMg });
      }
    }
  }, [userProfile?.caffeineFrequency]);

  // Live timer tick and midnight rollover check
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const todayStr = getTodayDateStr();
      const lastActive = localStorage.getItem('owlup_last_active_date');
      if (lastActive && lastActive !== todayStr) {
        handleDailyRollover(todayStr);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Check and clear caffeine logs automatically when fully decayed
  useEffect(() => {
    if (caffeineLog.length > 0) {
      const nowMs = currentTime.getTime();
      const hasExpiredLogs = caffeineLog.some(log => !isLogValid(log, nowMs));
      
      if (hasExpiredLogs) {
        const newLogs = caffeineLog.filter(log => isLogValid(log, nowMs));
        handleUpdateCaffeineLog(newLogs);
      }
    }
  }, [currentTime, caffeineLog]);

  // Circadian lighting theme evaluation (supports live preview before saving)
  const isNight = React.useMemo(() => {
    const activeTheme = previewThemeMode ?? settings.themeMode;
    if (activeTheme === 'night') return true;
    if (activeTheme === 'day') return false;
    const hour = currentTime.getHours();
    return hour >= 19 || hour < 6;
  }, [currentTime, settings.themeMode, previewThemeMode]);

  const isEn = (settings.language || 'en') === 'en';

  const timeString = React.useMemo(() => {
    return formatDisplayTime(currentTime, isEn);
  }, [currentTime, isEn]);

  // If user is on dedicated Landing Screen, render it
  if (showLandingScreen) {
    return (
      <div className={isNight ? 'dark' : ''}>
        <LandingScreen
          isNight={isNight}
          language={settings.language}
          onLoginWithEmail={handleLoginWithEmail}
          onLoginWithGoogle={handleLoginWithGoogle}
          onStartProfileSetup={() => setIsOnboardingOpen(true)}
          onContinueAsGuest={handleContinueAsGuest}
          defaultEmail="k63.2412550051@ftu.edu.vn"
        />

        {/* Onboarding & Profile Setup Modal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={handleCloseOnboarding}
          isNight={isNight}
          language={settings.language || 'en'}
          initialProfile={userProfile}
          onCompleteProfile={handleCompleteProfile}
          onLanguageChange={(lang) => handleUpdateSettings({ language: lang })}
          defaultEmail="k63.2412550051@ftu.edu.vn"
          isGuestMode={isGuestOnboarding}
        />
      </div>
    );
  }

  // MAIN APP SCREEN (Dashboard & Features)
  return (
    <>
    <div
      className={`min-h-screen flex flex-col font-sans relative ${
        isNight ? 'dark text-slate-100' : 'text-slate-900'
      }`}
      style={{
        backgroundColor: isNight ? '#1A2540' : '#fffff8',
        color: isNight ? '#F8FAFC' : '#1F2937',
      }}
    >

      {/* FLOATING ACTION BUTTONS */}
      {!showLandingScreen && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50 transition-all duration-300">
          <button
            onClick={handleManualOpenGuide}
            className="w-12 h-12 rounded-full bg-[#FDE6A5] shadow-lg flex items-center justify-center text-[#1F2937] hover:bg-[#FCD34D] transition-all"
            title={isEn ? "Guidebook" : "Cẩm nang hướng dẫn"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-full bg-[#FDE6A5] shadow-lg flex items-center justify-center text-[#1F2937] hover:bg-[#FCD34D] transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      )}

      <Header
        activeFeature={activeFeature}
        setActiveFeature={handleSelectFeature}
        isNight={isNight}
        language={settings.language || 'en'}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userProfile={userProfile}
        onOpenProfileSetup={() => setIsOnboardingOpen(true)}
        onOpenInstruction={handleManualOpenGuide}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-3 md:pt-6 pb-24 md:pb-40 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/30 dark:to-[#1A2540]/30 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-5xl mx-auto">
          {/* 1. Dashboard (Flowchart: Today's sleep plan + Live circadian position) */}
          <div className={activeFeature === 'dashboard' ? 'block animate-premium-in' : 'hidden'}>
            <Dashboard
              isNight={isNight}
              language={settings.language || 'en'}
              userProfile={userProfile}
              settings={settings}
              bedtime={bedtime}
              wakeTime={wakeTime}
              totalSleepHours={totalSleepHours}
              plannedNap={plannedNap}
              caffeineLog={caffeineLog}
              dailyLimitMg={settings.dailyCaffeineLimitMg || 400}
              onSelectFeature={handleSelectFeature}
              onNavigateToPlanner={() => handleSelectFeature('planner')}
              onNavigateToCaffeine={() => setActiveFeature('caffeine')}
              onNavigateToTimeline={() => setActiveFeature('timeline')}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>

          {/* 2. Recovery Planner (Flowchart: Occupied times -> Free slots -> Recommendation -> Agree/Customize -> Qualified/Unqualified -> Save) */}
          <div className={activeFeature === 'planner' ? 'block animate-premium-in' : 'hidden'}>
            <RecoveryPlanner
              key={plannerKey}
              isNight={isNight}
              language={settings.language || 'en'}
              userProfile={userProfile}
              bedtime={bedtime}
              wakeTime={wakeTime}
              totalSleepHours={totalSleepHours}
              plannedNap={plannedNap}
              commitments={commitments}
              onApplySchedule={handleApplySchedule}
              onUpdateCommitments={setCommitments}
              onNavigateToTimeline={() => setActiveFeature('timeline')}
              onNavigateToDashboard={() => setActiveFeature('dashboard')}
              onNavigateToCaffeine={() => setActiveFeature('caffeine')}
            />
          </div>

          {/* 3. Caffeine Advisor (Flowchart: What's powering you? / Time -> Analyze -> Recommendation -> Agree/Disagree -> Custom -> Choose goal -> New Timeline -> Dashboard) */}
          <div className={activeFeature === 'caffeine' ? 'block animate-premium-in' : 'hidden'}>
            <CaffeineAdvisor
              isNight={isNight}
              language={settings.language || 'en'}
              targetBedtime={bedtime}
              wakeTime={wakeTime}
              dailyLimitMg={settings.dailyCaffeineLimitMg || 400}
              bedtimeThresholdMg={settings.caffeineThresholdMg || 25}
              loggedItems={caffeineLog}
              onUpdateLoggedItems={handleUpdateCaffeineLog}
              onUpdateBedtime={handleUpdateBedtime}
              onNavigateToTimeline={() => setActiveFeature('timeline')}
              onNavigateToDashboard={() => setActiveFeature('dashboard')}
              onUpdateDailyLimit={(limit) => handleUpdateSettings({ dailyCaffeineLimitMg: limit })}
              initialRecoveryGoal={settings.recoveryGoal || 'healthy_balanced'}
              onUpdateRecoveryGoal={(goal: DayRecoveryGoal) => handleUpdateSettings({ recoveryGoal: goal })}
              onRemoveDrink={(id) => handleUpdateCaffeineLog(caffeineLog.filter(log => log.id !== id))}
            />
          </div>

          {/* 4. Detailed 24h Timeline */}
          <div className={activeFeature === 'timeline' ? 'block animate-premium-in' : 'hidden'}>
            <RecoveryTimeline
              isNight={isNight}
              language={settings.language || 'en'}
              bedtime={bedtime}
              wakeTime={wakeTime}
              totalSleepHours={totalSleepHours}
              commitments={commitments}
              caffeineLog={caffeineLog}
              napStart={plannedNap?.start}
              napDuration={plannedNap && plannedNap.duration > 0 ? plannedNap.duration.toString() : '0'}
              userProfile={userProfile}
              currentGoal={settings.recoveryGoal || 'healthy_balanced'}
              onUpdateRecoveryGoal={(goal: DayRecoveryGoal) => handleUpdateSettings({ recoveryGoal: goal })}
              onUpdateBedtime={handleApplySchedule}
              onUpdateCaffeineLog={handleUpdateCaffeineLog}
              onUpdateCommitments={(newComms) => {
                setCommitments(newComms);
                try {
                  localStorage.setItem('owlup_commitments', JSON.stringify(newComms));
                  const activeEmail = localStorage.getItem('owlup_active_email');
                  if (activeEmail && activeEmail !== 'guest') {
                    saveAccountData(activeEmail, { commitments: newComms });
                  }
                } catch {}
              }}
              onNavigateToPlanner={() => handleSelectFeature('planner')}
              onNavigateToCaffeine={() => setActiveFeature('caffeine')}
              onNavigateToDashboard={() => setActiveFeature('dashboard')}
            />
          </div>
        </div>
      </main>

      {/* Onboarding & Profile Setup with 6-question flow + Google Sign In */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        isNight={isNight}
        language={settings.language || 'en'}
        initialProfile={userProfile}
        onCompleteProfile={handleCompleteProfile}
        onLanguageChange={(lang) => handleUpdateSettings({ language: lang })}
        defaultEmail="k63.2412550051@ftu.edu.vn"
      />

      {/* Progressive Contextual Feature Guide or Full Guide Popup */}
      <InstructionModal
        isOpen={isInstructionOpen}
        onClose={handleCloseInstruction}
        isNight={isNight}
        language={settings.language || 'en'}
        featureFocus={featureGuideFocus}
        onNavigateToDashboard={() => setActiveFeature('dashboard')}
      />

      {/* Centralized Settings Modal with Profile, Notifications & Appearance */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setPreviewThemeMode(null);
        }}
        isNight={isNight}
        settings={settings}
        onPreviewThemeMode={(mode) => setPreviewThemeMode(mode)}
        onUpdateSettings={(newSettings) => {
          setPreviewThemeMode(null);
          handleUpdateSettings(newSettings);
        }}
        onClearCaffeineLog={handleClearCaffeineLog}
        loggedDrinkCount={caffeineLog.length}
        userProfile={userProfile}
        onOpenProfileSetup={() => setIsOnboardingOpen(true)}
        onOpenEditProfile={() => {
          setIsSettingsOpen(false);
          setIsEditProfileOpen(true);
        }}
        onSignOut={handleSignOut}
        onReturnToDashboard={() => setActiveFeature('dashboard')}
      />

      {/* Dedicated Edit Profile Modal for Questions 2, 3, 4, 5 */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => {
          setIsEditProfileOpen(false);
          setIsSettingsOpen(true);
        }}
        isNight={isNight}
        language={settings.language || 'en'}
        userProfile={userProfile}
        onSave={handleSaveProfileChanges}
      />

      {/* Footer */}
      <footer className={`mt-16 w-full py-8 sm:py-12 ${isNight ? 'bg-gradient-to-t from-[#0F172A] to-[#1A2540]' : 'bg-gradient-to-t from-[#3B9E77] to-[#73C2A6]'} text-white relative overflow-hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 relative z-10">
          <div className="flex items-center gap-3">
            <Logo size="lg" isNight={true} variant="footer" />
          </div>

          <div className="text-xs sm:text-sm font-medium tracking-wide opacity-90 font-sans text-center md:text-right">
            {isEn
              ? 'Science-backed - Gentle - Circadian alignment'
              : 'Khoa học - Nhẹ nhàng - Tôn trọng nhịp sinh học'}
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
