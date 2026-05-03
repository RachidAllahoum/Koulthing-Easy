-- Allow buyers to insert order_lines for their own orders (checkout).
-- Migration 043 only added SELECT policies + admin FOR ALL; buyers had no INSERT path.

drop policy if exists "order_items_insert_buyer" on public.order_items;

create policy "order_items_insert_buyer"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.buyer_id = auth.uid()
    )
  );
