-- ============ PROFILES: novos campos ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- ============ POLICIES ============
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_type TEXT NOT NULL,
  item_label TEXT,
  policy_number TEXT NOT NULL,
  insurer TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  premium TEXT,
  coverages TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policies_user ON public.policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON public.policies(end_date);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own policies" ON public.policies
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all policies" ON public.policies
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert policies" ON public.policies
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update policies" ON public.policies
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete policies" ON public.policies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLAIMS ============
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  protocol TEXT NOT NULL,
  insurance_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise',
  indemnity_amount NUMERIC(12,2),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims(user_id);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own claims" ON public.claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all claims" ON public.claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert claims" ON public.claims
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update claims" ON public.claims
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete claims" ON public.claims
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLIENT DOCUMENTS (uploads pessoais) ============
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_documents_user ON public.client_documents(user_id);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own client docs" ON public.client_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own client docs" ON public.client_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own client docs" ON public.client_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ POLICY DOCUMENTS (PDFs anexados pelo admin) ============
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'apolice', -- 'apolice' | 'recibo' | 'endosso'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policy_documents_user ON public.policy_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_policy ON public.policy_documents(policy_id);

ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own policy docs" ON public.policy_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all policy docs" ON public.policy_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert policy docs" ON public.policy_documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update policy docs" ON public.policy_documents
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete policy docs" ON public.policy_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- client-documents: somente dono lê/escreve/exclui
CREATE POLICY "Users read own client files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own client files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own client files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- policy-documents: dono lê seus PDFs; admin gerencia tudo
CREATE POLICY "Users read own policy files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all policy files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload policy files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete policy files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'policy-documents' AND public.has_role(auth.uid(), 'admin'));