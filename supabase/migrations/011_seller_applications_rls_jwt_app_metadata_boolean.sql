-- seller_applications RLS: admin via JWT only — no profiles, no json casts on jsonb objects.
-- Uses exactly: (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
--
-- Prerequisites: policies for own SELECT/INSERT should already exist from 005.
-- This migration replaces admin SELECT/UPDATE policies and aligns promote_profile RPC.

ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_applications_select_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_select_admin_jwt"
  ON public.seller_applications
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

DROP POLICY IF EXISTS "seller_applications_update_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_update_admin_jwt"
  ON public.seller_applications
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Approve flow RPC: same JWT rule (no profiles)
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
  SET is_seller = true
  WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) TO authenticated;
