// fetch() for the admin API routes. Inside the Capacitor APK the WebView
// doesn't send the session cookie with JS fetch() calls, so requests carry
// the X-Admin-Token header instead (see middleware.ts). The APK loads the
// live site, so relative paths reach whichever host (www or not) served it.
export function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
  const token = localStorage.getItem('admin_token') ?? '';
  return fetch(path, {
    ...init,
    ...(isCapacitor ? { credentials: 'include' } : {}),
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Admin-Token': token } : {}),
    },
  });
}
