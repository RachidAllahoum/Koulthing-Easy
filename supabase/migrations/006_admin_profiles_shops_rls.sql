-- Admin shops INSERT for approve flow via JWT only (no policies on profiles here — prevents RLS recursion).
--
-- profiles policies are defined in 007_fix_profiles_rls_recursion.sql (select/update self only).
-- Ensure app_metadata.is_admin is true for admin users (see 005 comment).

DROP POLICY IF EXISTS "shops_select_admin_profiles" ON public.shops;
DROP POLICY IF EXISTS "shops_insert_admin" ON public.shops;

DROP POLICY IF EXISTS "shops_insert_admin_jwt" ON public.shops;
CREATE POLICY "shops_insert_admin_jwt"
  ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);
