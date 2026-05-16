
CREATE TABLE public.broker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Dicoon Seguros',
  contact_email text NOT NULL DEFAULT 'contato@dicoonseguros.com.br',
  whatsapp text NOT NULL DEFAULT '(51) 98236-7904',
  whatsapp_link text NOT NULL DEFAULT 'https://wa.me/message/HCHOQ3CXMLGFG1',
  business_hours text NOT NULL DEFAULT 'Seg–Sex 9h–18h',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broker_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broker settings" ON public.broker_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone authenticated views broker settings" ON public.broker_settings
  FOR SELECT TO authenticated USING (true);
INSERT INTO public.broker_settings (singleton) VALUES (true);

CREATE TABLE public.alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  d60 boolean NOT NULL DEFAULT false,
  d30 boolean NOT NULL DEFAULT true,
  d15 boolean NOT NULL DEFAULT true,
  d7  boolean NOT NULL DEFAULT true,
  d0  boolean NOT NULL DEFAULT true,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage alert settings" ON public.alert_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
INSERT INTO public.alert_settings (singleton) VALUES (true);
