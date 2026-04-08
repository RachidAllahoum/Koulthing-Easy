-- At most one pending seller application per user (prevents double Submission / duplicates).

CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_one_pending_per_user
  ON public.seller_applications (user_id)
  WHERE status = 'pending';
