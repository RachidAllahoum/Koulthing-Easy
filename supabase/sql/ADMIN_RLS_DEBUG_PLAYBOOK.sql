-- =============================================================================
-- ADMIN + seller_applications RLS — debug playbook (run sections manually)
-- =============================================================================
-- No profiles table. Admin = JWT app_metadata.is_admin only (text -> boolean).
--
-- STEP 1 — Test WITHOUT RLS (see if rows appear in the app)
-- -----------------------------------------------------------------------------
-- If the admin panel shows applications after this, RLS was blocking reads.

ALTER TABLE public.seller_applications DISABLE ROW LEVEL SECURITY;

-- When done testing, re-enable (required for production):
-- ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
-- …then apply migration 011_seller_applications_rls_jwt_app_metadata_boolean.sql


-- STEP 3 — Inspect JWT inside Postgres (often NULL in Dashboard SQL editor)
-- -----------------------------------------------------------------------------
-- The SQL Editor runs as the database role, not your logged-in user, so
-- auth.jwt() is frequently NULL here. Use this to confirm the shape when JWT exists,
-- or check claims in the app console (refresh logs) instead.

SELECT auth.jwt() AS full_jwt_claims;

SELECT auth.jwt() -> 'app_metadata' AS app_metadata;
SELECT auth.jwt() -> 'app_metadata' ->> 'is_admin' AS is_admin_text;


-- See what is stored for users (no JWT required)
SELECT id, email, raw_app_meta_data, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;


-- STEP 4 — Fix missing admin claim on ONE user (replace email or id)
-- -----------------------------------------------------------------------------
-- After updating, the user MUST sign out and sign in again (or refresh session)
-- so the access token includes the new claim.

UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true)
WHERE email = 'your-admin@example.com';
-- WHERE id = '00000000-0000-0000-0000-000000000000';

-- Verify:
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE email = 'your-admin@example.com';
