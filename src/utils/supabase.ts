import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserSettings, CaffeineItem } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qqbifwrmzwqrrwybjhaq.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYmlmd3JtendxcnJ3eWJqaGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTQwOTgsImV4cCI6MjEwNTc5MDA5OH0.Gdbcx20gNLmL7gYEdtjPjYUqHJGxWCS0wFn9r_iJe1k';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface SupabaseUserRecord {
  id: string;
  email?: string;
  profile?: UserProfile;
  settings?: UserSettings;
  bedtime?: string;
  wake_time?: string;
  wakeTime?: string;
  total_sleep_hours?: string;
  totalSleepHours?: string;
  caffeine_log?: CaffeineItem[];
  caffeineLog?: CaffeineItem[];
  commitments?: any[];
  planned_nap?: { start: string; end: string; duration: number } | null;
  plannedNap?: { start: string; end: string; duration: number } | null;
  history?: Record<string, any>;
  onboarding_completed?: boolean;
  onboardingCompleted?: boolean;
  recovery_goal?: string;
  recoveryGoal?: string;
  last_active_date?: string;
  lastActiveDate?: string;
  updated_at?: string;
}

/**
 * Fetch user record by auth user id from Supabase
 * Enforces RLS (auth.uid() = id)
 */
export const fetchUserData = async (userId: string): Promise<SupabaseUserRecord | null> => {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error fetching user by ID:', error.message);
      return null;
    }
    return data as SupabaseUserRecord;
  } catch (err: any) {
    console.warn('[Supabase] Exception fetching user data:', err.message);
    return null;
  }
};

/**
 * Fetch user record by email fallback (if session ID is pending)
 */
export const fetchUserDataByEmail = async (email: string): Promise<SupabaseUserRecord | null> => {
  if (!supabase || !email) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error fetching user by email:', error.message);
      return null;
    }
    return data as SupabaseUserRecord;
  } catch (err: any) {
    console.warn('[Supabase] Exception fetching user by email:', err.message);
    return null;
  }
};

/**
 * Upsert user record to Supabase
 * Scoped to the authenticated user ID (RLS: auth.uid() = id)
 */
export const upsertUserData = async (userId: string, payload: Partial<SupabaseUserRecord>): Promise<boolean> => {
  if (!supabase || !userId) return false;
  try {
    const upsertData: Record<string, any> = {
      id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Error upserting user data:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Exception upserting user data:', err.message);
    return false;
  }
};

/**
 * Hydrates localStorage cache with data fetched from Supabase.
 * Preserves all existing localStorage key names exactly.
 */
export const hydrateLocalStorage = (data: SupabaseUserRecord) => {
  if (!data) return;

  const email = (data.email || data.profile?.email || '').trim().toLowerCase();
  const profile = data.profile || {
    name: 'OwlUp User',
    age: 25,
    usualBedtime: data.bedtime || '23:00',
    chronotype: 'night_owl',
    energyCrave: 'nap',
    caffeineFrequency: 'once_a_day',
    email,
    authProvider: 'google',
    onboardingCompleted: true,
  };

  const bedtime = data.bedtime || profile.usualBedtime || '23:00';
  const wakeTime = data.wake_time || data.wakeTime || '07:00';
  const totalSleepHours = data.total_sleep_hours || data.totalSleepHours || '8.0';
  const caffeineLog = data.caffeine_log || data.caffeineLog || [];
  const commitments = data.commitments || [];
  const plannedNap = data.planned_nap || data.plannedNap || null;
  const history = data.history || {};
  const settings = data.settings || null;
  const recoveryGoal = data.recovery_goal || data.recoveryGoal || settings?.recoveryGoal || 'healthy_balanced';

  try {
    if (email) {
      localStorage.setItem('owlup_active_email', email);
    }
    localStorage.setItem('owlup_user_profile', JSON.stringify(profile));
    localStorage.setItem('owlup_onboarding_completed', 'true');
    localStorage.setItem('owlup_bedtime', bedtime);
    localStorage.setItem('owlup_waketime', wakeTime);
    localStorage.setItem('owlup_wakeup_today', wakeTime);
    localStorage.setItem('owlup_total_sleep_hours', totalSleepHours);
    localStorage.setItem('owlup_recovery_goal', recoveryGoal);
    localStorage.setItem('owlup_caffeine_log', JSON.stringify(caffeineLog));
    localStorage.setItem('owlup_commitments', JSON.stringify(commitments));

    if (plannedNap) {
      localStorage.setItem('owlup_planned_nap', JSON.stringify(plannedNap));
    } else {
      localStorage.removeItem('owlup_planned_nap');
    }

    if (Object.keys(history).length > 0) {
      localStorage.setItem('owlup_history', JSON.stringify(history));
    }

    if (settings) {
      localStorage.setItem('owlup_user_settings', JSON.stringify(settings));
    }

    if (email) {
      // Also sync into owlup_accounts map
      const accountsRaw = localStorage.getItem('owlup_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      accounts[email] = {
        profile,
        settings,
        bedtime,
        wakeTime,
        totalSleepHours,
        caffeineLog,
        commitments,
        plannedNap,
        history,
        onboardingCompleted: true,
        lastActiveDate: data.last_active_date || data.lastActiveDate,
      };
      localStorage.setItem('owlup_accounts', JSON.stringify(accounts));
    }
  } catch (err: any) {
    console.warn('[Supabase] Error hydrating localStorage:', err.message);
  }
};

export const getStoredAuthUserId = (): string | null => {
  try {
    return localStorage.getItem('owlup_supabase_user_id');
  } catch {
    return null;
  }
};

export const setStoredAuthUserId = (id: string | null) => {
  try {
    if (id) {
      localStorage.setItem('owlup_supabase_user_id', id);
    } else {
      localStorage.removeItem('owlup_supabase_user_id');
    }
  } catch {}
};

/**
 * Convenience helper to upsert full account state to Supabase for the current user
 */
export const syncAccountToSupabase = async (
  userId: string,
  accountData: {
    email?: string;
    profile?: any;
    settings?: any;
    bedtime?: string;
    wakeTime?: string;
    totalSleepHours?: string;
    caffeineLog?: any[];
    commitments?: any[];
    plannedNap?: any;
    history?: any;
    lastActiveDate?: string;
    onboardingCompleted?: boolean;
    recoveryGoal?: string;
  }
) => {
  if (!isSupabaseConfigured || !userId) return;
  const payload: Partial<SupabaseUserRecord> = {
    email: accountData.email || accountData.profile?.email,
    profile: accountData.profile,
    settings: accountData.settings,
    bedtime: accountData.bedtime,
    wake_time: accountData.wakeTime,
    total_sleep_hours: accountData.totalSleepHours,
    caffeine_log: accountData.caffeineLog,
    commitments: accountData.commitments,
    planned_nap: accountData.plannedNap,
    history: accountData.history,
    last_active_date: accountData.lastActiveDate,
    onboarding_completed: accountData.onboardingCompleted ?? true,
    recovery_goal: accountData.recoveryGoal,
  };
  await upsertUserData(userId, payload);
};
