import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('users').upsert({
    id: '12345678901234567890',
    email: 'test@example.com'
  }, { onConflict: 'id' });
  console.log("Upsert result:", error ? error.message : "Success");
}
test();
