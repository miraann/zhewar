import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminSession';

// The site's own origins. The APK loads the live site (capacitor.config.ts
// server.url), so its requests come from these too — nothing else is let in.
const TRUSTED_ORIGINS = ['https://zhewar.shop', 'https://www.zhewar.shop'];

// Admin API routes that work without a session
const PUBLIC_API = new Set(['/api/admin/login', '/api/admin/logout']);
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !TRUSTED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin':      origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':     'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods':     'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
}

// Browsers send Origin on every non-GET request, so a write whose Origin
// isn't this site came from another site's page riding on the admin's
// session (CSRF) — or from a non-browser client, which has no business here.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !!origin && (origin === request.nextUrl.origin || TRUSTED_ORIGINS.includes(origin));
}

// Admin pages get a strict per-request CSP: scripts only run with this
// response's nonce (Next.js adds it to its own scripts), so injected markup —
// or a javascript: link — can't execute where the admin session lives. The
// APK's Capacitor bridge is injected by the WebView itself
// (addDocumentStartJavaScript), which a page's CSP doesn't apply to.
function adminCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== 'production';
  return [
    "default-src 'self'",
    // Dev only: React Refresh needs eval
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
    "font-src 'self'",
    `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_ORIGIN.replace(/^https:/, 'wss:')}`,
    "worker-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const cors  = corsHeaders(request.headers.get('origin'));

  // Answer CORS preflights immediately (no auth needed for OPTIONS).
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  if (STATE_CHANGING.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: cors });
  }

  // The route handlers check the session again themselves; this keeps
  // the dashboard page itself behind the login too.
  const needsSession = isApi ? !PUBLIC_API.has(pathname) : pathname.startsWith('/admin/dashboard');
  if (needsSession) {
    let authed = false;
    try {
      authed = !!(await requireAdmin(request));
    } catch (e) {
      console.error('[middleware] session store unavailable', e);
      if (isApi) return NextResponse.json({ error: 'service_unavailable' }, { status: 503, headers: cors });
    }
    if (!authed) {
      if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (isApi) {
    const response = NextResponse.next();
    Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // Admin page: Next.js reads the nonce from the request's CSP header
  const nonce = btoa(crypto.randomUUID());
  const csp   = adminCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/revalidate', '/api/customer-cleanup'],
};
