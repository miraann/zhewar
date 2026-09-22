'use client';

import { useEffect } from 'react';
import { registerAdminFcmToken } from '@/lib/pushNotifications';

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
          try {
            await registerAdminFcmToken(fcmToken);
          } catch (e) {
            console.error('FCM token registration request failed', e);
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM registration error', err);
        });

        // Tapping a notification opens the pending appointments tab directly
        PushNotifications.addListener('pushNotificationActionPerformed', () => {
          window.location.href = '/admin/dashboard?tab=appointments-pending';
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
