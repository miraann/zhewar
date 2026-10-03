import { Redis } from '@upstash/redis';
import type { NextRequest, NextResponse } from 'next/server';

// Admin sessions are random ids kept in Upstash Redis, so every login gets its
// own credential that logout (or expiry) really revokes. Redis only holds a
// SHA-256 of each id, so a dump of it doesn't hand out live sessions.
//
// Used from both middleware.ts (Edge runtime) and Node route handlers, so it
// sticks to Web Crypto rather than node:crypto.
//
// A browser session ends after 8 hours. The APK's lasts until the admin taps
// logout: 400 days is the longest Chromium (and so the Android WebView) lets
// a cookie live, and the app renews it on every launch via
// /api/admin/session, so it never runs out while the app is in use.

export const ADMIN_COOKIE = 'admin_session';
const BROWSER_MAX_AGE = 60 * 60 * 8;
const APP_MAX_AGE     = 60 * 60 * 24 * 400;
// 32 random bytes, base64url — anything else is rejected without a Redis call
const SID_RE = /^[A-Za-z0-9_-]{43}$/;

export interface AdminSession {
  sid: string;
  app: boolean;
}

let _redis: Redis | null = null;
function redis(): Redis {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !url.startsWith('https') || !token) {
    throw new Error('Admin sessions need UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

async function sessionKey(sid: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sid));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `admin_sess:${hex}`;
}

function newSid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const maxAge = (app: boolean) => (app ? APP_MAX_AGE : BROWSER_MAX_AGE);

export async function createAdminSession(app: boolean): Promise<AdminSession> {
  const sid = newSid();
  await redis().set(await sessionKey(sid), app ? 'app' : 'web', { ex: maxAge(app) });
  return { sid, app };
}

export async function getAdminSession(sid: string | null | undefined): Promise<AdminSession | null> {
  if (!sid || !SID_RE.test(sid)) return null;
  const kind = await redis().get<string>(await sessionKey(sid));
  return kind ? { sid, app: kind === 'app' } : null;
}

// Restarts the session's lifetime (the APK calls this on every launch)
export async function renewAdminSession(session: AdminSession): Promise<void> {
  await redis().expire(await sessionKey(session.sid), maxAge(session.app));
}

export async function revokeAdminSession(sid: string | null | undefined): Promise<void> {
  if (!sid || !SID_RE.test(sid)) return;
  await redis().del(await sessionKey(sid));
}

// The admin session behind this request, from the session cookie or — for
// the APK, whose WebView doesn't send cookies with JS fetch() — the
// X-Admin-Token header. Every admin route calls this itself, so none of them
// relies on middleware.ts having run.
export async function requireAdmin(req: NextRequest): Promise<AdminSession | null> {
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const header = req.headers.get('x-admin-token');
  const fromCookie = await getAdminSession(cookie);
  if (fromCookie) return fromCookie;
  if (header && header !== cookie) return getAdminSession(header);
  return null;
}

export function setAdminSessionCookie(res: NextResponse, session: AdminSession) {
  res.cookies.set(ADMIN_COOKIE, session.sid, {
    httpOnly: true,
    // Secure needs https, which plain http://localhost dev doesn't have
    secure: process.env.NODE_ENV === 'production',
    // The admin panel only ever calls its own origin — the APK too, since it
    // loads the live site — so the cookie never needs to travel cross-site,
    // and Lax stops other sites from sending requests that carry it (CSRF).
    sameSite: 'lax',
    maxAge: maxAge(session.app),
    path: '/',
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
}
