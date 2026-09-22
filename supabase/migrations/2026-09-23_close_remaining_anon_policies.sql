-- ============================================================
-- Follow-up fix: the live database was never actually running the
-- policies named in the old schema.sql — it has its own, differently
-- named ones, so the previous migration's DROP POLICY IF EXISTS
-- statements (matching schema.sql's names) silently missed them.
--
-- Confirmed still open after the last run (from `SELECT * FROM
-- pg_policies`):
--   appointments_anon_select  (appointments, SELECT) — anyone can read
--       every appointment (id, customer_id, time, status) via the anon key
--   appointments_anon_insert  (appointments, INSERT) — anyone can insert
--       appointment rows directly, including status='confirmed'
--   anon_insert_only          (customers,    INSERT) — anyone can insert
--       arbitrary customer rows directly
--
-- None of the app's own code uses the anon key for these two tables
-- (everything goes through the service-role key via getSupabaseAdmin()),
-- so dropping these breaks nothing — run this now.
-- ============================================================

DROP POLICY IF EXISTS "appointments_anon_select" ON appointments;
DROP POLICY IF EXISTS "appointments_anon_insert" ON appointments;
DROP POLICY IF EXISTS "anon_insert_only"          ON customers;

-- ── Optional hygiene: the earlier migration created "public_read_*"
-- policies alongside pre-existing, differently-named read policies that
-- do the exact same thing (e.g. barber_profile has both "profile_select"
-- and "public_read_profile"). Harmless duplicates, not a security issue —
-- uncomment to consolidate down to one policy per table if you want it
-- tidier.
-- DROP POLICY IF EXISTS "profile_select"  ON barber_profile;
-- DROP POLICY IF EXISTS "blocked_select"  ON blocked_dates;
-- DROP POLICY IF EXISTS "gallery_select"  ON gallery_photos;
-- DROP POLICY IF EXISTS "social_select"   ON social_links;
-- DROP POLICY IF EXISTS "schedule_select" ON working_schedule;

-- ── Verification ─────────────────────────────────────────────────────
-- appointments and customers must show ZERO rows now.
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
