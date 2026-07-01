import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

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

// In-memory rate limit: 1 attempt per 60 seconds per IP
const RATE_MS = 60_000;
const lastAttempt = new Map<string, number>();

export async function POST(request: NextRequest) {
  const ip  = getIp(request);
  const now = Date.now();
  const last = lastAttempt.get(ip) ?? 0;
  const waitMs = last + RATE_MS - now;

  if (waitMs > 0) {
    return NextResponse.json(
      { error: 'rate_limited', secondsLeft: Math.ceil(waitMs / 1000) },
      { status: 429 },
    );
  }

  const { password } = await request.json();

  // Record attempt before password check to prevent parallel brute-force
  lastAttempt.set(ip, now);

  // Prevent unbounded memory growth
  if (lastAttempt.size > 500) {
    const cutoff = now - RATE_MS;
    lastAttempt.forEach((t, key) => {
      if (t < cutoff) lastAttempt.delete(key);
    });
  }

  if (!password || !safeCompare(password, process.env.ADMIN_PASSWORD ?? '')) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_session', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
