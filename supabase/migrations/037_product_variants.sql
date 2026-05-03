-- Variant inventory: one row per size+color per product; products.stock stays the sum of variant stocks.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null default '',
  color text not null default '',
  stock integer not null default 0 check (stock >= 0),
  price_adjustment numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint product_variants_unique_combo unique (product_id, size, color)
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

-- Keep products.stock equal to sum(variant.stock)
create or replace function public.trg_product_variants_recompute_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  if pid is null then
    return coalesce(new, old);
  end if;
  update public.products p
  set stock = coalesce((
    select sum(v.stock)::integer
    from public.product_variants v
    where v.product_id = p.id
  ), 0)
  where p.id = pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists product_variants_recompute_product_stock on public.product_variants;
create trigger product_variants_recompute_product_stock
  after insert or update or delete on public.product_variants
  for each row
  execute procedure public.trg_product_variants_recompute_product_stock();

comment on table public.product_variants is 'Per size+color stock and optional price delta vs products.price.';

-- ---------------------------------------------------------------------------
-- Backfill variants from legacy sizes_array × colors_array (even stock split).
-- ---------------------------------------------------------------------------
do $$
declare
  pr record;
  sizes_arr text[];
  colors_arr text[];
  ns int;
  nc int;
  combos int;
  stock_total int;
  base int;
  rem int;
  idx int;
  alloc int;
  sz text;
  cl text;
begin
  for pr in
    select id, coalesce(sizes_array, '{}'::text[]) as sa, coalesce(colors_array, '{}'::text[]) as ca, stock
    from public.products
  loop
    if exists (select 1 from public.product_variants v where v.product_id = pr.id) then
      continue;
    end if;

    select coalesce(array_agg(s.t order by s.t), '{}'::text[]) into sizes_arr
    from (select distinct trim(x) as t from unnest(pr.sa) as x where trim(x) <> '') s;

    select coalesce(array_agg(c.t order by c.t), '{}'::text[]) into colors_arr
    from (select distinct trim(x) as t from unnest(pr.ca) as x where trim(x) <> '') c;

    ns := coalesce(cardinality(sizes_arr), 0);
    nc := coalesce(cardinality(colors_arr), 0);

    if ns = 0 and nc = 0 then
      combos := 1;
    elsif ns = 0 then
      combos := nc;
    elsif nc = 0 then
      combos := ns;
    else
      combos := ns * nc;
    end if;

    stock_total := greatest(coalesce(pr.stock, 0), 0);
    base := case when combos > 0 then stock_total / combos else stock_total end;
    rem := case when combos > 0 then stock_total % combos else 0 end;
    idx := 0;

    if ns = 0 and nc = 0 then
      insert into public.product_variants (product_id, size, color, stock, price_adjustment)
      values (pr.id, '', '', stock_total, 0);
    elsif ns = 0 then
      foreach cl in array colors_arr loop
        idx := idx + 1;
        alloc := base + (case when idx <= rem then 1 else 0 end);
        insert into public.product_variants (product_id, size, color, stock, price_adjustment)
        values (pr.id, '', cl, alloc, 0);
      end loop;
    elsif nc = 0 then
      foreach sz in array sizes_arr loop
        idx := idx + 1;
        alloc := base + (case when idx <= rem then 1 else 0 end);
        insert into public.product_variants (product_id, size, color, stock, price_adjustment)
        values (pr.id, sz, '', alloc, 0);
      end loop;
    else
      foreach sz in array sizes_arr loop
        foreach cl in array colors_arr loop
          idx := idx + 1;
          alloc := base + (case when idx <= rem then 1 else 0 end);
          insert into public.product_variants (product_id, size, color, stock, price_adjustment)
          values (pr.id, sz, cl, alloc, 0);
        end loop;
      end loop;
    end if;
  end loop;
end $$;

-- Denormalized option lists for filters / browse (contains queries).
update public.products p
set
  sizes_array = coalesce((
    select array_agg(distinct v.size order by v.size)
    from public.product_variants v
    where v.product_id = p.id and v.size <> ''
  ), '{}'::text[]),
  colors_array = coalesce((
    select array_agg(distinct v.color order by v.color)
    from public.product_variants v
    where v.product_id = p.id and v.color <> ''
  ), '{}'::text[]);

-- Recompute product totals from variants (trigger also runs on insert; belt and suspenders).
update public.products p
set stock = coalesce((
  select sum(v.stock)::integer from public.product_variants v where v.product_id = p.id
), 0);

-- ---------------------------------------------------------------------------
-- Order confirm: decrement matching variant rows (variantId or size+color).
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_stock int;
  v_name text;
  vid uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if old.status is distinct from 'pending' or new.status is distinct from 'confirmed' then
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
    select p.name into v_name
    from public.products p
    where p.id = r.pid
    for update;

    if not found then
      raise exception 'Product not found for order line';
    end if;

    if r.vid is not null then
      select pv.stock into v_stock
      from public.product_variants pv
      where pv.id = r.vid and pv.product_id = r.pid
      for update;

      if not found then
        raise exception 'Variant not found for product %', v_name;
      end if;

      if v_stock < r.need_qty then
        raise exception 'Not enough stock for %', v_name;
      end if;

      update public.product_variants pv
      set stock = pv.stock - r.need_qty
      where pv.id = r.vid and pv.product_id = r.pid;
    else
      select pv.id, pv.stock into vid, v_stock
      from public.product_variants pv
      where pv.product_id = r.pid and pv.size = r.sz and pv.color = r.cl
      limit 1
      for update;

      if not found then
        raise exception 'No variant row for product % (size %, color %)', v_name, r.sz, r.cl;
      end if;

      if v_stock < r.need_qty then
        raise exception 'Not enough stock for %', v_name;
      end if;

      update public.product_variants pv
      set stock = pv.stock - r.need_qty
      where pv.id = vid;
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

comment on function public.trg_orders_decrement_stock_on_confirm() is
  'On confirm: decrements product_variants by line (variantId or size+color); legacy fallback decrements products.stock when no variant row matches.';
