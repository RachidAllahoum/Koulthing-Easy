-- Admin rejection reason support for seller applications.

alter table public.seller_applications
  add column if not exists review_notes text;

comment on column public.seller_applications.review_notes is
  'Admin review notes (required on rejection by app flow).';

