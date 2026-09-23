'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { FCM_TOKEN_KEY, isNativePlatform, registerAdminFcmToken, unregisterAdminFcmToken } from '@/lib/pushNotifications';
import ToggleListItem, { StatusBadge, SavingIndicator } from './ui/ToggleListItem';

type Status = 'checking' | 'unsupported' | 'enabled' | 'disabled' | 'denied' | 'error';

export default function NotificationStatusCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    async function check() {
      if (!isNativePlatform()) { setStatus('unsupported'); return; }
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'denied') { setStatus('denied'); return; }
        const hasToken = !!localStorage.getItem(FCM_TOKEN_KEY);
        setStatus(perm.receive === 'granted' && hasToken ? 'enabled' : 'disabled');
      } catch {
        setStatus('error');
      }
    }
    check();
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      await PushNotifications.createChannel({
        id: 'bookings',
        name: 'بوکینگی نوێ',
        importance: 5,
        sound: 'default',
        vibration: true,
        visibility: 1,
      });

      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        setStatus(perm.receive === 'denied' ? 'denied' : 'disabled');
        return;
      }

      const fcmToken = await new Promise<string>((resolve, reject) => {
        PushNotifications.addListener('registration', ({ value }) => resolve(value));
        PushNotifications.addListener('registrationError', (err) => reject(err));
        PushNotifications.register();
      });

      await registerAdminFcmToken(fcmToken);
      setStatus('enabled');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await unregisterAdminFcmToken();
      setStatus('disabled');
    } finally {
      setBusy(false);
    }
  }

  const isEnabled = status === 'enabled';
  const interactive = status === 'enabled' || status === 'disabled';

  const desc = {
    checking:    'پشکنینی دۆخی ئاگادارکردنەوە...',
    unsupported: 'ئەم دۆخە تەنها لە ئەپی ئەندرۆیدا بەردەستە، نەک وێبگەڕ',
    enabled:     'ئەم مۆبایلە ئاگادار دەکرێتەوە لە کاتی داواکاری تۆمارکردنی نوێ',
    disabled:    'ئاگادارکردنەوە ناچالاکە — بۆ چالاککردنی داگرە',
    denied:      'مۆڵەت ڕەتکراوەتەوە — لە ڕێکخستنەکانی ئەندرۆید مۆڵەتی ئاگادارکردنەوە بدە بەم ئەپە',
    error:       'هەڵەیەک ڕوویدا لە پشکنین یان تۆمارکردن — دووبارە هەوڵبدەوە',
  }[status];

  const badge = {
    checking:    null,
    unsupported: { text: 'تەنها لە ئەپدا', tone: 'neutral' as const },
    enabled:     { text: 'چالاکە',        tone: 'success' as const },
    disabled:    { text: 'ناچالاکە',      tone: 'neutral' as const },
    denied:      { text: 'ڕێگەنەدراوە',   tone: 'error'   as const },
    error:       { text: 'هەڵە',          tone: 'error'   as const },
  }[status];

  return (
    <ToggleListItem
      icon={Bell}
      label="ئاگادارکردنەوەی نوێ"
      description={desc}
      value={isEnabled}
      disabled={busy || !interactive}
      onToggle={isEnabled ? handleDisable : handleEnable}
      statusNode={busy ? <SavingIndicator label="جێبەجێکردن..." /> : badge ? <StatusBadge text={badge.text} tone={badge.tone} /> : null}
    />
  );
}
