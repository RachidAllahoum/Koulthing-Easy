-- Fix missing profiles by:
-- 1) ensuring a signup trigger auto-creates profiles rows
-- 2) adding an admin helper used by approval flow to create a missing profile from auth.users
-- 3) backfilling missing profiles for existing auth.users

-- Ensure table exists with expected columns.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  is_seller boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS is_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Trigger function: create profile automatically when a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_seller, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- Admin helper: create missing profile from auth.users for a specific user id.
CREATE OR REPLACE FUNCTION public.admin_create_missing_profile_from_auth_user(
  p_user_id uuid,
  p_make_seller boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
BEGIN
  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', '')
  INTO v_email, v_full_name
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth.users row not found for id %', p_user_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, is_seller)
  VALUES (p_user_id, v_email, v_full_name, p_make_seller)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        is_seller = CASE WHEN p_make_seller THEN true ELSE public.profiles.is_seller END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_missing_profile_from_auth_user(uuid, boolean) TO authenticated;

-- Backfill existing auth users missing in public.profiles.
INSERT INTO public.profiles (id, email, full_name, is_seller, is_admin)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  false,
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
