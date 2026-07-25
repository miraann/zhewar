import { NextResponse } from 'next/server';

// POST: called via fetch from web browsers (cookie present, works fine)
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_session');
  return res;
}

// GET: called via window.location.href from Capacitor WebView where
// JS fetch() doesn't send cookies. A top-level navigation always sends
// cookies, so this handler reliably clears the session and redirects.
export async function GET() {
  const res = NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zhewar.shop'));
  res.cookies.delete('admin_session');
  return res;
}
