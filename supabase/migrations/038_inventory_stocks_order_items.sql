-- Inventory v2: products (container + base_price), sellable variants with sku/price,
-- stocks (total + reserved), stock_movements (audit-only application via trigger),
-- order_items (normalized lines; items_json retained for compatibility).
-- order_items legacy backfill from items_json is disabled (step 11); populate rows manually after FK checks.

-- ---------------------------------------------------------------------------
-- 1) products: base_price + is_active (legacy price kept in sync for older reads)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists base_price numeric(12, 2),
  add column if not exists is_active boolean not null default true;

update public.products
set base_price = coalesce(base_price, price, 0);

alter table public.products
  alter column base_price set default 0;

update public.products set is_active = coalesce(is_active, true);

create or replace function public.trg_products_sync_legacy_price_from_base()
returns trigger
language plpgsql
as $$
begin
  if new.base_price is null and new.price is not null then
    new.base_price := new.price;
  end if;
  new.price := coalesce(new.base_price, new.price, 0);
  return new;
end;
$$;

drop trigger if exists products_sync_legacy_price on public.products;
create trigger products_sync_legacy_price
  before insert or update of base_price on public.products
  for each row
  execute procedure public.trg_products_sync_legacy_price_from_base();

comment on column public.products.base_price is 'Catalog base price; variants may set explicit price override.';
comment on column public.products.is_active is 'When false, product is hidden from buyer catalog.';

-- ---------------------------------------------------------------------------
-- 2) product_variants: sku, price override, thresholds (legacy stock / price_adjustment removed later)
-- ---------------------------------------------------------------------------
alter table public.product_variants
  add column if not exists sku text,
  add column if not exists price numeric(12, 2),
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists is_active boolean not null default true;

update public.product_variants pv
set sku = coalesce(nullif(trim(pv.sku), ''), 'SKU-' || replace(pv.id::text, '-', ''))
where sku is null or trim(sku) = '';

update public.product_variants pv
set price = coalesce(
  pv.price,
  (select p.base_price + coalesce(pv.price_adjustment, 0) from public.products p where p.id = pv.product_id)
)
where price is null;

alter table public.product_variants
  alter column sku set not null;

drop index if exists product_variants_sku_key;
create unique index product_variants_sku_key on public.product_variants (sku);

-- ---------------------------------------------------------------------------
-- 3) order_items (before stock_movements FK)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid references public.product_variants (id) on delete set null,
  shop_id uuid not null references public.shops (id) on delete restrict,
  name text not null default 'Product',
  size text not null default '',
  color text not null default '',
  sku text,
  price numeric(12, 2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  line_id text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- If order_items already existed from a failed run without variant_id, add the column (no data backfill here).
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants (id) on delete set null;

create index if not exists order_items_variant_id_idx on public.order_items (variant_id);

-- ---------------------------------------------------------------------------
-- 4) stocks (one row per variant; totals start at 0 until IN movements apply)
-- ---------------------------------------------------------------------------
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity_total integer not null default 0 check (quantity_total >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  warehouse_id text not null default 'main',
  updated_at timestamptz not null default now(),
  constraint stocks_variant_unique unique (variant_id),
  constraint stocks_reserved_lte_total check (quantity_reserved <= quantity_total)
);

create index if not exists stocks_variant_id_idx on public.stocks (variant_id);

insert into public.stocks (variant_id, quantity_total, quantity_reserved, warehouse_id)
select pv.id, 0, 0, 'main'
from public.product_variants pv
on conflict (variant_id) do nothing;

-- ---------------------------------------------------------------------------
-- 5) stock_movements
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  type text not null check (type in ('IN', 'OUT', 'RESERVED', 'RELEASED', 'ADJUSTMENT')),
  quantity integer not null,
  reason text not null default '',
  order_item_id uuid references public.order_items (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_qty_check check (
    (type = 'ADJUSTMENT' and quantity <> 0) or (type <> 'ADJUSTMENT' and quantity > 0)
  )
);

create index if not exists stock_movements_variant_id_idx on public.stock_movements (variant_id);
create index if not exists stock_movements_order_item_id_idx on public.stock_movements (order_item_id);

