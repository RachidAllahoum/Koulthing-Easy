-- Allow sellers to read orders that contain line items from their shop(s).
-- Needed for seller dashboard analytics (revenue, order counts, recent orders).

DROP POLICY IF EXISTS "orders_select_seller_shop_items" ON public.orders;

CREATE POLICY "orders_select_seller_shop_items"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(orders.items_json) AS elem
      WHERE (elem->>'shopId') IN (
        SELECT s.id::text FROM public.shops s WHERE s.seller_id = auth.uid()
      )
    )
  );
