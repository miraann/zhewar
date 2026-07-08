'use client';

import { useState, useEffect } from 'react';
import { Loader2, ScanFace, Facebook } from 'lucide-react';

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
    fetch('/api/admin/settings')
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
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error();
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !next }));
      setError('پاشەکەوتکردن سەرکەوتوو نەبوو');
    }
    setSavingKey(null);
  }

  if (loading) return <Skeleton />;

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">ڕێکخستنەکان</h2>
        <p className="text-slate-500 text-sm mt-0.5">ڕووکارەکانی بوکینگ بەڕێوە ببە</p>
      </div>

      <ToggleCard
        icon={ScanFace}
        label="سکانی ڕووخسار"
        descOn="کڕیار دەتوانێت وێنەی ڕووخساری خۆی تۆمار بکات لە کاتی تۆمارکردن"
        descOff="بەشی وێنەی ڕووخسار شاراوەتەوە لە فۆرمی تۆمارکردن"
        value={settings.face_scan_enabled}
        saving={savingKey === 'face_scan_enabled'}
        saved={savedKey  === 'face_scan_enabled'}
        error={savingKey === null && savedKey === null ? error : ''}
        onToggle={() => handleToggle('face_scan_enabled')}
      />

      <ToggleCard
        icon={Facebook}
        label="فەیسبووک / مێسینجەر"
        descOn="داخڵکردنی بەستەری فەیسبووک پێویستە بۆ تۆمارکردنی کاتی سەردانیکردن"
        descOff="بەستەری فەیسبووک ئارەزوومەندە — کڕیار دەتوانێت بەبێ تۆمارکردنیشی پێشبکەوێت"
        value={settings.facebook_required}
        saving={savingKey === 'facebook_required'}
        saved={savedKey  === 'facebook_required'}
        error={savingKey === null && savedKey === null ? error : ''}
        onToggle={() => handleToggle('facebook_required')}
      />
    </div>
  );
}

function ToggleCard({
  icon: Icon, label, descOn, descOff, value, saving, saved, error, onToggle,
}: {
  icon: React.ElementType; label: string; descOn: string; descOff: string;
  value: boolean; saving: boolean; saved: boolean; error: string;
  onToggle: () => void;
}) {
  return (
    <div className={[
      'rounded-2xl border-2 p-5 transition-all duration-200 bg-white',
      value ? 'border-blue-200 shadow-sm' : 'border-slate-100',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={[
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
            value ? 'bg-blue-50' : 'bg-slate-100',
          ].join(' ')}>
            <Icon className={`w-5 h-5 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${value ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
            <p className="text-slate-400 text-xs mt-0.5 leading-snug">{value ? descOn : descOff}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={saving}
          className={[
            'relative w-12 h-6 rounded-full transition-colors duration-200 touch-manipulation flex-shrink-0',
            saving ? 'opacity-60 cursor-not-allowed' : '',
            value ? 'bg-blue-600' : 'bg-slate-200',
          ].join(' ')}
        >
          <span className={[
            'absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-200',
            value ? 'left-7 bg-white' : 'left-1 bg-white',
          ].join(' ')} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {saving ? (
          <span className="flex items-center gap-1.5 text-[0.7rem] text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            پاشەکەوتکردن...
          </span>
        ) : saved ? (
          <span className="text-[0.7rem] text-emerald-600 font-semibold">✓ پاشەکەوتکرا</span>
        ) : error ? (
          <span className="text-[0.7rem] text-red-500">{error}</span>
        ) : (
          <span className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold',
            value
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              : 'bg-slate-100 text-slate-500 border border-slate-200',
          ].join(' ')}>
            <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {value ? 'پێویستە' : 'ئارەزوومەندە'}
          </span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-6 space-y-3">
      <div className="h-5 w-32 rounded-lg bg-slate-100 animate-pulse" />
      <div className="h-24 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
    </div>
  );
}
