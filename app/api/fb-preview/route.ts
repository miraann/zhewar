import { promises as dns } from 'node:dns';
import net from 'node:net';
import { NextRequest, NextResponse } from 'next/server';

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();
  }
  return null;
}

function normaliseUrl(raw: string): string {
  let url = raw.trim();
  url = url.replace(/^https?:\/\/m\.me\//, 'https://www.facebook.com/');
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

// ── SSRF guard ──────────────────────────────────────────────────────────────
// String-matching the hostname (the previous approach) can't catch a
// domain that simply *resolves* to an internal address (DNS rebinding), nor
// alternate IP encodings (decimal/octal/hex, IPv4-mapped IPv6, "127.1", …)
// that Node's fetch still happily connects to. So we resolve DNS ourselves
// and range-check the actual IP(s) that will be connected to — for the
// initial URL and for every redirect hop, since a redirect is just as able
// to point at an internal address as the original URL.

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

// Loopback, link-local (incl. cloud metadata 169.254.169.254), RFC1918
// private ranges, CGNAT, documentation/test ranges, multicast, reserved.
const BLOCKED_IPV4_CIDRS = [
  '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
  '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16',
  '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4',
];

function isBlockedIPv4(ip: string): boolean {
  return BLOCKED_IPV4_CIDRS.some((cidr) => inCidr(ip, cidr));
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;              // loopback / unspecified
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;                // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;                 // fc00::/7 unique local
  if (lower.startsWith('ff')) return true;                           // ff00::/8 multicast
  // IPv4-mapped / IPv4-compatible IPv6 — check the embedded IPv4 address too
  const mapped = lower.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  return false;
}

async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
  const version = net.isIP(hostname);
  if (version === 4) return !isBlockedIPv4(hostname);
  if (version === 6) return !isBlockedIPv6(hostname);

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false;
  }
  if (!records.length) return false;
  return records.every((r) => (r.family === 4 ? !isBlockedIPv4(r.address) : !isBlockedIPv6(r.address)));
}

async function isSafeUrl(urlStr: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  return resolvesToPublicAddress(u.hostname);
}

const MAX_REDIRECTS = 3;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? '';
  if (!raw) return NextResponse.json({ error: 'no url' }, { status: 400 });

  let url = normaliseUrl(raw);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await isSafeUrl(url))) {
        return NextResponse.json({ error: 'invalid url' }, { status: 400 });
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html',
        },
        redirect: 'manual',
        next: { revalidate: 60 },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
        url = new URL(location, url).toString();
        continue;
      }

      if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });

      const html = await res.text();

      const rawName = extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title');
      const photo = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');

      const name = rawName
        ? rawName.replace(/\s*[|–-]\s*Facebook\s*$/i, '').replace(/\s*[|–-]\s*Messenger\s*$/i, '').trim()
        : null;

      return NextResponse.json({ name: name || null, photo: photo || null });
    }

    return NextResponse.json({ error: 'too many redirects' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
