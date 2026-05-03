-- Unify completed -> delivered; buyer cancel on pending or confirmed with reason; optional audit columns.

alter table public.orders add column if not exists cancellation_reason text;
alter table public.orders add column if not exists cancelled_at timestamptz;

comment on column public.orders.cancellation_reason is 'Required text from buyer/seller when cancelling (app-enforced).';
comment on column public.orders.cancelled_at is 'Timestamp when the order was cancelled.';

update public.orders set status = 'delivered' where lower(status) = 'completed';

-- Buyer may cancel own pending or confirmed orders (cancelled_by = buyer + non-empty reason)
drop policy if exists "orders_update_buyer_cancel_pending" on public.orders;
drop policy if exists "orders_update_buyer_cancel_pending_or_confirmed" on public.orders;

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
