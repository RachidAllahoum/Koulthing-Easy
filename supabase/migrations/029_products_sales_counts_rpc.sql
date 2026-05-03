-- Public aggregation for product "best selling" sort.
-- Reads orders.items_json and returns sold quantity by product_id.

create or replace function public.get_products_sales_counts(p_product_ids uuid[])
returns table(product_id uuid, sold_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with expanded as (
    select
      nullif(elem ->> 'productId', '')::uuid as product_id,
      greatest(coalesce((elem ->> 'quantity')::integer, 0), 0) as qty
    from public.orders o
    cross join lateral jsonb_array_elements(o.items_json) elem
    where (elem ->> 'productId') is not null
  )
  select e.product_id, sum(e.qty)::bigint as sold_count
  from expanded e
  where e.product_id = any(p_product_ids)
  group by e.product_id;
$$;

revoke all on function public.get_products_sales_counts(uuid[]) from public;
grant execute on function public.get_products_sales_counts(uuid[]) to anon, authenticated;
