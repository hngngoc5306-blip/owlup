import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const payload = {
    id: '12345678901234567890',
    email: 'testfull@example.com',
    profile: { name: 'Test' },
    settings: { language: 'en' },
    bedtime: '22:00',
    wake_time: '06:00',
    total_sleep_hours: '8.0',
    caffeine_log: [],
    commitments: [],
    planned_nap: null,
    history: {},
    last_active_date: new Date().toISOString(),
    onboarding_completed: true,
    recovery_goal: 'balanced'
  };

  const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  console.log("Upsert result:", error ? error.message : "Success");
}
test();
