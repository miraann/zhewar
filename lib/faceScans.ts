// Face scans live in the public `customer_photos` storage bucket. A new
// scan is taken for every booking (CustomerRegistration) — none are kept
// on the device for reuse. Files no customer or appointment uses are
// deleted once they're 3 days old (app/api/cron/cleanup-photos).

const BUCKET      = 'customer_photos';
const BUCKET_BASE =
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/`;
const PATH_RE     = /^customer-\d+(?:-[a-z0-9]+)?\.jpg$/;

// The bucket is public, so the name is what keeps a scan private: 122 random
// bits (hyphens dropped so PATH_RE, which older names also match, still fits).
export function newFaceScanPath(): string {
  return `customer-${Date.now()}-${crypto.randomUUID().replace(/-/g, '')}.jpg`;
}

export function isFaceScanPath(path: string): boolean {
  return PATH_RE.test(path);
}

export function faceScanUrl(path: string): string {
  return BUCKET_BASE + path;
}

// The bucket file name for a public URL in our bucket, or null for
// anything else (Facebook photos, data: URLs, other hosts).
export function faceScanPath(url: string): string | null {
  if (!url.startsWith(BUCKET_BASE)) return null;
  const path = url.slice(BUCKET_BASE.length);
  return PATH_RE.test(path) ? path : null;
}
