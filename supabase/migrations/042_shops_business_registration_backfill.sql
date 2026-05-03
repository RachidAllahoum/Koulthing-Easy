-- Add business registration field to shops and backfill from approved seller applications.

alter table public.shops
  add column if not exists business_registration text;

comment on column public.shops.business_registration is
  'Seller legal identifier copied from seller_applications.business_registration at approval time.';

with latest_approved as (
  select distinct on (sa.user_id)
    sa.user_id,
    nullif(trim(sa.business_registration), '') as business_registration
  from public.seller_applications sa
  where sa.status = 'approved'
  order by sa.user_id, sa.reviewed_at desc nulls last, sa.submitted_at desc nulls last
)
update public.shops s
set business_registration = la.business_registration
from latest_approved la
where s.seller_id = la.user_id
  and la.business_registration is not null
  and (s.business_registration is null or trim(s.business_registration) = '');

