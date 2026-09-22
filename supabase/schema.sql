-- ============================================
-- ژێوار محمد — سکیمای داتابەیس
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── خشتەی کڕیارەکان ────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name    TEXT         NOT NULL,
  phone_number TEXT         NOT NULL UNIQUE,
  photo_url    TEXT,
  facebook_id  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── خشتەی نەوبەتەکان ───────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID        NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  appointment_time TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── خشتەی خشتەی کاری ───────────────────────
CREATE TABLE IF NOT EXISTS working_schedule (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week   INTEGER NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  start_time    TEXT    NOT NULL DEFAULT '09:00',
  end_time      TEXT    NOT NULL DEFAULT '19:00',
  slot_interval INTEGER NOT NULL DEFAULT 60
);

-- ── خشتەی رووژانی داخراو ───────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE        NOT NULL UNIQUE,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── پرۆفایلی بەربەر ─────────────────────────
CREATE TABLE IF NOT EXISTS barber_profile (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT        NOT NULL DEFAULT 'ژێوار محمد',
  tagline         TEXT        DEFAULT 'چاکسازی بەرز بۆ پیاوی مۆدێرن',
  logo_url        TEXT,
  instagram_url   TEXT,
  facebook_url    TEXT,
  whatsapp_number TEXT,
  tiktok_url      TEXT,
  address         TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── خشتەی گالری ────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_photos (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url  TEXT        NOT NULL,
  caption    TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── خشتەی بەستەرە کۆمەڵایەتییەکان ──────────
CREATE TABLE IF NOT EXISTS social_links (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT        NOT NULL DEFAULT '',
  url        TEXT        NOT NULL,
  image_url  TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── تۆکنەکانی ئاگادارکردنەوەی ئەدمین (FCM) ─
-- Server-only: written/read exclusively via the service-role key from
-- /api/admin/fcm-token — never exposed to the anon role.
CREATE TABLE IF NOT EXISTS admin_fcm_tokens (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── داتای دەستپێک ──────────────────────────

INSERT INTO working_schedule (day_of_week, is_active, start_time, end_time, slot_interval) VALUES
  (0, false, '10:00', '17:00', 60),
  (1, true,  '09:00', '19:00', 60),
  (2, true,  '09:00', '19:00', 60),
  (3, true,  '09:00', '19:00', 60),
  (4, true,  '09:00', '19:00', 60),
  (5, true,  '09:00', '19:00', 60),
  (6, true,  '10:00', '17:00', 60)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO barber_profile (name, tagline, whatsapp_number, address)
SELECT 'ژێوار محمد', 'چاکسازی بەرز بۆ پیاوی مۆدێرن', '+9647501234567', 'شەقامی سەرەکی، شار'
WHERE NOT EXISTS (SELECT 1 FROM barber_profile);

INSERT INTO gallery_photos (photo_url, caption, sort_order) VALUES
  ('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&h=900&fit=crop&q=80', 'بریندنی تایبەت',    1),
  ('https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=700&h=900&fit=crop&q=80', 'دروستکردنی تەواو', 2),
  ('https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=700&h=900&fit=crop&q=80', 'چاکسازی ریش',      3),
  ('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=700&h=900&fit=crop&q=80', 'فەیدی کلاسیکی',    4),
  ('https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=700&h=900&fit=crop&q=80', 'چاکسازی شاهانە',   5),
  ('https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=700&h=900&fit=crop&q=80', 'ئەزموونی دەسمالی گەرم', 6)
ON CONFLICT DO NOTHING;

-- ── سیاسەتی RLS ────────────────────────────
-- `customers` and `appointments` hold customer PII (name, phone, photo,
-- Facebook id, notes) and are never queried with the anon key — every
-- read/write goes through Next.js API routes using the service-role key,
-- which bypasses RLS entirely. So the anon/authenticated roles get NO
-- policy on these two tables at all (RLS default-denies with no matching
-- policy). `admin_fcm_tokens` is the same: server-only, no anon access.
--
-- The remaining tables back public, read-only storefront content (working
-- hours, blocked dates, shop profile, gallery, social links) that the
-- client legitimately reads directly with the anon key — those stay
-- SELECT-only for anon; all writes to them go through the admin-authenticated
-- API routes with the service-role key.
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_schedule" ON working_schedule   FOR SELECT USING (true);
CREATE POLICY "public_read_blocked"  ON blocked_dates      FOR SELECT USING (true);
CREATE POLICY "public_read_profile"  ON barber_profile     FOR SELECT USING (true);
CREATE POLICY "public_read_gallery"  ON gallery_photos     FOR SELECT USING (true);
CREATE POLICY "public_read_social"   ON social_links       FOR SELECT USING (true);
-- customers, appointments, admin_fcm_tokens: intentionally no anon policy.
