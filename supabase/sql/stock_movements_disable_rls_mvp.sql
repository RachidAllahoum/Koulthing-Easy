-- MVP / emergency only: turns off RLS on stock_movements so all inserts succeed.
-- Prefer running migration 049_stock_movements_rls_inserts.sql instead.
-- To re-enable later: ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

alter table public.stock_movements disable row level security;
