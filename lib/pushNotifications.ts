// Shared helpers for registering/removing this device's FCM token with the
// server. Used by both the silent auto-register on dashboard mount
// (PushNotificationInit) and the manual status/retry control in Settings.

export const FCM_TOKEN_KEY = 'fcm_token';

export function isNativePlatform(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function registerAdminFcmToken(fcmToken: string): Promise<void> {
  const adminToken = localStorage.getItem('admin_token') ?? '';
  const res = await fetch('https://zhewar.shop/api/admin/fcm-token', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
    },
    body: JSON.stringify({ token: fcmToken }),
  });
  if (!res.ok) throw new Error(`fcm-token POST failed: ${res.status}`);
  localStorage.setItem(FCM_TOKEN_KEY, fcmToken);
}

export async function unregisterAdminFcmToken(): Promise<void> {
  const token = localStorage.getItem(FCM_TOKEN_KEY);
  localStorage.removeItem(FCM_TOKEN_KEY);
  if (!token) return;

  const adminToken = localStorage.getItem('admin_token') ?? '';
  await fetch('https://zhewar.shop/api/admin/fcm-token', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
    },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}
