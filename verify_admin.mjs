import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = "contato.dicoonseguros@gmail.com";
  const password = "dicoon123";
  
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) {
    console.error("Erro ao fazer login:", signInError.message);
    return;
  }
  
  const userId = signInData.user.id;
  console.log(`Logado como ${email} (ID: ${userId})`);
  
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
    
  if (rolesError) {
    console.error("Erro ao buscar roles:", rolesError.message);
  } else {
    console.log("Roles encontradas:", roles);
    const isAdmin = (roles ?? []).some(r => r.role === 'admin');
    console.log(`É admin? ${isAdmin ? 'SIM' : 'NÃO'}`);
  }
}

check();
