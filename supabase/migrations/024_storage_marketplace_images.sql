-- Public buckets for shop logos, product photos, and shop cover images.
-- Object paths: {auth.uid()}/... so RLS can scope uploads to the owner.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('shop-logos', 'shop-logos', true),
  ('product-images', 'product-images', true),
  ('shop-covers', 'shop-covers', true),
  ('reel-media', 'reel-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read
DROP POLICY IF EXISTS "marketplace_images_select_public" ON storage.objects;
CREATE POLICY "marketplace_images_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id IN ('shop-logos', 'product-images', 'shop-covers'));

-- Upload: first path segment must be auth.uid()
DROP POLICY IF EXISTS "shop_logos_insert_own" ON storage.objects;
CREATE POLICY "shop_logos_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-logos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "shop_logos_update_own" ON storage.objects;
CREATE POLICY "shop_logos_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shop-logos' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "shop_logos_delete_own" ON storage.objects;
CREATE POLICY "shop_logos_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'shop-logos' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "product_images_insert_own" ON storage.objects;
CREATE POLICY "product_images_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "product_images_update_own" ON storage.objects;
CREATE POLICY "product_images_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "product_images_delete_own" ON storage.objects;
CREATE POLICY "product_images_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "shop_covers_insert_own" ON storage.objects;
CREATE POLICY "shop_covers_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-covers'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "shop_covers_update_own" ON storage.objects;
CREATE POLICY "shop_covers_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shop-covers' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "shop_covers_delete_own" ON storage.objects;
CREATE POLICY "shop_covers_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'shop-covers' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "reel_media_insert_own" ON storage.objects;
CREATE POLICY "reel_media_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reel-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "reel_media_update_own" ON storage.objects;
CREATE POLICY "reel_media_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reel-media' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "reel_media_delete_own" ON storage.objects;
CREATE POLICY "reel_media_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reel-media' AND split_part(name, '/', 1) = auth.uid()::text);
