import { timingSafeEqual } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
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

// Distributed rate limit: 5 attempts per 60 seconds per IP across all instances
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60s'),
  prefix: 'rl:admin-login',
});

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const { success, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'rate_limited', secondsLeft, remaining },
      { status: 429 },
    );
  }

  const { password } = await request.json();

  if (!password || !safeCompare(password, process.env.ADMIN_PASSWORD ?? '')) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_session', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return res;
}