-- ---------------------------------------------------------------------------
-- 6) Apply movement → stocks
-- ---------------------------------------------------------------------------
create or replace function public.trg_stock_movements_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  rel int;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  select * into s from public.stocks where variant_id = new.variant_id for update;
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
    update public.stocks
    set
      quantity_reserved = least(quantity_reserved, quantity_total),
      updated_at = now()
    where variant_id = new.variant_id;
  elsif new.type = 'RESERVED' then
    if new.quantity <= 0 then
      raise exception 'RESERVED quantity must be positive';
    end if;
    if (s.quantity_total - s.quantity_reserved) < new.quantity then
      raise exception 'Insufficient available stock for variant %', new.variant_id;
    end if;
    update public.stocks
    set quantity_reserved = quantity_reserved + new.quantity, updated_at = now()
    where variant_id = new.variant_id;
  elsif new.type = 'RELEASED' then
    if new.quantity <= 0 then
      raise exception 'RELEASED quantity must be positive';
    end if;
    if s.quantity_reserved < new.quantity then
      raise exception 'Cannot release more than reserved for variant %', new.variant_id;
    end if;
    update public.stocks
    set quantity_reserved = quantity_reserved - new.quantity, updated_at = now()
    where variant_id = new.variant_id;
  elsif new.type = 'OUT' then
    if new.quantity <= 0 then
      raise exception 'OUT quantity must be positive';
    end if;
    if s.quantity_total < new.quantity then
      raise exception 'Insufficient total stock for variant %', new.variant_id;
    end if;
    rel := least(s.quantity_reserved, new.quantity);
    update public.stocks
    set
      quantity_total = quantity_total - new.quantity,
      quantity_reserved = s.quantity_reserved - rel,
      updated_at = now()
    where variant_id = new.variant_id;
  else
    raise exception 'Unknown stock movement type: %', new.type;
  end if;

  return new;
end;
$$;

drop trigger if exists stock_movements_apply on public.stock_movements;
create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row
  execute procedure public.trg_stock_movements_apply();

-- ---------------------------------------------------------------------------
-- 7) Seed inventory from legacy variant.stock via IN movements (stocks start at 0)
-- ---------------------------------------------------------------------------
insert into public.stock_movements (variant_id, type, quantity, reason, created_by)
select pv.id, 'IN', greatest(coalesce(pv.stock, 0), 0), 'initial_stock', null
from public.product_variants pv
where greatest(coalesce(pv.stock, 0), 0) > 0;

-- ---------------------------------------------------------------------------
-- 8) Drop legacy variant columns & old product_variants → products.stock trigger
-- ---------------------------------------------------------------------------
drop trigger if exists product_variants_recompute_product_stock on public.product_variants;
drop function if exists public.trg_product_variants_recompute_product_stock();

alter table public.product_variants drop column if exists stock;
alter table public.product_variants drop column if exists price_adjustment;

-- ---------------------------------------------------------------------------
-- 9) Sync products.stock = sum(stocks.quantity_total)
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

drop trigger if exists stocks_sync_product_stock on public.stocks;
create trigger stocks_sync_product_stock
  after insert or update of quantity_total, quantity_reserved or delete on public.stocks
  for each row
  execute procedure public.trg_stocks_sync_product_stock();

-- Fire once for all variants after seed
update public.products p
set stock = coalesce((
  select sum(s.quantity_total)::integer
  from public.stocks s
  join public.product_variants v on v.id = s.variant_id
  where v.product_id = p.id
), 0);

-- ---------------------------------------------------------------------------
-- 10) RPCs
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
      select greatest(0, s.quantity_total - s.quantity_reserved)
      from public.stocks s
      where s.variant_id = p_variant_id
    ),
    0
  );
$$;

revoke all on function public.get_available_stock(uuid) from public;
grant execute on function public.get_available_stock(uuid) to anon, authenticated;

