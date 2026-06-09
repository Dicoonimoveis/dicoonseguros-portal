DROP POLICY IF EXISTS "Users_Can_Read_Own_Role" ON public.user_roles;
CREATE POLICY "Users_Can_Read_Own_Role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'contato.dicoonseguros@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;