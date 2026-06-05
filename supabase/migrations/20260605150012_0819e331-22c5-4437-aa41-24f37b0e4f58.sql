ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS renewal_date date;
ALTER TABLE public.policy_documents ADD COLUMN IF NOT EXISTS texto_extraido text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';