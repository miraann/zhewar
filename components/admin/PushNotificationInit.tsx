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

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async ({ value: token }) => {
          await fetch('/api/admin/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM registration error', err);
        });

        // Tapping a notification while app is open — navigate to appointments tab
        PushNotifications.addListener('pushNotificationActionPerformed', () => {
          window.location.href = '/admin/dashboard?tab=appointments';
        });
      } catch (e) {
        console.error('Push init error', e);
      }
    }
    init();
  }, []);

  return null;
}
