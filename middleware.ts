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
  const session = request.cookies.get('admin_session');
  const token   = process.env.ADMIN_TOKEN ?? '';

  if (!token || !session?.value || !safeEqual(session.value, token)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
};
