// Shared helpers for registering/removing this device's FCM token with the
// server. Used by both the silent auto-register on dashboard mount
// (PushNotificationInit) and the manual status/retry control in Settings.

import { NOTIFICATION_SOUNDS, soundChannelId, soundResource } from '@/lib/notificationSounds';

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

// Android 8+ silently drops notifications whose channel doesn't exist, and a
// channel's sound is fixed once created — so there is one channel per sound
// and the server posts to the one picked in Settings. Re-creating an existing
// channel keeps its settings, so this is safe to call on every launch.
export async function ensureNotificationChannels(): Promise<void> {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  // The original single channel, superseded by the per-sound ones below
  await PushNotifications.deleteChannel({ id: 'bookings' }).catch(() => {});

  for (const s of NOTIFICATION_SOUNDS) {
    const resource = soundResource(s.id);
    await PushNotifications.createChannel({
      id: soundChannelId(s.id),
      name: `بوکینگی نوێ — ${s.label}`,
      importance: 5,
      ...(resource ? { sound: `${resource}.wav` } : {}),
      vibration: true,
      visibility: 1,
    });
  }
}
