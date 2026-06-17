import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookie = cookies().get('fb_auth');
  if (!cookie) return NextResponse.json(null);

  try {
    const data = JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf-8'));
    const res  = NextResponse.json(data);
    // Consume the cookie — clear it after one read
    res.cookies.set('fb_auth', '', { maxAge: 0, path: '/' });
    return res;
  } catch {
    return NextResponse.json(null);
  }
}
