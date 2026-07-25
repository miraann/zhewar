import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

// Origins the Capacitor WebView may use when making JS fetch() calls.
const CORS_ORIGINS = ['https://zhewar.shop', 'capacitor://localhost', 'https://localhost', 'http://localhost'];

function buildCorsHeaders(origin: string | null) {
  const allowed = origin && CORS_ORIGINS.includes(origin) ? origin : null;
  if (!allowed) return {} as Record<string, string>;
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':     'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods':     'GET, POST, PATCH, DELETE, OPTIONS',
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const cors   = buildCorsHeaders(origin);
  const isApi  = request.nextUrl.pathname.startsWith('/api/');

  // Answer CORS preflights immediately (no auth needed for OPTIONS).
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const token     = process.env.ADMIN_TOKEN ?? '';
  const cookieVal = request.cookies.get('admin_session')?.value ?? '';
  const headerVal = request.headers.get('X-Admin-Token') ?? '';
  const authed    = token && (safeEqual(cookieVal, token) || safeEqual(headerVal, token));

  if (!authed) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Attach CORS headers to every authenticated response so the WebView
  // can read the body of cross-origin API calls.
  const response = NextResponse.next();
  Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/((?!login|logout).*)'],
};
