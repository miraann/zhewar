'use client';

import { useState, useEffect } from 'react';
import { ScanFace, Facebook, LogOut } from 'lucide-react';
import NotificationStatusCard from './NotificationStatusCard';
import ToggleListItem, { StatusBadge, SavingIndicator } from './ui/ToggleListItem';
import Skeleton from './ui/Skeleton';
import { adminLogout } from '@/lib/adminAuth';

interface Settings {
  face_scan_enabled: boolean;
  facebook_required: boolean;
}

export default function SettingsEditor() {
  const [settings, setSettings] = useState<Settings>({ face_scan_enabled: true, facebook_required: true });
  const [loading, setLoading]   = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Settings | null>(null);
  const [savedKey,  setSavedKey]  = useState<keyof Settings | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    const token = localStorage.getItem('admin_token') ?? '';
    fetch(
      isCapacitor ? 'https://zhewar.shop/api/admin/settings' : '/api/admin/settings',
      {
        ...(isCapacitor ? { credentials: 'include' } : {}),
        headers: token ? { 'X-Admin-Token': token } : {},
      },
    )
      .then((r) => r.json())
      .then((d) => setSettings({ face_scan_enabled: d.face_scan_enabled ?? true, facebook_required: d.facebook_required ?? true }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: keyof Settings) {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    setSavingKey(key);
    setSavedKey(null);
    setError('');
    try {
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const token = localStorage.getItem('admin_token') ?? '';
      const res = await fetch(
        isCapacitor ? 'https://zhewar.shop/api/admin/settings' : '/api/admin/settings',
        {
          method: 'POST',
          ...(isCapacitor ? { credentials: 'include' } : {}),
          headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Admin-Token': token } : {}) },
          body: JSON.stringify({ [key]: next }),
        },
      );
      if (!res.ok) throw new Error();
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !next }));
      setError('پاشەکەوتکردن سەرکەوتوو نەبوو');
    }
    setSavingKey(null);
  }

  function statusNode(key: keyof Settings, offLabel?: string) {
    if (savingKey === key) return <SavingIndicator />;
    if (savedKey === key) return <StatusBadge text="✓ پاشەکەوتکرا" tone="success" />;
    if (savingKey === null && savedKey === null && error) return <span className="text-[0.7rem] text-md-error">{error}</span>;
    return settings[key]
      ? <StatusBadge text="پێویستە" tone="success" />
      : <StatusBadge text={offLabel ?? 'ئارەزوومەندە'} tone="neutral" />;
  }

  if (loading) return <div className="px-4 py-6"><Skeleton variant="text" className="w-32" /><div className="mt-3"><Skeleton count={2} /></div></div>;

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-md-on-surface font-semibold text-lg">ڕێکخستنەکان</h2>
        <p className="text-md-on-surface-variant text-sm mt-0.5">ڕووکارەکانی بوکینگ بەڕێوە ببە</p>
      </div>

      <ToggleListItem
        icon={ScanFace}
        label="سکانی ڕووخسار"
        description={settings.face_scan_enabled
          ? 'کڕیار دەتوانێت وێنەی ڕووخساری خۆی تۆمار بکات لە کاتی تۆمارکردن'
          : 'بەشی وێنەی ڕووخسار شاراوەتەوە لە فۆرمی تۆمارکردن'}
        value={settings.face_scan_enabled}
        disabled={savingKey === 'face_scan_enabled'}
        statusNode={statusNode('face_scan_enabled')}
        onToggle={() => handleToggle('face_scan_enabled')}
      />

      <ToggleListItem
        icon={Facebook}
        label="فەیسبووک / مێسینجەر"
        description={settings.facebook_required
          ? 'داخڵکردنی بەستەری فەیسبووک پێویستە بۆ تۆمارکردنی کاتی سەردانیکردن'
          : 'بەشی بەستەری فەیسبووک شاراوەتەوە لە فۆرمی تۆمارکردن'}
        value={settings.facebook_required}
        disabled={savingKey === 'facebook_required'}
        statusNode={statusNode('facebook_required', 'شاراوەتەوە')}
        onToggle={() => handleToggle('facebook_required')}
      />

      <NotificationStatusCard />

      <button
        onClick={adminLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-md-lg text-md-error font-semibold text-sm active:bg-md-error-container/60 transition-colors touch-manipulation"
      >
        <LogOut className="w-[18px] h-[18px]" />
        دەرچوون
      </button>
    </div>
  );
}
