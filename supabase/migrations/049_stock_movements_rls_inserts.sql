-- stock_movements: allow authenticated inserts needed for checkout + seller catalog,
-- while keeping admin read/write from 043_rls_production_hardening.sql.
-- (Existing admin policies use FOR ALL / FOR SELECT; new policies are additional PERMISSIVE INSERT rules.)

-- Seller: initial stock IN rows (see lib/seller-save-product.ts seedInitialStock)
drop policy if exists "stock_movements_insert_seller_initial_stock" on public.stock_movements;
create policy "stock_movements_insert_seller_initial_stock"
  on public.stock_movements
  for insert
  to authenticated
  with check (
    type = 'IN'
    and reason = 'initial_stock'
    and created_by = auth.uid()
    and exists (
      select 1
      from public.product_variants pv
      join public.products pr on pr.id = pv.product_id
      join public.shops sh on sh.id = pr.shop_id and sh.seller_id = auth.uid()
      where pv.id = variant_id
    )
  );

-- Buyer: OUT when placing order (same transaction as order_items insert may still evaluate as authenticated)
drop policy if exists "stock_movements_insert_buyer_order_placed" on public.stock_movements;
create policy "stock_movements_insert_buyer_order_placed"
  on public.stock_movements
  for insert
  to authenticated
  with check (
    type = 'OUT'
    and reason = 'order_placed'
    and order_item_id is not null
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and o.buyer_id = auth.uid()
        and o.status = 'pending'
    )
  );

-- Buyer or seller: stock restore on cancel (trigger uses buyer_id as created_by; seller path uses shop join)
drop policy if exists "stock_movements_insert_cancel_restore" on public.stock_movements;
create policy "stock_movements_insert_cancel_restore"
  on public.stock_movements
  for insert
  to authenticated
  with check (
    type = 'IN'
    and reason in (
      'order_cancelled_by_buyer',
      'order_cancelled_by_seller',
      'order_cancelled'
    )
    and order_item_id is not null
    and (
      exists (
        select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where oi.id = order_item_id
          and o.buyer_id = auth.uid()
      )
      or exists (
        select 1
        from public.order_items oi
        join public.shops sh on sh.id = oi.shop_id and sh.seller_id = auth.uid()
        where oi.id = order_item_id
      )
    )
  );

comment on policy "stock_movements_insert_seller_initial_stock" on public.stock_movements is
  'Allows sellers to post IN / initial_stock for variants in their shop (client insert).';

comment on policy "stock_movements_insert_buyer_order_placed" on public.stock_movements is
  'Allows buyers to post OUT / order_placed tied to their pending order line (trigger or client).';

comment on policy "stock_movements_insert_cancel_restore" on public.stock_movements is
  'Allows buyer or shop seller to post cancel-restore IN rows for their order lines.';
