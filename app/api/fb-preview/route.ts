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

function isSafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    // Block loopback / localhost
    if (h === 'localhost' || h === '::1') return false;
    // Block 127.x.x.x, 0.x.x.x
    if (/^(127\.|0\.)/.test(h)) return false;
    // Block private RFC-1918 ranges
    if (/^10\./.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (/^192\.168\./.test(h)) return false;
    // Block link-local (169.254.x.x — AWS metadata etc.)
    if (/^169\.254\./.test(h)) return false;
    // Block IPv6 private ranges
    if (/^(fc|fd)/i.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? '';
  if (!raw) return NextResponse.json({ error: 'no url' }, { status: 400 });

  const url = normaliseUrl(raw);

  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });

    const html = await res.text();

    const rawName = extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title');
    const photo   = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');

    const name = rawName
      ? rawName.replace(/\s*[|–-]\s*Facebook\s*$/i, '').replace(/\s*[|–-]\s*Messenger\s*$/i, '').trim()
      : null;

    return NextResponse.json({ name: name || null, photo: photo || null });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
