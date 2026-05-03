-- Production RLS hardening for profiles/products/variants/orders/inventory tables.
-- Uses JWT-based admin helper for policy checks to avoid profiles recursion.

-- ---------------------------------------------------------------------------
-- 1) Admin helper for RLS (JWT only, recursion-safe)
-- ---------------------------------------------------------------------------
create or replace function public.auth_is_admin_from_jwt()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(
      (nullif(btrim(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '')), ''))::boolean,
      false
    )
    or coalesce(
      (nullif(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', '')), ''))::boolean,
      false
    );
$$;

revoke all on function public.auth_is_admin_from_jwt() from public;
grant execute on function public.auth_is_admin_from_jwt() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Enable RLS on target tables
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stocks enable row level security;
alter table public.stock_movements enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Drop existing policies on target tables (clean slate)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'profiles',
    'products',
    'product_variants',
    'orders',
    'order_items',
    'stocks',
    'stock_movements'
  ]
  loop
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) profiles: self read/update only + admin read/update all
-- ---------------------------------------------------------------------------
create policy "profiles_select_self"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_select_admin_jwt"
  on public.profiles
  for select
  to authenticated
  using (public.auth_is_admin_from_jwt());

create policy "profiles_update_admin_jwt"
  on public.profiles
  for update
  to authenticated
  using (public.auth_is_admin_from_jwt())
  with check (public.auth_is_admin_from_jwt());

-- ---------------------------------------------------------------------------
-- 5) products: public read; sellers (own shop) + admin write
-- ---------------------------------------------------------------------------
create policy "products_select_public"
  on public.products
  for select
  to public
  using (true);

create policy "products_insert_seller_or_admin"
  on public.products
  for insert
  to authenticated
  with check (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

create policy "products_update_seller_or_admin"
  on public.products
  for update
  to authenticated
  using (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  )
  with check (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

create policy "products_delete_seller_or_admin"
  on public.products
  for delete
  to authenticated
  using (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6) product_variants: public read; sellers/admin manage via parent product ownership
-- ---------------------------------------------------------------------------
create policy "product_variants_select_public"
  on public.product_variants
  for select
  to public
  using (true);

create policy "product_variants_insert_seller_or_admin"
  on public.product_variants
  for insert
  to authenticated
  with check (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_variants.product_id
        and s.seller_id = auth.uid()
    )
  );

create policy "product_variants_update_seller_or_admin"
  on public.product_variants
  for update
  to authenticated
  using (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_variants.product_id
        and s.seller_id = auth.uid()
    )
  )
  with check (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_variants.product_id
        and s.seller_id = auth.uid()
    )
  );

create policy "product_variants_delete_seller_or_admin"
  on public.product_variants
  for delete
  to authenticated
  using (
    public.auth_is_admin_from_jwt()
    or exists (
      select 1
      from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_variants.product_id
        and s.seller_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7) orders: buyer own read/insert/update(cancel policy stays app-limited), seller read/update by order_items, admin all
-- ---------------------------------------------------------------------------
create policy "orders_select_buyer"
  on public.orders
  for select
  to authenticated
  using (buyer_id = auth.uid());

create policy "orders_insert_buyer"
  on public.orders
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

create policy "orders_select_seller_by_order_items"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.shops s on s.id = oi.shop_id
      where oi.order_id = orders.id
        and s.seller_id = auth.uid()
    )
  );

create policy "orders_update_seller_by_order_items"
  on public.orders
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.shops s on s.id = oi.shop_id
      where oi.order_id = orders.id
        and s.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.order_items oi
      join public.shops s on s.id = oi.shop_id
      where oi.order_id = orders.id
        and s.seller_id = auth.uid()
    )
  );

create policy "orders_update_buyer_cancel_pending_or_confirmed"
  on public.orders
  for update
  to authenticated
  using (buyer_id = auth.uid() and status in ('pending', 'confirmed'))
  with check (
    buyer_id = auth.uid()
    and status = 'cancelled'
    and cancelled_by = 'buyer'
    and cancellation_reason is not null
    and length(trim(cancellation_reason)) >= 1
    and length(cancellation_reason) <= 2000
  );

create policy "orders_select_admin_jwt"
  on public.orders
  for select
  to authenticated
  using (public.auth_is_admin_from_jwt());

create policy "orders_update_admin_jwt"
  on public.orders
  for update
  to authenticated
  using (public.auth_is_admin_from_jwt())
  with check (public.auth_is_admin_from_jwt());

-- ---------------------------------------------------------------------------
-- 8) order_items: buyer own order, seller own shop items, admin
-- ---------------------------------------------------------------------------
create policy "order_items_select_buyer"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.buyer_id = auth.uid()
    )
  );

create policy "order_items_select_seller"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shops s
      where s.id = order_items.shop_id
        and s.seller_id = auth.uid()
    )
  );

create policy "order_items_select_admin_jwt"
  on public.order_items
  for select
  to authenticated
  using (public.auth_is_admin_from_jwt());

-- Optional admin maintenance policies.
create policy "order_items_modify_admin_jwt"
  on public.order_items
  for all
  to authenticated
  using (public.auth_is_admin_from_jwt())
  with check (public.auth_is_admin_from_jwt());

-- ---------------------------------------------------------------------------
-- 9) stocks + stock_movements: strict (direct read/write only for admin)
--    Trigger/RPC SECURITY DEFINER flows remain functional.
-- ---------------------------------------------------------------------------
create policy "stocks_select_admin_jwt"
  on public.stocks
  for select
  to authenticated
  using (public.auth_is_admin_from_jwt());

create policy "stocks_modify_admin_jwt"
  on public.stocks
  for all
  to authenticated
  using (public.auth_is_admin_from_jwt())
  with check (public.auth_is_admin_from_jwt());

create policy "stock_movements_select_admin_jwt"
  on public.stock_movements
  for select
  to authenticated
  using (public.auth_is_admin_from_jwt());

create policy "stock_movements_modify_admin_jwt"
  on public.stock_movements
  for all
  to authenticated
  using (public.auth_is_admin_from_jwt())
  with check (public.auth_is_admin_from_jwt());

