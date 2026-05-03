-- Checkout: persist delivery option and computed fee (static rate table lives in app)

alter table public.orders
  add column if not exists delivery_mode text;

alter table public.orders
  add column if not exists delivery_price numeric(12, 2);

comment on column public.orders.delivery_mode is 'bureau = pickup at logistics office; home = door delivery.';
comment on column public.orders.delivery_price is 'Shipping fee in DZD at order time (from static wilaya + mode matrix).';
