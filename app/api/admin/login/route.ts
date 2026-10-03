import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, setAdminSessionCookie } from '@/lib/adminSession';
import { checkRateLimit, getRequestIp, rateLimitResponse } from '@/lib/rateLimit';

// Hashed first, so the comparison takes the same time whatever the length
function passwordMatches(given: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(await checkRateLimit('admin-login', getRequestIp(request), 5, '60 s'));
  if (limited) return limited;

  // `app` is true when the login comes from the APK, which stays signed in
  // until the admin taps logout.
  const { password, app } = (await request.json().catch(() => ({}))) as { password?: unknown; app?: unknown };
  if (typeof password !== 'string' || !password || !passwordMatches(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  let session;
  try {
    session = await createAdminSession(app === true);
  } catch (e) {
    console.error('[admin-login] session store unavailable', e);
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  // Only the APK gets the session id in the body: its WebView doesn't send
  // cookies with JS fetch(), so it keeps the id in localStorage and sends it
  // as X-Admin-Token. Browsers hold it only in the httpOnly cookie.
  const res = NextResponse.json(session.app ? { success: true, token: session.sid } : { success: true });
  setAdminSessionCookie(res, session);
  return res;
}
