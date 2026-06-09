DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Verificar se o usuário já existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'contato.dicoonseguros@gmail.com') THEN
    -- Gerar novo ID
    new_user_id := gen_random_uuid();
    
    -- Inserir o usuário no Supabase Auth com email já confirmado e senha criptografada
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, 
      raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'contato.dicoonseguros@gmail.com',
      crypt('dicoon123', gen_salt('bf')),
      now(),
      '{"name":"Ricardo Admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    -- Criar identidade de email
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id::text, 'contato.dicoonseguros@gmail.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    -- Se o usuário já existir, apenas recupera o ID e atualiza a senha
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'contato.dicoonseguros@gmail.com';
    UPDATE auth.users 
    SET encrypted_password = crypt('dicoon123', gen_salt('bf')), 
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = new_user_id;
  END IF;

  -- Garantir que o perfil existe na tabela 'profiles'
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_user_id) THEN
    INSERT INTO public.profiles (user_id, name, email) 
    VALUES (new_user_id, 'Ricardo Admin', 'contato.dicoonseguros@gmail.com');
  END IF;

  -- Garantir que o usuário seja 'admin' na tabela 'user_roles'
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new_user_id AND role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (new_user_id, 'admin');
  END IF;

END $$;
