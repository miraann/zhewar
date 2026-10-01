-- ============================================================
-- Per-booking face photo.
--
-- The face scan used to live only on `customers.photo_url`, keyed by
-- phone number. A booking made from a second phone (which doesn't hold
-- the customer's access token, so it can't overwrite the profile) kept
-- showing the photo scanned on the first phone. Each appointment now
-- stores the face scan taken for it; the admin dashboard, receipt page
-- and «my bookings» show it, falling back to customers.photo_url for
-- bookings made before this column existed.
--
-- Only URLs in the public `customer_photos` storage bucket are written
-- here (validated in app/api/book-appointment/route.ts).
--
-- Run once against your live database (Supabase Dashboard -> SQL
-- Editor) BEFORE deploying the matching code — booking inserts and the
-- admin appointments query reference this column. Idempotent.
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

NOTIFY pgrst, 'reload schema';
