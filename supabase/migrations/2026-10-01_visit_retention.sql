-- ============================================================
-- Delete customers and appointments 3 days after the visit.
--
-- appointments: deleted once appointment_time is more than 3 days in
-- the past, whatever the status (pending, confirmed or cancelled).
--
-- customers: a customer has no visit time of their own, so they go once
-- the step above leaves them with no appointment — i.e. their latest
-- visit was more than 3 days ago. A customer with an upcoming booking is
-- always kept (appointments.customer_id is ON DELETE CASCADE, so deleting
-- the customer would take the booking with it). One who registered but
-- never booked is judged by created_at instead, so a customer who's
-- mid-booking isn't deleted out from under the flow.
--
-- A returning customer whose row was deleted is registered again from
-- the details cached on their device the next time they book
-- (handleConfirm in components/booking/BookingFlow.tsx), so they don't
-- have to fill in the form again.
--
-- Face scans in the customer_photos bucket can't be deleted from SQL
-- (Supabase only allows that through the Storage API), so this job leaves
-- them; app/api/cron/cleanup-photos deletes the ones no remaining row
-- uses, daily via Vercel Cron.
--
-- Runs hourly as a plain SQL pg_cron job — no HTTP call or secret.
--
-- Run once against your live database (Supabase Dashboard -> SQL
-- Editor). Idempotent — re-running replaces the function and the job.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.delete_past_visits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff            TIMESTAMPTZ := NOW() - INTERVAL '3 days';
  appointments_gone INTEGER;
  customers_gone    INTEGER;
BEGIN
  DELETE FROM appointments WHERE appointment_time < cutoff;
  GET DIAGNOSTICS appointments_gone = ROW_COUNT;

  DELETE FROM customers c
  WHERE c.created_at < cutoff
    AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.customer_id = c.id);
  GET DIAGNOSTICS customers_gone = ROW_COUNT;

  RETURN jsonb_build_object('appointments', appointments_gone, 'customers', customers_gone);
END;
$$;

-- Supabase exposes public functions as /rest/v1/rpc/* and grants anon
-- EXECUTE by default — only the cron job (postgres) should run this.
REVOKE EXECUTE ON FUNCTION public.delete_past_visits() FROM PUBLIC, anon, authenticated;

-- Same job name on re-run updates the existing job instead of adding one.
SELECT cron.schedule(
  'delete-past-visits',
  '0 * * * *',  -- hourly, so rows go within an hour of the 3-day mark
  $$ SELECT public.delete_past_visits(); $$
);

-- ── Verification ─────────────────────────────────────────────────────
-- Clears the backlog right away; the result shows how many rows each
-- table dropped.
SELECT public.delete_past_visits();

-- To stop it later:  SELECT cron.unschedule('delete-past-visits');
