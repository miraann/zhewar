import type { NextResponse } from 'next/server';

// A browser session ends after 8 hours. The APK's lasts until the admin taps
// logout: 400 days is the longest Chromium (and so the Android WebView) lets
// a cookie live, and the app renews it on every launch via
// /api/admin/session, so it never runs out while the app is in use.
const BROWSER_MAX_AGE = 60 * 60 * 8;
const APP_MAX_AGE     = 60 * 60 * 24 * 400;

export function setAdminSessionCookie(res: NextResponse, app: boolean) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('admin_session', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    // SameSite=None is only valid when Secure is also set — required for the
    // cross-origin Capacitor WebView request in production, but on plain
    // http://localhost dev, Secure=false + SameSite=None makes browsers
    // reject the cookie outright, so the session never gets stored.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: app ? APP_MAX_AGE : BROWSER_MAX_AGE,
    path: '/',
  });
}
