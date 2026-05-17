import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: "ricardo.dicoon@gmail.com",
    password: "dicoon123"
  });
  
  if (signInError) {
    console.error("Login failed:", signInError.message);
    return;
  }
  
  const userId = signInData.user.id;
  const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', userId);
  console.log("Current roles for user:", roles);
}

check();
