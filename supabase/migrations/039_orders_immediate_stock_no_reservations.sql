-- MVP: deduct stock when order lines are created (pending); restore on cancel; no reservations.
-- Adds order_status_history + orders.cancelled_by; drops quantity_reserved; simplifies movement apply.

-- ---------------------------------------------------------------------------
-- 1) stocks: merge reserved into total, drop quantity_reserved
--     Must drop stocks_sync_product_stock first: its trigger definition lists
--     quantity_reserved in "UPDATE OF", so Postgres blocks dropping the column until the trigger is gone.
-- ---------------------------------------------------------------------------
drop trigger if exists stocks_sync_product_stock on public.stocks;

drop function if exists public.trg_stocks_sync_product_stock();

update public.stocks
set quantity_total = quantity_total + quantity_reserved,
    quantity_reserved = 0;

alter table public.stocks drop constraint if exists stocks_reserved_lte_total;

alter table public.stocks drop column if exists quantity_reserved;

-- ---------------------------------------------------------------------------
-- 2) stock_movements: drop legacy reservation rows; restrict types to IN/OUT/ADJUSTMENT
-- ---------------------------------------------------------------------------
delete from public.stock_movements
where type in ('RESERVED', 'RELEASED');

do $drop_type_chk$
declare
  cname text;
begin
  for cname in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'stock_movements'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%reserved%'
  loop
    execute format('alter table public.stock_movements drop constraint %I', cname);
  end loop;
end $drop_type_chk$;

alter table public.stock_movements drop constraint if exists stock_movements_type_check;

alter table public.stock_movements
  add constraint stock_movements_type_check check (type in ('IN', 'OUT', 'ADJUSTMENT'));

comment on column public.stock_movements.reason is
  'Examples: order_placed, order_cancelled_by_buyer, order_cancelled_by_seller, admin_restock, initial_stock';

-- ---------------------------------------------------------------------------
-- 3) Apply movement → stocks (no reserved branch; OUT only reduces quantity_total)
-- ---------------------------------------------------------------------------
create or replace function public.trg_stock_movements_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_total int;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  select s.quantity_total into cur_total
  from public.stocks s
  where s.variant_id = new.variant_id
  for update;

  if not found then
    raise exception 'No stock row for variant %', new.variant_id;
  end if;

  if new.type = 'IN' then
    if new.quantity <= 0 then
      raise exception 'IN quantity must be positive';
    end if;
    update public.stocks
    set quantity_total = quantity_total + new.quantity, updated_at = now()
    where variant_id = new.variant_id;
  elsif new.type = 'ADJUSTMENT' then
    update public.stocks
    set
      quantity_total = greatest(0, quantity_total + new.quantity),
      updated_at = now()
    where variant_id = new.variant_id;
  elsif new.type = 'OUT' then
    if new.quantity <= 0 then
      raise exception 'OUT quantity must be positive';
    end if;
    if cur_total < new.quantity then
      raise exception 'Insufficient total stock for variant %', new.variant_id;
    end if;
    update public.stocks
    set quantity_total = quantity_total - new.quantity, updated_at = now()
    where variant_id = new.variant_id;
  else
    raise exception 'Unknown stock movement type: %', new.type;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) products.stock sync trigger: quantity_total only (trigger was dropped in step 1)
-- ---------------------------------------------------------------------------
create or replace function public.trg_stocks_sync_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  select pv.product_id into pid
  from public.product_variants pv
  where pv.id = coalesce(new.variant_id, old.variant_id)
  limit 1;

  if pid is null then
    return coalesce(new, old);
  end if;

  update public.products p
  set stock = coalesce((
    select sum(s.quantity_total)::integer
    from public.stocks s
    join public.product_variants v on v.id = s.variant_id
    where v.product_id = pid
  ), 0)
  where p.id = pid;

  return coalesce(new, old);
end;
$$;

create trigger stocks_sync_product_stock
  after insert or update of quantity_total or delete on public.stocks
  for each row
  execute procedure public.trg_stocks_sync_product_stock();

-- ---------------------------------------------------------------------------
-- 5) RPC: available = quantity_total (no reservations)
-- ---------------------------------------------------------------------------
create or replace function public.get_available_stock(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select greatest(0, s.quantity_total)
      from public.stocks s
      where s.variant_id = p_variant_id
    ),
    0
  );
$$;

revoke all on function public.get_available_stock(uuid) from public;
grant execute on function public.get_available_stock(uuid) to anon, authenticated;

drop function if exists public.reserve_stock(uuid, integer, text, uuid);
drop function if exists public.release_stock(uuid, integer, text, uuid);

-- ---------------------------------------------------------------------------
-- 6) New variant → stocks row (no quantity_reserved)
-- ---------------------------------------------------------------------------
create or replace function public.trg_product_variants_ensure_stock_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stocks (variant_id, quantity_total, warehouse_id)
  values (new.id, 0, 'main')
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) orders.cancelled_by (buyer vs seller cancel reason for stock restore)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists cancelled_by text;

