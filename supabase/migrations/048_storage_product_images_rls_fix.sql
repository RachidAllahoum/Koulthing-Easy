-- product-images: public read; authenticated INSERT/UPDATE/DELETE only when
-- object path starts with auth.uid() (matches app: {userId}/{shopId}/{productId}/...).
-- UPDATE includes WITH CHECK so upsert/replace passes RLS on Postgres.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read for this bucket (anon + authenticated)
DROP POLICY IF EXISTS "product_images_select_public" ON storage.objects;
CREATE POLICY "product_images_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

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
  USING (
    bucket_id = 'product-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "product_images_delete_own" ON storage.objects;
CREATE POLICY "product_images_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
