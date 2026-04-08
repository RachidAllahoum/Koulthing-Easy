-- RLS for seller_applications: own rows + admin via JWT (no EXISTS on profiles — avoids recursion).
--
-- Admin: set auth.jwt() app_metadata.is_admin = true on the user (Dashboard → user → Raw App Meta Data).

ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_applications_select_own" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_select_admin" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_select_admin_jwt" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_insert_own" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_update_admin" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_update_admin_jwt" ON public.seller_applications;

CREATE POLICY "seller_applications_select_own"
  ON public.seller_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "seller_applications_select_admin_jwt"
  ON public.seller_applications
  FOR SELECT
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

CREATE POLICY "seller_applications_insert_own"
  ON public.seller_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "seller_applications_update_admin_jwt"
  ON public.seller_applications
  FOR UPDATE
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true)
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);
