'use client';

import { useEffect } from 'react';

export default function PushNotificationInit() {
  useEffect(() => {
    async function init() {
      // Only runs inside the Capacitor Android WebView
      const cap = (window as any).Capacitor;
      if (!cap?.isNativePlatform?.()) return;

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Add listeners BEFORE calling register() to avoid the race condition
        // where the registration event fires before the listener is attached.
        PushNotifications.addListener('registration', async ({ value: fcmToken }) => {
          const adminToken = localStorage.getItem('admin_token') ?? '';
          await fetch('https://zhewar.shop/api/admin/fcm-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
            },
            body: JSON.stringify({ token: fcmToken }),
          });
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM registration error', err);
        });

        // Tapping a notification while app is open — navigate to appointments tab
        PushNotifications.addListener('pushNotificationActionPerformed', () => {
          window.location.href = '/admin/dashboard?tab=appointments';
        });

        // Android 8+ requires a notification channel to exist or notifications
        // are silently dropped. The channelId must match what the server sends.
        await PushNotifications.createChannel({
          id: 'bookings',
          name: 'بوکینگی نوێ',
          importance: 5,
          sound: 'default',
          vibration: true,
          visibility: 1,
        });

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();
      } catch (e) {
        console.error('Push init error', e);
      }
    }
    init();
  }, []);

  return null;
}
