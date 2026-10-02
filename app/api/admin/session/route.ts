import { NextResponse } from 'next/server';
import { setAdminSessionCookie } from '@/lib/adminSession';

// The APK calls this on every launch. middleware.ts has already checked the
// session cookie or the X-Admin-Token header, so reaching here means the
// admin is signed in: re-issue the cookie with a fresh 400-day life. When
// the WebView lost the cookie, the token header alone gets it back.
export async function POST() {
  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, true);
  return res;
}
