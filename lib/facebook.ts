// A customer's facebook_id is typed or pasted at booking and ends up as an
// <a href> in the admin panel, so it's only stored, and only rendered, after
// being rebuilt from a parsed URL on a Facebook host — never as the raw
// string, where a "javascript:" link would run inside the admin page.
// No Node imports: used by API routes and client components alike.

// What register-customer stores: a numeric id, or an https facebook.com or
// m.me link.
const STORED_RE = /^(\d{5,20}|https:\/\/(www\.|m\.|web\.)?facebook\.com\/[^\s"'<>]{1,200}|https:\/\/m\.me\/[\w.]{1,100})$/;

const KEPT_FB_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com']);

// The canonical form of a facebook_id (see STORED_RE), or null if it isn't
// a Facebook id or link. Accepts what CustomerRegistration's toFbUrl sends,
// plus links typed without https:// and fb.com / mbasic. hosts.
export function normalizeFacebookId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const looksLikeUrl = /[/:]/.test(s) || /(^|\.)(facebook\.com|fb\.com|m\.me)$/i.test(s);
  if (!looksLikeUrl) {
    if (/^\d{5,20}$/.test(s)) return s;
    // A bare username
    if (/^[A-Za-z0-9.]{1,100}$/.test(s)) return `https://www.facebook.com/${s}`;
    return null;
  }

  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || u.port) return null;

  let host = u.hostname.toLowerCase();
  let out: string;
  if (host === 'm.me' || host === 'www.m.me') {
    out = `https://m.me${u.pathname.replace(/\/+$/, '')}`;
  } else if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com')) {
    if (!KEPT_FB_HOSTS.has(host)) host = 'www.facebook.com';
    out = `https://${host}${u.pathname}${u.search}`;
  } else {
    return null;
  }
  return STORED_RE.test(out) ? out : null;
}

// An https link to the customer's Facebook profile, safe to use as an href —
// or null. Also cleans up rows stored before facebook_id was validated.
export function facebookProfileUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = normalizeFacebookId(raw);
  if (!id) return null;
  return /^\d+$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : id;
}
