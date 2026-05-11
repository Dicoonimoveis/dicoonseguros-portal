-- Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'WhatsApp',
  status TEXT DEFAULT 'Novo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Opportunities (Cotações/Propostas) Table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  insurer TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'Cotação',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  type TEXT DEFAULT 'call',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS on all
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Simple Policies: Users can see only their own data
CREATE POLICY "Users can manage their own leads" ON public.leads ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own clients" ON public.clients ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own opportunities" ON public.opportunities ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tasks" ON public.tasks ALL TO authenticated USING (auth.uid() = user_id);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads, public.clients, public.opportunities, public.tasks;
