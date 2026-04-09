-- Clean up legacy profiles.is_seller: align with role + nullable is_approved (buyer/seller model).
-- Idempotent: safe if 020 already ran (no is_seller) or on a DB that never ran 020.
--
-- Data rules:
--   is_seller = true  -> role = 'seller', is_approved = true
--   is_seller = false or null -> role = 'buyer', is_approved = null
-- After migration from is_seller, all buyers get is_approved = NULL (also normalizes 020 rows).
--
-- Admin check in promote_profile_to_seller_for_admin matches migration 010 (JWT app + user metadata).

-- ---------------------------------------------------------------------------
-- 1) Columns: role
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role text NOT NULL DEFAULT 'buyer';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('buyer', 'seller'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.role IS 'Account type: buyer or seller.';

-- ---------------------------------------------------------------------------
-- 2) Columns: is_approved (nullable; N/A for buyers)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_approved'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_approved boolean NULL;
  END IF;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN is_approved DROP NOT NULL;

COMMENT ON COLUMN public.profiles.is_approved IS
  'When role = seller: true = admin-approved; false = pending or rejected. NULL when role = buyer.';

-- ---------------------------------------------------------------------------
-- 3) Drop RLS policies that still reference is_seller (if any)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE coalesce(qual::text, '') LIKE '%is_seller%'
       OR coalesce(with_check::text, '') LIKE '%is_seller%'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Migrate from is_seller then drop column
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_seller'
  ) THEN
    UPDATE public.profiles
    SET
      role = 'seller',
      is_approved = true
    WHERE is_seller IS TRUE;

    UPDATE public.profiles
    SET
      role = 'buyer',
      is_approved = NULL
    WHERE is_seller IS NOT TRUE;

    ALTER TABLE public.profiles DROP COLUMN is_seller;
  END IF;
END $$;

-- Buyers always use NULL for is_approved (covers DBs that only had migration 020, etc.)
UPDATE public.profiles
SET is_approved = NULL
WHERE role = 'buyer';

-- ---------------------------------------------------------------------------
-- 5) Admin RPC: no is_seller — promote to approved seller
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_profile_to_seller_for_admin(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Same semantics as public.auth_is_admin_from_jwt() in 010_expand_jwt_admin_check.sql
  IF NOT (
    coalesce(
      (coalesce((auth.jwt() -> 'app_metadata')::jsonb, '{}'::jsonb) -> 'is_admin') = to_jsonb(true),
      false
    )
    OR coalesce(
      (coalesce((auth.jwt() -> 'user_metadata')::jsonb, '{}'::jsonb) -> 'is_admin') = to_jsonb(true),
      false
    )
    OR lower(nullif(btrim(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '')), ''))
      IN ('true', 't', '1', 'yes')
      OR lower(nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', '')), ''))
      IN ('true', 't', '1', 'yes')
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    role = 'seller',
    is_approved = true
  WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) TO authenticated;
