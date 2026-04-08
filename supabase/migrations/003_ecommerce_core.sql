-- E-commerce core: products, reels, orders + RLS
-- Run manually in Supabase SQL editor (or via CLI). Adjust if table/column names differ.

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  sizes_array text[] not null default '{}',
  colors_array text[] not null default '{}',
  stock integer not null default 0,
  images_array text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists products_shop_id_idx on public.products (shop_id);

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  video_url text not null,
  likes_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reels_shop_id_idx on public.reels (shop_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  shipping_address jsonb not null,
  delivery_instructions text,
  items_json jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.reels enable row level security;
alter table public.orders enable row level security;

-- Products: public read for items in active shops; owners can manage their shop's products
drop policy if exists "products_select_public_active_shop" on public.products;
create policy "products_select_public_active_shop"
  on public.products
  for select
  to public
  using (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and coalesce(s.is_active, true) = true
    )
  );

drop policy if exists "products_select_owner" on public.products;
create policy "products_select_owner"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = products.shop_id
        and s.seller_id = auth.uid()
    )
  );

-- Reels: public read; sellers manage reels for their shops
drop policy if exists "reels_select_public_active_shop" on public.reels;
create policy "reels_select_public_active_shop"
  on public.reels
  for select
  to public
  using (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and coalesce(s.is_active, true) = true
    )
  );

drop policy if exists "reels_select_owner" on public.reels;
create policy "reels_select_owner"
  on public.reels
  for select
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "reels_insert_owner" on public.reels;
create policy "reels_insert_owner"
  on public.reels
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "reels_update_owner" on public.reels;
create policy "reels_update_owner"
  on public.reels
  for update
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and s.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and s.seller_id = auth.uid()
    )
  );

drop policy if exists "reels_delete_owner" on public.reels;
create policy "reels_delete_owner"
  on public.reels
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = reels.shop_id
        and s.seller_id = auth.uid()
    )
  );

-- Orders: buyers can create and read their own orders (extend later for seller/admin dashboards)
drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
  on public.orders
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "orders_select_buyer" on public.orders;
create policy "orders_select_buyer"
  on public.orders
  for select
  to authenticated
  using (buyer_id = auth.uid());

-- Optional: admin read-all via JWT claim app_metadata.is_admin (set in Auth hook / invite flow)
drop policy if exists "orders_select_admin_jwt" on public.orders;
create policy "orders_select_admin_jwt"
  on public.orders
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

-- Shops: allow admins (JWT) to read all shops for back-office (UI joins / diagnostics)
drop policy if exists "shops_select_admin_jwt" on public.shops;
create policy "shops_select_admin_jwt"
  on public.shops
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);
