-- Alter profiles to add status column defaulting to 'approved' for existing users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Re-define the handle_new_user trigger to insert new self-registered users with status 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'pending'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'corretor');

  RETURN NEW;
END;
$$;
