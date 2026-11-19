-- ============================================================
-- Storage lock-down (security check, 2026-11-19)
--
-- Found on the live database:
--   "Allow public uploads" (storage.objects, INSERT, role anon,
--   check: bucket_id = 'uploads') — anyone with the public anon key
--   could upload any file, of any type and size, to the public
--   `uploads` bucket, straight through the Storage API. That skips
--   every check in app/api/admin/upload/route.ts (images only, 5 MB,
--   real file signature) and turns the bucket into free hosting for
--   phishing pages or malware.
--   All four buckets also had no size limit and no file type list.
--
-- No app code uploads with the anon key: admin uploads go through
-- /api/admin/upload and face scans through /api/upload-face-scan, both
-- with the service-role key. So dropping the policy breaks nothing.
-- The bucket limits below match what those two routes already accept,
-- and Storage enforces them for every upload, including the service role.
-- ============================================================

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Admin uploads: JPG / PNG / WEBP, up to 5 MB (app/api/admin/upload)
UPDATE storage.buckets
   SET file_size_limit    = 5242880,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id IN ('gallery_photos', 'social_posts', 'uploads');

-- Face scans: small JPEGs, the route caps them at 300 KB (app/api/upload-face-scan)
UPDATE storage.buckets
   SET file_size_limit    = 1048576,
       allowed_mime_types = ARRAY['image/jpeg']
 WHERE id = 'customer_photos';
