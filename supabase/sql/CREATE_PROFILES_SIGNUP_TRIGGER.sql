-- Auto-create profile rows when new auth users sign up.
-- Uses role + is_approved (buyer/seller model). Run after migrations that define these columns.

-- 1) Ensure profiles has required columns/defaults.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'buyer',
  is_approved boolean NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS is_approved boolean NULL,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('buyer', 'seller'));
  END IF;
END $$;

-- 2) Create trigger function.
CREATE OR REPLACE FUNCTION public.handle_new_user_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_approved, is_admin, created_at)
  VALUES (NEW.id, NEW.email, 'buyer', NULL, false, now())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3) Attach trigger to auth.users inserts.
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_create_profile();
