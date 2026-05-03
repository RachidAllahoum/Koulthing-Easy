-- Break RLS recursion between orders <-> order_items policies.
-- Approach: replace seller checks on orders with a SECURITY DEFINER helper.

-- Helper used by orders policies (bypasses RLS on joined tables).
create or replace function public.order_belongs_to_seller(p_order_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.shops s on s.id = oi.shop_id
    where oi.order_id = p_order_id
      and s.seller_id = p_user_id
  );
$$;

revoke all on function public.order_belongs_to_seller(uuid, uuid) from public;
grant execute on function public.order_belongs_to_seller(uuid, uuid) to authenticated;

-- Reset orders policies fully, then recreate non-recursive versions.
drop policy if exists "orders_select_buyer" on public.orders;
drop policy if exists "orders_insert_buyer" on public.orders;
drop policy if exists "orders_select_seller_by_order_items" on public.orders;
drop policy if exists "orders_update_seller_by_order_items" on public.orders;
drop policy if exists "orders_update_buyer_cancel_pending" on public.orders;
drop policy if exists "orders_update_buyer_cancel_pending_or_confirmed" on public.orders;
drop policy if exists "orders_select_admin_jwt" on public.orders;
drop policy if exists "orders_update_admin_jwt" on public.orders;

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

create policy "orders_select_seller_safe"
  on public.orders
  for select
  to authenticated
  using (public.order_belongs_to_seller(id, auth.uid()));

create policy "orders_update_seller_safe"
  on public.orders
  for update
  to authenticated
  using (public.order_belongs_to_seller(id, auth.uid()))
  with check (public.order_belongs_to_seller(id, auth.uid()));

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

