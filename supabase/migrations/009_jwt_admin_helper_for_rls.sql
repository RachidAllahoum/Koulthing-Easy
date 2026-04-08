-- Central JWT admin check for RLS (no queries on profiles).
-- Supports app_metadata.is_admin OR user_metadata.is_admin (string "true"/"t"/"1" or JSON boolean via text cast).
-- Apply after 005/007. Ensures PostgREST uses the same claim paths you set in the Dashboard.

CREATE OR REPLACE FUNCTION public.auth_is_admin_from_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    coalesce(
      (nullif(btrim(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '')), ''))::boolean,
      false
    )
    OR coalesce(
      (nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', '')), ''))::boolean,
      false
    );
$$;

REVOKE ALL ON FUNCTION public.auth_is_admin_from_jwt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_admin_from_jwt() TO authenticated;

-- seller_applications: replace JWT policies to use helper
DROP POLICY IF EXISTS "seller_applications_select_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_select_admin_jwt"
  ON public.seller_applications
  FOR SELECT
  TO authenticated
  USING (public.auth_is_admin_from_jwt());

DROP POLICY IF EXISTS "seller_applications_update_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_update_admin_jwt"
  ON public.seller_applications
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_admin_from_jwt())
  WITH CHECK (public.auth_is_admin_from_jwt());

-- promote RPC (must match RLS admin check)
CREATE OR REPLACE FUNCTION public.promote_profile_to_seller_for_admin(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.auth_is_admin_from_jwt() IS NOT TRUE THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET is_seller = true
  WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) TO authenticated;
