-- When an order moves from pending → confirmed, decrement products.stock by ordered quantities.

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
      sum(x.qty)::int as need_qty
    from (
      select
        nullif(trim(elem ->> 'productId'), '')::uuid as pid,
        greatest(coalesce((elem ->> 'quantity')::integer, 0), 0) as qty
      from jsonb_array_elements(coalesce(new.items_json, '[]'::jsonb)) as elem
    ) x
    where x.pid is not null
    group by x.pid
  loop
    select p.stock, p.name into v_stock, v_name
    from public.products p
    where p.id = r.pid
    for update;

    if not found then
      raise exception 'Product not found for order line';
    end if;

    if v_stock < r.need_qty then
      raise exception 'Not enough stock for %', v_name;
    end if;

    update public.products
    set stock = stock - r.need_qty
    where id = r.pid;
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
  'Decrements products.stock when order status becomes confirmed from pending; rolls back if any line lacks stock.';
