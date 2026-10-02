import { adminFetch } from './adminFetch';

// Navigate instead of fetch so the cookie is sent with the request
// (Capacitor WebView doesn't send cookies in JS fetch() calls).
// The GET handler on /api/admin/logout clears the cookie and redirects.
export function adminLogout() {
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
