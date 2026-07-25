import { timingSafeEqual } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Capacitor WebView may use capacitor://localhost as its origin even when
// server.url points to zhewar.shop — allow it so the fetch doesn't get
// blocked by a CORS preflight the server never answers.
const ALLOWED_ORIGINS = [
  'https://zhewar.shop',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// Lazy singleton — only created when the route is actually invoked,
// so a missing Upstash URL doesn't crash the build.
let _ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !url.startsWith('https') || !token) return null;
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '60s'),
    prefix: 'rl:admin-login',
  });
  return _ratelimit;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const ratelimit = getRatelimit();

  if (ratelimit) {
    const ip = getIp(request);
    const { success, reset, remaining } = await ratelimit.limit(ip);
    if (!success) {
      const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'rate_limited', secondsLeft, remaining },
        { status: 429, headers: corsHeaders(origin) },
      );
    }
  }

  const { password } = await request.json();

  if (!password || !safeCompare(password, process.env.ADMIN_PASSWORD ?? '')) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers: corsHeaders(origin) });
  }

  // Return token in body so Capacitor WebView can store it in localStorage
  // and use it as X-Admin-Token header for subsequent API calls (cookies are
  // not sent with JS fetch() in the WebView even for same-URL origins).
  const res = NextResponse.json({ success: true, token: process.env.ADMIN_TOKEN! }, { headers: corsHeaders(origin) });
  res.cookies.set('admin_session', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return res;
}
