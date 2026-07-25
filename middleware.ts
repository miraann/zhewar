import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-runtime-safe timing-safe string comparison (no Node.js crypto needed)
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

export function middleware(request: NextRequest) {
  const token = process.env.ADMIN_TOKEN ?? '';

  // Accept auth from cookie (web browser) or X-Admin-Token header (Capacitor
  // WebView — JS fetch() doesn't send httpOnly cookies across origins).
  const cookieVal = request.cookies.get('admin_session')?.value ?? '';
  const headerVal = request.headers.get('X-Admin-Token') ?? '';
  const authed = token && (safeEqual(cookieVal, token) || safeEqual(headerVal, token));

  if (!authed) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all admin routes EXCEPT the login endpoint itself
  matcher: ['/admin/dashboard/:path*', '/api/admin/((?!login).*)'],
};
