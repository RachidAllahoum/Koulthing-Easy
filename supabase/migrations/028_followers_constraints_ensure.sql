-- Idempotent: ensure followers uniqueness and FKs (safe if 027 already applied)

alter table public.followers
  drop constraint if exists followers_buyer_shop_unique;

alter table public.followers
  add constraint followers_buyer_shop_unique unique (buyer_id, shop_id);
