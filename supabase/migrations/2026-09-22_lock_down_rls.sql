-- ============================================================
-- Security fix: lock down over-permissive RLS policies.
--
-- The original schema.sql gave every table a `FOR ALL USING (true)
-- WITH CHECK (true)` policy. Since the app ships the public Supabase anon
-- key to the browser, that meant ANYONE could read/write customers.* and
-- appointments.* directly via the Supabase REST API — full names, phone
-- numbers, Facebook ids, notes, appointment history — completely
-- bypassing the app's admin-token gate.
--
-- The first attempt at this migration failed with
-- `relation "services" does not exist` — the live database has drifted
-- from the checked-in schema.sql, so this version checks each table
-- exists (via to_regclass) before touching it instead of assuming
-- schema.sql is accurate. Whatever table doesn't exist is silently
-- skipped rather than aborting the whole script.
--
-- Run this once against your live database (Supabase Dashboard -> SQL
-- Editor). It's idempotent — safe to re-run.
-- ============================================================

DO $$
BEGIN
  -- ── customers / appointments / admin_fcm_tokens: NO anon access ──────
  -- All reads/writes to these already go through Next.js API routes using
  -- the service-role key (getSupabaseAdmin()), which bypasses RLS — so the
  -- anon/authenticated roles don't need, and must not have, any policy.
  IF to_regclass('public.customers') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_customers" ON customers';
  END IF;

  IF to_regclass('public.appointments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE appointments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_appointments" ON appointments';
  END IF;

  IF to_regclass('public.admin_fcm_tokens') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE admin_fcm_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_fcm_tokens" ON admin_fcm_tokens';
  END IF;

  -- ── Public storefront content: read-only for anon ────────────────────
  -- Legitimately read directly by the browser with the anon key, but
  -- writes must only happen through the admin-authenticated API routes.
  -- (No "services" table — that concept was dropped from this app; the
  -- booking flow no longer has a service-selection step.)
  IF to_regclass('public.working_schedule') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE working_schedule ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_schedule" ON working_schedule';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_schedule" ON working_schedule';
    EXECUTE 'CREATE POLICY "public_read_schedule" ON working_schedule FOR SELECT USING (true)';
  END IF;

  IF to_regclass('public.blocked_dates') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_blocked" ON blocked_dates';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_blocked" ON blocked_dates';
    EXECUTE 'CREATE POLICY "public_read_blocked" ON blocked_dates FOR SELECT USING (true)';
  END IF;

  IF to_regclass('public.barber_profile') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE barber_profile ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_profile" ON barber_profile';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_profile" ON barber_profile';
    EXECUTE 'CREATE POLICY "public_read_profile" ON barber_profile FOR SELECT USING (true)';
  END IF;

  IF to_regclass('public.gallery_photos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_gallery" ON gallery_photos';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_gallery" ON gallery_photos';
    EXECUTE 'CREATE POLICY "public_read_gallery" ON gallery_photos FOR SELECT USING (true)';
  END IF;

  IF to_regclass('public.social_links') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE social_links ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "public_all_social" ON social_links';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_social" ON social_links';
    EXECUTE 'CREATE POLICY "public_read_social" ON social_links FOR SELECT USING (true)';
  END IF;
END $$;

-- ── Verification ─────────────────────────────────────────────────────
-- 1) Every table that actually exists in your DB right now — compare this
--    against the table names this script checks above; paste back
--    anything unfamiliar (e.g. if "services" really is named/structured
--    differently) so the policies can be corrected for what's really there.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2) Every RLS policy left standing. "customers", "appointments" and
--    "admin_fcm_tokens" (if that table exists) must show ZERO rows here —
--    if any of them still has a row, the lockdown did not take for that
--    table and it's still fully open to the anon key.
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
