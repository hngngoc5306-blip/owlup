export type ThemeMode = 'night' | 'day' | 'auto';

export type AppFeature = 'dashboard' | 'planner' | 'caffeine' | 'timeline' | 'settings';

export type DayRecoveryGoal = 
  | 'healthy_balanced' 
  | 'max_productivity' 
  | 'catch_up' 
  | 'stay_up_late';

export type Chronotype = 'early_bird' | 'night_owl' | 'neither' | 'intermediate';

export type EnergyCrave = 
  | 'nap'
  | 'caffeine'
  | 'phone'
  | 'music'
  | 'exercise'
  | 'relax'
  | 'other';

export type CaffeineFrequency = 
  | 'never'
  | 'rarely'
  | 'few_times_week'
  | 'once_a_day'
  | 'multiple_times_day'
  | 'multiple_times_a_day';

export interface OccupiedInterval {
  id: string;
  title: string;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "12:00"
}

export type SleepOptionType = 'quick_nap' | 'extended_nap' | 'main_sleep';

export interface NotificationSettings {
  recoveryReminders: boolean;
  napReminders: boolean;
  caffeineReminders: boolean;
  sleepReminders: boolean;
  soundMode: 'sound' | 'vibration' | 'silent';
}

export interface UserProfile {
  name: string;
  age: number | string;
  usualBedtime: string; // e.g. "11:30 PM"
  chronotype: Chronotype;
  energyCrave: EnergyCrave | EnergyCrave[];
  energyCraves?: EnergyCrave[];
  energyCraveOtherDetail?: string;
  caffeineFrequency: CaffeineFrequency;
  bedtime?: string;
  craves?: string[];
  email?: string;
  photoUrl?: string;
  authProvider?: 'google' | 'guest';
  onboardingCompleted?: boolean;
  createdAt?: string;
}

export type AppLanguage = 'en' | 'vi';

export interface UserSettings {
  themeMode: ThemeMode;
  language?: AppLanguage;
  fallAsleepMinutes: number;
  caffeineThresholdMg: number; // Ngưỡng tồn dư khi ngủ (< 25mg)
  dailyCaffeineLimitMg?: number; // Hạn mức an toàn cả ngày (chuẩn 400mg)
  caffeineCutoffHoursBeforeBed?: number; // Ví dụ: 6h - 8h trước khi ngủ
  showGuideBanner?: boolean;
  recoveryGoal?: DayRecoveryGoal;
  notifications?: NotificationSettings;
}

export interface SleepCycle {
  cycles: number;
  durationMinutes: number;
  timeString: string;
  label: string;
  isOptimal: boolean;
  type: 'emergency' | 'short' | 'recommended' | 'ideal';
  description: string;
}

export interface CaffeineItem {
  id: string;
  name: string;
  caffeineMg: number;
  timestamp: Date;
  servingSize: string;
  category: 'coffee' | 'tea' | 'energy' | 'matcha' | 'custom';
  volumeMl?: number;
  icon?: string;
}

export interface TimelineCheckpoint {
  id: string;
  time: string;
  title: string;
  category: 'sleep' | 'caffeine' | 'light' | 'hydration' | 'food' | 'winddown';
  description: string;
  completed: boolean;
  proTip?: string;
  importance: 'critical' | 'recommended' | 'optional';
}

export interface SleepQualityMetrics {
  totalScore: number; // 0 - 100
  durationScore: number; // 0 - 55
  consistencyScore: number; // 0 - 45
  durationHours: number;
  consistencyVarianceMinutes: number;
  rating: 'exceptional' | 'good' | 'fair' | 'needs_rest';
  ratingLabel: string;
  ratingColor: 'emerald' | 'blue' | 'amber' | 'rose';
  feedback: string;
  breakdown: {
    durationTitle: string;
    durationDetail: string;
    consistencyTitle: string;
    consistencyDetail: string;
  };
}

