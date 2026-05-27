-- ============================================
-- بەربەری لوکس — سکیمای داتابەیس
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── خشتەی کڕیارەکان ────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name    TEXT         NOT NULL,
  phone_number TEXT         NOT NULL UNIQUE,
  facebook_id  TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── خشتەی خزمەتگوزارییەکان ─────────────────
CREATE TABLE IF NOT EXISTS services (
  id       UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name     TEXT          NOT NULL,
  duration INTEGER       NOT NULL,
  price    NUMERIC(10,2) NOT NULL
);

-- ── خشتەی نەوبەتەکان ───────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID        NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  service_id       UUID        NOT NULL REFERENCES services(id)   ON DELETE CASCADE,
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
  name            TEXT        NOT NULL DEFAULT 'بەربەری لوکس',
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

-- ── داتای دەستپێک ──────────────────────────

INSERT INTO services (name, duration, price) VALUES
  ('بریندنی موی کلاسیکی',       30,  35.00),
  ('رووتراشی بە دەسمالی گەرم',  45,  50.00),
  ('بریندنی مو و چاکسازی ریش',  60,  65.00),
  ('چاکسازی شاهانە',            90,  95.00),
  ('بریندنی موی منداڵ',         25,  28.00)
ON CONFLICT DO NOTHING;

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
SELECT 'بەربەری لوکس', 'چاکسازی بەرز بۆ پیاوی مۆدێرن', '+9647501234567', 'شەقامی سەرەکی، شار'
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
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_services"         ON services          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_customers"        ON customers         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_appointments"     ON appointments      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_schedule"        ON working_schedule  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_blocked"         ON blocked_dates     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_profile"          ON barber_profile    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_gallery"          ON gallery_photos    FOR ALL USING (true) WITH CHECK (true);
