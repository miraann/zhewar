-- ============================================================
-- Notification sound — picked under the admin panel's Settings tab.
--
-- The sound new-booking push notifications play on the admin phones
-- (see lib/notificationSounds.ts for the valid ids). Each sound maps to
-- its own Android notification channel, so the server reads this when it
-- sends a push to choose the channel.
--
-- Run once against your live database (Supabase Dashboard -> SQL
-- Editor). Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE barber_profile
  ADD COLUMN IF NOT EXISTS notification_sound TEXT NOT NULL DEFAULT 'default';

ALTER TABLE barber_profile DROP CONSTRAINT IF EXISTS barber_profile_notification_sound_check;
ALTER TABLE barber_profile
  ADD CONSTRAINT barber_profile_notification_sound_check
  CHECK (notification_sound IN ('default', 'chime', 'bell', 'doorbell', 'alert'));
