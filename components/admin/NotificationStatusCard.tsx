'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { FCM_TOKEN_KEY, isNativePlatform, registerAdminFcmToken, unregisterAdminFcmToken } from '@/lib/pushNotifications';

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
    unsupported: { text: 'تەنها لە ئەپدا', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    enabled:     { text: 'چالاکە',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    disabled:    { text: 'ناچالاکە',      cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    denied:      { text: 'ڕێگەنەدراوە',   cls: 'bg-red-50 text-red-600 border-red-200/50' },
    error:       { text: 'هەڵە',          cls: 'bg-red-50 text-red-600 border-red-200/50' },
  }[status];

  return (
    <div className={[
      'rounded-2xl border-2 p-5 transition-all duration-200 bg-white',
      isEnabled ? 'border-blue-200 shadow-sm' : 'border-slate-100',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={[
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
            isEnabled ? 'bg-blue-50' : 'bg-slate-100',
          ].join(' ')}>
            <Bell className={`w-5 h-5 ${isEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${isEnabled ? 'text-slate-900' : 'text-slate-400'}`}>ئاگادارکردنەوەی نوێ</p>
            <p className="text-slate-400 text-xs mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
        <button
          onClick={isEnabled ? handleDisable : handleEnable}
          disabled={busy || !interactive}
          className={[
            'relative w-12 h-6 rounded-full transition-colors duration-200 touch-manipulation flex-shrink-0',
            (busy || !interactive) ? 'opacity-60 cursor-not-allowed' : '',
            isEnabled ? 'bg-blue-600' : 'bg-slate-200',
          ].join(' ')}
        >
          <span className={[
            'absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-200',
            isEnabled ? 'left-7 bg-white' : 'left-1 bg-white',
          ].join(' ')} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {busy ? (
          <span className="flex items-center gap-1.5 text-[0.7rem] text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            جێبەجێکردن...
          </span>
        ) : badge ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border ${badge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : status === 'denied' || status === 'error' ? 'bg-red-500' : 'bg-slate-400'}`} />
            {badge.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
