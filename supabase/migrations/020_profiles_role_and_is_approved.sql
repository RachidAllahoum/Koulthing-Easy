-- Profiles: replace is_seller with role ('buyer' | 'seller') + is_approved (sellers).
-- Run once in Supabase SQL editor (or via CLI). After this, update app code to use role/is_approved.
--
-- seller_applications.user_id already matches profiles.id (same as auth.users.id). Shops remain for approved sellers only at the app layer.
--
-- After running: update any auth signup trigger / RPC that INSERTs into profiles with is_seller — those will fail once is_seller is dropped.

-- ---------------------------------------------------------------------------
-- 1) New columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'buyer'
    CONSTRAINT profiles_role_check CHECK (role IN ('buyer', 'seller'));

ALTER TABLE public.profiles
  ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.role IS 'Account type: buyer or seller.';
COMMENT ON COLUMN public.profiles.is_approved IS 'When role = seller, true means admin-approved (may operate seller features / have a shop).';

-- ---------------------------------------------------------------------------
-- 2) Migrate from is_seller (assumes column still exists)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  role = 'seller',
  is_approved = true
WHERE is_seller IS TRUE;

-- ---------------------------------------------------------------------------
-- 3) RPC used by some setups: must not reference is_seller after drop
--     (Admin check matches migration 011 pattern; adjust if you use auth_is_admin_from_jwt() or is_admin_user() only.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_profile_to_seller_for_admin(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS DISTINCT FROM true THEN
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

-- ---------------------------------------------------------------------------
-- 4) Drop legacy column
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_seller;

-- Optional documentation: applications are tied to the applicant profile
COMMENT ON COLUMN public.seller_applications.user_id IS 'Applicant profile id = auth.users.id.';
