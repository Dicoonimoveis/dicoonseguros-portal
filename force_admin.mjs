import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = "ricardo.dicoon@gmail.com";
  const password = "dicoon123";
  
  console.log("Tentando criar/logar o usuário...");
  let userId;
  
  // Try to sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: "Ricardo Admin" }
    }
  });

  if (signUpError && signUpError.message.includes("User already registered")) {
    console.log("Usuário já existe. Tentando fazer login para obter o ID...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error("Não foi possível fazer login com a senha atual. Você precisa usar o 'Esqueci minha senha' no site.");
      return;
    }
    userId = signInData.user.id;
  } else if (signUpError) {
    console.error("Erro ao criar usuário:", signUpError.message);
    return;
  } else if (signUpData.user) {
    userId = signUpData.user.id;
    console.log("Usuário criado com sucesso!");
  }

  if (!userId) {
    console.error("Não foi possível obter o ID do usuário.");
    return;
  }

  console.log(`User ID: ${userId}. Tentando inserir a role 'admin' na tabela user_roles...`);
  
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role: 'admin' }])
    .select();
    
  if (roleError) {
    console.log(`Ocorreu um erro ao inserir a role (provavelmente o RLS bloqueou): ${roleError.message}`);
    console.log("Tentando fazer UPDATE...");
    
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error(`O UPDATE também falhou: ${updateError.message}`);
    } else {
      console.log("Role atualizada com sucesso via UPDATE!");
    }
  } else {
    console.log("Role 'admin' inserida com sucesso na tabela user_roles!");
  }
}

run();
