-- Copy seller signup/application fields onto shops at admin approve time (app layer).
-- These columns power public shop pages and seller "My Shop" dashboard.

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS shop_category text,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS wilaya text,
  ADD COLUMN IF NOT EXISTS shop_phone text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text;

COMMENT ON COLUMN public.shops.cover_url IS 'Public URL in shop-covers bucket (optional).';
COMMENT ON COLUMN public.shops.shop_category IS 'Category from seller application.';
COMMENT ON COLUMN public.shops.street_address IS 'From seller application.';
COMMENT ON COLUMN public.shops.city IS 'From seller application.';
COMMENT ON COLUMN public.shops.wilaya IS 'From seller application.';
COMMENT ON COLUMN public.shops.shop_phone IS 'Shop contact phone.';
COMMENT ON COLUMN public.shops.instagram_url IS 'Full or partial Instagram URL.';
COMMENT ON COLUMN public.shops.facebook_url IS 'Full or partial Facebook URL.';

-- Sellers can update their own shop row (profile fields, logos, cover).
DROP POLICY IF EXISTS "shops_update_seller_own" ON public.shops;
CREATE POLICY "shops_update_seller_own"
  ON public.shops
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Public read of active shops for storefronts (anon + authenticated).
DROP POLICY IF EXISTS "shops_select_active_public" ON public.shops;
CREATE POLICY "shops_select_active_public"
  ON public.shops
  FOR SELECT
  TO anon, authenticated
  USING (coalesce(is_active, true) = true);

-- Seller can always read their own shop row (e.g. inactive / pending toggle).
DROP POLICY IF EXISTS "shops_select_seller_own" ON public.shops;
CREATE POLICY "shops_select_seller_own"
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());
