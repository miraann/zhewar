-- ============================================================
-- WhatsApp message templates — managed under the admin panel's
-- «واتساپ» tab.
--
-- Each template is either an "accept" message (offered right after a
-- booking is confirmed) or a "decline" message (offered after one is
-- cancelled). The admin picks one, it's filled in with the booking's
-- {name} / {date} / {time} / {link} / {book} placeholders and opened in
-- WhatsApp as a wa.me prefill — the admin still taps Send there, so no
-- WhatsApp Business API account is needed. Within each kind, the first
-- one in sort_order is the default (preselected) message.
--
-- No anon policy: only the admin API routes (service-role key) ever read
-- or write this table.
--
-- Run once against your live database (Supabase Dashboard -> SQL
-- Editor). Idempotent — safe to re-run; each default message is only
-- seeded when its kind has no templates yet.
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  kind       TEXT        NOT NULL CHECK (kind IN ('accept', 'decline')),
  title      TEXT        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body       TEXT        NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_kind_sort_idx
  ON whatsapp_templates (kind, sort_order, created_at);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- ── Default messages ────────────────────────────────────────────────
INSERT INTO whatsapp_templates (kind, title, body, sort_order)
SELECT 'accept', 'پەسەندکردنی کاتی سەردان', $t$سڵاو {name} 👋

کاتی سەردانیکردنەکەت لە ژێوار عزیز پەسەند کرا ✅

📅 ڕۆژ: {date}
⏰ کات: {time}

تکایە چەند خولەکێک پێش کاتەکەت ئامادە بە.
پسوولەی سەردانەکەت: {link}

چاوەڕێتین 💈$t$, 0
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_templates WHERE kind = 'accept');

INSERT INTO whatsapp_templates (kind, title, body, sort_order)
SELECT 'decline', 'هەڵوەشاندنی کاتی سەردان', $t$سڵاو {name}

ببورە، ناتوانین کاتی سەردانیکردنەکەت لە ڕۆژی {date} کاتژمێر {time} پەسەند بکەین ❌

تکایە کاتێکی تر هەڵبژێرە و دووبارە تۆمار بکە:
{book}

سوپاس بۆ تێگەیشتنت 🙏
ژێوار عزیز$t$, 0
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_templates WHERE kind = 'decline');

NOTIFY pgrst, 'reload schema';

-- ── Verification ─────────────────────────────────────────────────────
-- Should list the two default messages (one accept, one decline).
SELECT kind, title, sort_order FROM whatsapp_templates ORDER BY kind, sort_order;