create or replace function public.reserve_stock(
  p_variant_id uuid,
  p_quantity integer,
  p_reference text,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  avail int;
begin
  if p_quantity is null or p_quantity <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  end if;

  select public.get_available_stock(p_variant_id) into avail;
  if coalesce(avail, 0) < p_quantity then
    return jsonb_build_object('ok', false, 'error', 'insufficient_stock', 'available', coalesce(avail, 0));
  end if;

  insert into public.stock_movements (variant_id, type, quantity, reason, created_by)
  values (
    p_variant_id,
    'RESERVED',
    p_quantity,
    coalesce(nullif(trim(p_reference), ''), 'reserve'),
    p_profile_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reserve_stock(uuid, integer, text, uuid) from public;
grant execute on function public.reserve_stock(uuid, integer, text, uuid) to authenticated;

create or replace function public.release_stock(
  p_variant_id uuid,
  p_quantity integer,
  p_reference text,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  end if;

  insert into public.stock_movements (variant_id, type, quantity, reason, created_by)
  values (
    p_variant_id,
    'RELEASED',
    p_quantity,
    coalesce(nullif(trim(p_reference), ''), 'release'),
    p_profile_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.release_stock(uuid, integer, text, uuid) from public;
grant execute on function public.release_stock(uuid, integer, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11) order_items backfill from legacy items_json — DISABLED
--     Skipped: items_json can reference product_id values no longer in public.products,
--     which violates order_items.product_id → products FK. Populate order_items manually
--     after validating references (and set variant_id when known).
-- ---------------------------------------------------------------------------
-- insert into public.order_items (
--   order_id, product_id, variant_id, shop_id, name, size, color, sku, price, quantity, line_id
-- )
-- select
--   o.id as order_id,
--   nullif(trim(elem ->> 'productId'), '')::uuid as product_id,
--   nullif(trim(elem ->> 'variantId'), '')::uuid as variant_id,
--   nullif(trim(elem ->> 'shopId'), '')::uuid as shop_id,
--   coalesce(nullif(trim(elem ->> 'name'), ''), 'Product') as name,
--   trim(coalesce(elem ->> 'size', '')) as size,
--   trim(coalesce(elem ->> 'color', '')) as color,
--   nullif(trim(elem ->> 'sku'), '') as sku,
--   greatest(coalesce((elem ->> 'price')::numeric, 0), 0) as price,
--   greatest(coalesce((elem ->> 'quantity')::integer, 0), 1) as quantity,
--   nullif(trim(elem ->> 'lineId'), '') as line_id
-- from public.orders o
-- cross join lateral jsonb_array_elements(coalesce(o.items_json, '[]'::jsonb)) as elem
-- where not exists (select 1 from public.order_items oi where oi.order_id = o.id)
--   and nullif(trim(elem ->> 'productId'), '') is not null
--   and nullif(trim(elem ->> 'shopId'), '') is not null;
--
-- update public.order_items oi
-- set variant_id = pv.id
-- from public.product_variants pv
-- where oi.variant_id is null
--   and pv.product_id = oi.product_id
--   and pv.size = oi.size
--   and pv.color = oi.color;

-- ---------------------------------------------------------------------------
-- 12) Order confirm: OUT via order_items when present, else legacy items_json
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_name text;
  vid uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if old.status is distinct from 'pending' or new.status is distinct from 'confirmed' then
    return new;
  end if;

  if exists (select 1 from public.order_items oi where oi.order_id = new.id limit 1) then
    for r in
      select oi.id as order_item_id, oi.variant_id, oi.quantity as need_qty, oi.product_id
      from public.order_items oi
      where oi.order_id = new.id and oi.variant_id is not null
    loop
      insert into public.stock_movements (variant_id, type, quantity, reason, order_item_id, created_by)
      values (r.variant_id, 'OUT', r.need_qty, 'order_confirmed', r.order_item_id, new.buyer_id);
    end loop;
    return new;
  end if;

  for r in
    select
      x.pid,
      x.vid,
      x.sz,
      x.cl,
      sum(x.qty)::int as need_qty
    from (
      select
        nullif(trim(elem ->> 'productId'), '')::uuid as pid,
        nullif(trim(elem ->> 'variantId'), '')::uuid as vid,
        trim(coalesce(elem ->> 'size', '')) as sz,
        trim(coalesce(elem ->> 'color', '')) as cl,
        greatest(coalesce((elem ->> 'quantity')::integer, 0), 0) as qty
      from jsonb_array_elements(coalesce(new.items_json, '[]'::jsonb)) as elem
    ) x
    where x.pid is not null
    group by x.pid, x.vid, x.sz, x.cl
  loop
    select p.name into v_name from public.products p where p.id = r.pid for update;
    if not found then
      raise exception 'Product not found for order line';
    end if;

    if r.vid is not null then
      insert into public.stock_movements (variant_id, type, quantity, reason, order_item_id, created_by)
      values (r.vid, 'OUT', r.need_qty, 'order_confirmed_legacy_json', null, new.buyer_id);
    else
      select pv.id into vid
      from public.product_variants pv
      where pv.product_id = r.pid and pv.size = r.sz and pv.color = r.cl
      limit 1;

      if vid is null then
        raise exception 'No variant row for product % (size %, color %)', v_name, r.sz, r.cl;
      end if;

      insert into public.stock_movements (variant_id, type, quantity, reason, order_item_id, created_by)
      values (vid, 'OUT', r.need_qty, 'order_confirmed_legacy_json', null, new.buyer_id);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_decrement_stock_on_confirm on public.orders;
create trigger orders_decrement_stock_on_confirm
  after update of status on public.orders
  for each row
  when (old.status = 'pending' and new.status = 'confirmed')
  execute procedure public.trg_orders_decrement_stock_on_confirm();

-- Pending → cancelled: best-effort release (only if enough reserved; avoids hard-fail when no reservation exists)
create or replace function public.trg_orders_release_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if old.status is distinct from 'pending' or new.status is distinct from 'cancelled' then
    return new;
  end if;

  for r in
    select oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and oi.variant_id is not null
  loop
    begin
      insert into public.stock_movements (variant_id, type, quantity, reason, created_by)
      values (r.variant_id, 'RELEASED', r.quantity, 'order_cancelled', new.buyer_id);
    exception
      when others then
        null;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_release_stock_on_cancel on public.orders;
create trigger orders_release_stock_on_cancel
  after update of status on public.orders
  for each row
  when (old.status = 'pending' and new.status = 'cancelled')
  execute procedure public.trg_orders_release_stock_on_cancel();

comment on function public.trg_orders_decrement_stock_on_confirm() is
  'On confirm: OUT stock_movements per order_items.variant_id, or legacy items_json.';

-- Ensure every new variant gets a stocks row (for movement-driven updates)
create or replace function public.trg_product_variants_ensure_stock_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stocks (variant_id, quantity_total, quantity_reserved, warehouse_id)
  values (new.id, 0, 0, 'main')
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists product_variants_ensure_stock_row on public.product_variants;
create trigger product_variants_ensure_stock_row
  after insert on public.product_variants
  for each row
  execute procedure public.trg_product_variants_ensure_stock_row();