alter table public.orders drop constraint if exists orders_cancelled_by_check;

alter table public.orders
  add constraint orders_cancelled_by_check check (cancelled_by is null or cancelled_by in ('buyer', 'seller'));

-- ---------------------------------------------------------------------------
-- 8) order_status_history (e.g. seller confirmation)
-- ---------------------------------------------------------------------------
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  event_type text not null default 'status_change',
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id);

alter table public.order_status_history enable row level security;

drop policy if exists "order_status_history_select_buyer" on public.order_status_history;
create policy "order_status_history_select_buyer"
  on public.order_status_history for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

-- Seller policy omitted: items_json may be null/absent on some orders. Re-add later via order_items + shops join if needed.
drop policy if exists "order_status_history_select_seller" on public.order_status_history;

drop policy if exists "order_status_history_select_admin" on public.order_status_history;
create policy "order_status_history_select_admin"
  on public.order_status_history for select to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true);

-- ---------------------------------------------------------------------------
-- 9) Deduct stock when an order line is inserted (order must be pending)
-- ---------------------------------------------------------------------------
create or replace function public.trg_order_items_stock_out_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  st text;
  buyer uuid;
begin
  select o.status, o.buyer_id into st, buyer
  from public.orders o
  where o.id = new.order_id;

  if not found then
    return new;
  end if;

  if st is distinct from 'pending' then
    return new;
  end if;

  if new.variant_id is null then
    return new;
  end if;

  insert into public.stock_movements (variant_id, type, quantity, reason, order_item_id, created_by)
  values (new.variant_id, 'OUT', new.quantity, 'order_placed', new.id, buyer);

  return new;
end;
$$;

drop trigger if exists order_items_stock_out_on_insert on public.order_items;
create trigger order_items_stock_out_on_insert
  after insert on public.order_items
  for each row
  execute procedure public.trg_order_items_stock_out_on_insert();

-- ---------------------------------------------------------------------------
-- 10) Remove old confirm / cancel stock triggers on orders
-- ---------------------------------------------------------------------------
drop trigger if exists orders_decrement_stock_on_confirm on public.orders;
drop trigger if exists orders_release_stock_on_cancel on public.orders;

drop function if exists public.trg_orders_decrement_stock_on_confirm();
drop function if exists public.trg_orders_release_stock_on_cancel();

-- ---------------------------------------------------------------------------
-- 11) pending → confirmed: history only (stock already deducted)
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_log_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is distinct from 'pending' or new.status is distinct from 'confirmed' then
    return new;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, event_type)
  values (new.id, old.status, new.status, 'confirmation');

  return new;
end;
$$;

drop trigger if exists orders_log_confirmation on public.orders;
create trigger orders_log_confirmation
  after update of status on public.orders
  for each row
  when (old.status = 'pending' and new.status = 'confirmed')
  execute procedure public.trg_orders_log_confirmation();

comment on function public.trg_orders_log_confirmation() is
  'Records seller confirmation in order_status_history; stock was deducted at order placement.';

-- ---------------------------------------------------------------------------
-- 12) Cancel: restore stock (IN) for pending or confirmed; idempotent on status
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  reason_in text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is distinct from 'cancelled' then
    return new;
  end if;

  if old.status = 'cancelled' then
    return new;
  end if;

  if old.status not in ('pending', 'confirmed') then
    return new;
  end if;

  if new.cancelled_by = 'buyer' then
    reason_in := 'order_cancelled_by_buyer';
  elsif new.cancelled_by = 'seller' then
    reason_in := 'order_cancelled_by_seller';
  else
    reason_in := 'order_cancelled';
  end if;

  for r in
    select oi.id as order_item_id, oi.variant_id, oi.quantity as qty
    from public.order_items oi
    where oi.order_id = new.id and oi.variant_id is not null
  loop
    insert into public.stock_movements (variant_id, type, quantity, reason, order_item_id, created_by)
    values (r.variant_id, 'IN', r.qty, reason_in, r.order_item_id, new.buyer_id);
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, event_type)
  values (new.id, old.status, new.status, 'cancellation');

  return new;
end;
$$;

drop trigger if exists orders_restore_stock_on_cancel on public.orders;
create trigger orders_restore_stock_on_cancel
  after update of status, cancelled_by on public.orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute procedure public.trg_orders_restore_stock_on_cancel();

comment on function public.trg_orders_restore_stock_on_cancel() is
  'On cancel from pending or confirmed: IN movements to restore quantity_total; logs order_status_history.';

-- ---------------------------------------------------------------------------
-- 13) Buyer may cancel own pending orders (set cancelled_by = buyer)
-- ---------------------------------------------------------------------------
drop policy if exists "orders_update_buyer_cancel_pending" on public.orders;

create policy "orders_update_buyer_cancel_pending"
  on public.orders
  for update
  to authenticated
  using (buyer_id = auth.uid() and status = 'pending')
  with check (
    buyer_id = auth.uid()
    and status = 'cancelled'
    and cancelled_by = 'buyer'
  );
