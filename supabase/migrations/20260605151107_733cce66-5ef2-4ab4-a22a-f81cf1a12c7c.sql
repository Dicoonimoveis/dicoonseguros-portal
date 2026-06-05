-- client_documents: admin management policies (mirror policy_documents)
CREATE POLICY "Admins view all client docs"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update client docs"
  ON public.client_documents FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete client docs"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles: admin read access to all profiles
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- storage: admin access to client-documents bucket
CREATE POLICY "Admins view client-documents storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete client-documents storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- storage: admin update (replace in-place) on policy-documents bucket
CREATE POLICY "Admins update policy-documents storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'policy-documents' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'policy-documents' AND has_role(auth.uid(), 'admin'::app_role));