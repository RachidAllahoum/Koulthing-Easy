-- Fixes: infinite recursion on profiles when policies use EXISTS (SELECT ... FROM profiles ...).
--
-- profiles: ONLY self SELECT + self UPDATE (auth.uid() = id). No subqueries on profiles.
--
-- seller_applications + shops admin: use JWT app_metadata.is_admin (same pattern as 003_ecommerce_core).
--   Set in Supabase Dashboard → Authentication → Users → user → Raw App Meta Data, e.g. {"is_admin": true}
--   Or use an Auth Hook. The app UI still reads profiles.is_admin for display — that is separate from RLS.

-- ---------------------------------------------------------------------------
-- profiles: drop EVERY policy, then exactly two policies
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_self"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- seller_applications: remove admin policies that queried profiles (recursive)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "seller_applications_select_admin" ON public.seller_applications;
DROP POLICY IF EXISTS "seller_applications_update_admin" ON public.seller_applications;

DROP POLICY IF EXISTS "seller_applications_select_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_select_admin_jwt"
  ON public.seller_applications
  FOR SELECT
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

DROP POLICY IF EXISTS "seller_applications_update_admin_jwt" ON public.seller_applications;
CREATE POLICY "seller_applications_update_admin_jwt"
  ON public.seller_applications
  FOR UPDATE
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true)
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

-- ---------------------------------------------------------------------------
-- shops: drop policies that queried profiles; keep JWT approach from 003 + insert for approve
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "shops_select_admin_profiles" ON public.shops;
DROP POLICY IF EXISTS "shops_insert_admin" ON public.shops;

DROP POLICY IF EXISTS "shops_insert_admin_jwt" ON public.shops;
CREATE POLICY "shops_insert_admin_jwt"
  ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

-- Approve flow: promote another user's profile without an admin profiles policy (SECURITY DEFINER bypasses RLS).
CREATE OR REPLACE FUNCTION public.promote_profile_to_seller_for_admin(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET is_seller = true
  WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_to_seller_for_admin(uuid) TO authenticated;
