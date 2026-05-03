-- Sellers may update orders that include line items from their shop(s).
-- Client should only PATCH `status` (and optionally `delivery_instructions` for buyer-facing notes).
-- Supabase/PostgREST updates only sent columns.

DROP POLICY IF EXISTS "orders_update_seller_shop_items" ON public.orders;

CREATE POLICY "orders_update_seller_shop_items"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(orders.items_json) AS elem
      WHERE (elem->>'shopId') IN (
        SELECT s.id::text FROM public.shops s WHERE s.seller_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(orders.items_json) AS elem
      WHERE (elem->>'shopId') IN (
        SELECT s.id::text FROM public.shops s WHERE s.seller_id = auth.uid()
      )
    )
  );
