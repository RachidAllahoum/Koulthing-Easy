-- Shop followers: buyers follow shops (one row per buyer + shop)

create table if not exists public.followers (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint followers_buyer_shop_unique unique (buyer_id, shop_id)
);

create index if not exists followers_buyer_id_idx on public.followers (buyer_id);
create index if not exists followers_shop_id_idx on public.followers (shop_id);

alter table public.followers enable row level security;

-- Buyers see only their own follow rows (for "am I following?" checks)
drop policy if exists "followers_select_own" on public.followers;
create policy "followers_select_own"
  on public.followers
  for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "followers_insert_own" on public.followers;
create policy "followers_insert_own"
  on public.followers
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "followers_delete_own" on public.followers;
create policy "followers_delete_own"
  on public.followers
  for delete
  to authenticated
  using (buyer_id = auth.uid());

-- Public follower count without exposing other buyers' rows
create or replace function public.get_shop_follower_count(p_shop_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.followers where shop_id = p_shop_id;
$$;

revoke all on function public.get_shop_follower_count(uuid) from public;
grant execute on function public.get_shop_follower_count(uuid) to anon, authenticated;
