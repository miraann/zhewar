-- ============================================================
-- Trim pg_cron's run log (cron.job_run_details) to the last 7 days.
--
-- pg_cron logs every run and never deletes the log — the hourly
-- delete-past-visits job (2026-10-01_visit_retention.sql) alone adds 24
-- rows a day. app/api/cron/cleanup-photos calls this once a day.
--
-- The route reaches the database through PostgREST, which can't see the
-- cron schema, hence a public function it calls as service_role.
--
-- Run once against your live database (Supabase Dashboard -> SQL
-- Editor). Idempotent — re-running replaces the function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_cron_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged INTEGER;
BEGIN
  DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

-- Supabase grants anon EXECUTE on public functions by default, which would
-- expose this as /rest/v1/rpc/purge_cron_history — only the server may run it.
REVOKE EXECUTE ON FUNCTION public.purge_cron_history() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_cron_history() TO service_role;

-- ── Verification ─────────────────────────────────────────────────────
-- Returns how many log rows were deleted (0 until the log is 7 days old).
SELECT public.purge_cron_history();
