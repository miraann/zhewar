import { adminFetch } from './adminFetch';

// First revoke the session server-side with a fetch that carries the
// X-Admin-Token header — the APK's WebView may have lost its cookie, and the
// token is then the only thing naming its session. Then navigate, which
// always sends the cookie: the GET handler on /api/admin/logout revokes and
// clears it and redirects.
export async function adminLogout() {
  await adminFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem('admin_token');
  window.location.href = '/api/admin/logout';
}

export function isAdminApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// The APK stays signed in until the admin taps logout. This gives its
// session cookie a fresh 400-day life, and the X-Admin-Token header sets
// the cookie again if the WebView lost it.
export function renewAppSession(): Promise<Response> {
  return adminFetch('/api/admin/session', { method: 'POST' });
}
