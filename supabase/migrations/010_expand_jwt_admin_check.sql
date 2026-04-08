-- Expands auth_is_admin_from_jwt() for JWT app_metadata.is_admin / user_metadata.is_admin.
-- Uses jsonb only (no json/jsonb mixing). Supports:
--   • JSON boolean true (typical Supabase app_metadata.is_admin)
--   • Text claims via ->> ("true", "t", "1", "yes")
--
-- Re-run after 009. Policies that call auth_is_admin_from_jwt() pick this up automatically.
--
-- ---------------------------------------------------------------------------
-- TEMPORARY RLS TEST (dev only — do not leave disabled in production)
-- ---------------------------------------------------------------------------
-- If the app returns 0 rows but Table Editor shows data, RLS is filtering:
--
--   ALTER TABLE public.seller_applications DISABLE ROW LEVEL SECURITY;
--   -- reload the app; if rows appear, re-enable and fix policies:
--   ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
--
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_is_admin_from_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    -- Boolean claim: (app_metadata.is_admin === true) in the JWT JSON
    coalesce(
      (coalesce((auth.jwt() -> 'app_metadata')::jsonb, '{}'::jsonb) -> 'is_admin') = to_jsonb(true),
      false
    )
    OR coalesce(
      (coalesce((auth.jwt() -> 'user_metadata')::jsonb, '{}'::jsonb) -> 'is_admin') = to_jsonb(true),
      false
    )
    -- String / text extraction (works if the value is boolean or string in JSON)
    OR lower(nullif(btrim(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '')), ''))
      IN ('true', 't', '1', 'yes')
    OR lower(nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', '')), ''))
      IN ('true', 't', '1', 'yes');
$$;

REVOKE ALL ON FUNCTION public.auth_is_admin_from_jwt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_is_admin_from_jwt() TO authenticated;

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
