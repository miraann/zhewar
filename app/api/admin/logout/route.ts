import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, clearAdminSessionCookie, revokeAdminSession } from '@/lib/adminSession';

// Deletes the sessions this request carries from the store, so the ids stop
// working everywhere — not just in this browser. The cookie is cleared even
// if the store can't be reached.
async function revoke(ids: (string | null | undefined)[]) {
  try {
    await Promise.all(ids.map(revokeAdminSession));
  } catch (e) {
    console.error('[admin-logout] revoke failed', e);
  }
}

// POST: called via fetch (adminLogout) with the APK's X-Admin-Token header,
// which revokes its session even when the WebView has lost the cookie.
export async function POST(req: NextRequest) {
  await revoke([req.cookies.get(ADMIN_COOKIE)?.value, req.headers.get('x-admin-token')]);
  const res = NextResponse.json({ success: true });
  clearAdminSessionCookie(res);
  return res;
}

// GET: the navigation adminLogout ends with. A top-level navigation always
// sends cookies, so this reliably clears the cookie and redirects.
export async function GET(req: NextRequest) {
  await revoke([req.cookies.get(ADMIN_COOKIE)?.value]);
  const res = NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zhewar.shop'));
  clearAdminSessionCookie(res);
  return res;
}
