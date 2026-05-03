-- Buyer wishlists: one row per buyer + product

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_buyer_product_unique unique (buyer_id, product_id)
);

create index if not exists wishlists_buyer_id_idx on public.wishlists (buyer_id);
create index if not exists wishlists_product_id_idx on public.wishlists (product_id);

alter table public.wishlists enable row level security;

drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
  on public.wishlists
  for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
  on public.wishlists
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own"
  on public.wishlists
  for delete
  to authenticated
  using (buyer_id = auth.uid());
