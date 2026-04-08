-- One shop per seller; at most one approved seller application per user
-- If this fails, clean duplicates first, then re-run.

-- ---------------------------------------------------------------------------
-- shops: each seller (user) may own at most one shop row
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS shops_seller_id_unique
  ON public.shops (seller_id);

-- ---------------------------------------------------------------------------
-- seller_applications: a user may have many rows (pending/rejected), but only
-- one row with status = 'approved' at a time
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_one_approved_per_user
  ON public.seller_applications (user_id)
  WHERE status = 'approved';
