-- Platform fee column (checkout inserts this; required for PostgREST / schema cache).

alter table public.orders
  add column if not exists koulthing_fee numeric(12, 2) not null default 0;

comment on column public.orders.koulthing_fee is 'Koulthing platform fee in DZD: (subtotal + delivery_price) × 0.025 at order time.';
