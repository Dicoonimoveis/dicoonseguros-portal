-- 20260515_lgpd_rls_policies.sql
-- Enforce LGPD strict Row Level Security (RLS) on all tables

-- Ensure RLS is enabled for all tables
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts and ensure strict LGPD compliance
DROP POLICY IF EXISTS "Admin full access on alert_settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Authenticated users can read broker_settings" ON public.broker_settings;
DROP POLICY IF EXISTS "Admin write access on broker_settings" ON public.broker_settings;
DROP POLICY IF EXISTS "Client read own claims" ON public.claims;
DROP POLICY IF EXISTS "Admin full access claims" ON public.claims;
DROP POLICY IF EXISTS "Client read/write own client_documents" ON public.client_documents;
DROP POLICY IF EXISTS "Client read own policies" ON public.policies;
DROP POLICY IF EXISTS "Admin full access policies" ON public.policies;
DROP POLICY IF EXISTS "Client read own policy_documents" ON public.policy_documents;
DROP POLICY IF EXISTS "Admin full access policy_documents" ON public.policy_documents;
DROP POLICY IF EXISTS "Client read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Client_Update_Own_Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin write access user_roles" ON public.user_roles;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. alert_settings: apenas admin
CREATE POLICY "Admin_Access_Alert_Settings" ON public.alert_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. broker_settings: apenas admin (cliente nao visualiza nem configurações gerais)
CREATE POLICY "Admin_Access_Broker_Settings" ON public.broker_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. apolices: cliente lê apenas próprias; admin acesso total
CREATE POLICY "Client_Read_Own_Policies" ON public.policies
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Admin_Full_Access_Policies" ON public.policies
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. policy_documents: cliente lê apenas vinculados às suas apólices; admin total
CREATE POLICY "Client_Read_Own_Policy_Docs" ON public.policy_documents
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Admin_Full_Access_Policy_Docs" ON public.policy_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. client_documents (documentos pessoais): cliente cria/lê/deleta próprios; admin total
CREATE POLICY "Client_Access_Own_Client_Docs" ON public.client_documents
  FOR ALL TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin()) WITH CHECK (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Admin_Full_Access_Client_Docs" ON public.client_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. sinistros (claims): cliente lê próprios; admin total
CREATE POLICY "Client_Read_Own_Claims" ON public.claims
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Admin_Full_Access_Claims" ON public.claims
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. clientes (profiles): cliente lê próprio, atualiza próprio; admin total
CREATE POLICY "Client_Read_Own_Profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Client_Update_Own_Profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND NOT public.is_admin()) WITH CHECK (user_id = auth.uid() AND NOT public.is_admin());
CREATE POLICY "Admin_Full_Access_Profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. user_roles: apenas admin acesso total, porém cliente precisa saber se é admin (a function is_admin faz bypass pois é SECURITY DEFINER, logo o select direto na tabela não é estritamente necessário para a avaliação das policies)
CREATE POLICY "Admin_Access_User_Roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Supabase Storage Buckets - Documentos Pessoais e Apólices
-- Enabling RLS on storage is also needed if not already
-- Since we don't know bucket structure, we assume they are standard storage.objects policies
-- We provide the policies to be run via SQL Editor or dashboard
