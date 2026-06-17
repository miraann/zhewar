import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

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
