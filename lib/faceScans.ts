// Face scans live in the public `customer_photos` storage bucket. Every
// face scan a customer chooses to save is also remembered in this browser
// cookie (newest first), so /book can offer them again on the next visit
// without a rescan. The cookie only holds bucket file names — never image
// data — which keeps it tiny and means a forged cookie can't point the
// page at an arbitrary URL.

export const FACE_SCANS_COOKIE   = 'zh_face_scans';
export const MAX_SAVED_FACE_SCANS = 8;

const BUCKET      = 'customer_photos';
const BUCKET_BASE =
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/`;
const PATH_RE     = /^customer-\d+(?:-[a-z0-9]+)?\.jpg$/;
const MAX_AGE_S   = 60 * 60 * 24 * 365;

export function newFaceScanPath(): string {
  return `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
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

export function parseFaceScansCookie(raw: string | undefined | null): string[] {
  if (!raw) return [];
  // Tolerate both the encoded and already-decoded forms of the separator
  const paths = raw.replace(/%7C/gi, '|').split('|').filter((p) => PATH_RE.test(p));
  return Array.from(new Set(paths)).slice(0, MAX_SAVED_FACE_SCANS);
}

// ── Browser-only ─────────────────────────────────────────────────────────────

export function readSavedFaceScans(): string[] {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${FACE_SCANS_COOKIE}=([^;]*)`));
    return parseFaceScansCookie(match?.[1]);
  } catch {
    return [];
  }
}

function writeSavedFaceScans(paths: string[]): string[] {
  const kept = paths.slice(0, MAX_SAVED_FACE_SCANS);
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = kept.length
      ? `${FACE_SCANS_COOKIE}=${encodeURIComponent(kept.join('|'))}; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax${secure}`
      : `${FACE_SCANS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {}
  return kept;
}

export function saveFaceScan(path: string): string[] {
  if (!PATH_RE.test(path)) return readSavedFaceScans();
  return writeSavedFaceScans([path, ...readSavedFaceScans().filter((p) => p !== path)]);
}

export function forgetFaceScan(path: string): string[] {
  return writeSavedFaceScans(readSavedFaceScans().filter((p) => p !== path));
}
