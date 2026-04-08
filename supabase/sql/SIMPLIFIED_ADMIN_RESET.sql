-- Drop all RLS policies for seller_applications and shops.
-- This keeps RLS enabled by default, but with no policies active.
-- If you want to bypass RLS entirely for now, run:
-- ALTER TABLE public.seller_applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.shops DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.seller_applications'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.seller_applications', policy_name);
  END LOOP;

  FOR policy_name IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.shops'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shops', policy_name);
  END LOOP;
END $$;
