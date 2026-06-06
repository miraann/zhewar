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
  // m.me/username → facebook.com/username
  url = url.replace(/^https?:\/\/m\.me\//, 'https://www.facebook.com/');
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? '';
  if (!raw) return NextResponse.json({ error: 'no url' }, { status: 400 });

  const url = normaliseUrl(raw);

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

    const rawName  = extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title');
    const photo    = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');

    // Strip " | Facebook" suffix Facebook appends to og:title
    const name = rawName
      ? rawName.replace(/\s*[|–-]\s*Facebook\s*$/i, '').replace(/\s*[|–-]\s*Messenger\s*$/i, '').trim()
      : null;

    return NextResponse.json({ name: name || null, photo: photo || null });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
