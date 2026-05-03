-- Fix stock visibility for storefront + ensure stock rows are populated.

-- Keep RPC callable by both anon and authenticated clients.
revoke all on function public.get_available_stock(uuid) from public;
grant execute on function public.get_available_stock(uuid) to anon, authenticated;

-- Public read-only visibility for variant stock.
drop policy if exists "stocks_select_public" on public.stocks;
create policy "stocks_select_public"
  on public.stocks
  for select
  to public
  using (true);

drop policy if exists "product_variants_select_public" on public.product_variants;
create policy "product_variants_select_public"
  on public.product_variants
  for select
  to public
  using (true);

-- Ensure a stocks row exists per variant.
insert into public.stocks (variant_id, quantity_total, warehouse_id)
select pv.id, 0, 'main'
from public.product_variants pv
left join public.stocks s on s.variant_id = pv.id
where s.variant_id is null
on conflict (variant_id) do nothing;

-- Optional emergency backfill for rows currently zero/empty.
-- Adds +100 units using audit movements so triggers remain source of truth.
insert into public.stock_movements (variant_id, type, quantity, reason, created_by)
select s.variant_id, 'IN', 100, 'emergency_backfill_stock', null
from public.stocks s
where coalesce(s.quantity_total, 0) <= 0;

-- Diagnostic query (run manually when needed):
-- select v.id, v.sku, s.quantity_total
-- from public.product_variants v
-- left join public.stocks s on s.variant_id = v.id
-- limit 10;

