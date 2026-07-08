'use client';

import { useState, useEffect } from 'react';
import { Loader2, ScanFace } from 'lucide-react';

export default function SettingsEditor() {
  const [faceScan, setFaceScan] = useState(true);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { setFaceScan(d.face_scan_enabled ?? true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    const next = !faceScan;
    setFaceScan(next);
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_scan_enabled: next }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setFaceScan(!next);
      setError('پاشەکەوتکردن سەرکەوتوو نەبوو');
    }
    setSaving(false);
  }

  if (loading) return <Skeleton />;

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">ڕێکخستنەکان</h2>
        <p className="text-slate-500 text-sm mt-0.5">ڕووکارەکانی بوکینگ بەڕێوە ببە</p>
      </div>

      {/* Face scan toggle card */}
      <div className={[
        'rounded-2xl border-2 p-5 transition-all duration-200 bg-white',
        faceScan ? 'border-blue-200 shadow-sm' : 'border-slate-100',
      ].join(' ')}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={[
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              faceScan ? 'bg-blue-50' : 'bg-slate-100',
            ].join(' ')}>
              <ScanFace className={`w-5 h-5 ${faceScan ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${faceScan ? 'text-slate-900' : 'text-slate-400'}`}>
                سکانی ڕووخسار
              </p>
              <p className="text-slate-400 text-xs mt-0.5 leading-snug">
                {faceScan
                  ? 'کڕیار دەتوانێت وێنەی ڕووخساری خۆی تۆمار بکات لە کاتی تۆمارکردن'
                  : 'بەشی وێنەی ڕووخسار شاراوەتەوە لە فۆرمی تۆمارکردن'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={saving}
            className={[
              'relative w-12 h-6 rounded-full transition-colors duration-200 touch-manipulation flex-shrink-0',
              saving ? 'opacity-60 cursor-not-allowed' : '',
              faceScan ? 'bg-blue-600' : 'bg-slate-200',
            ].join(' ')}
          >
            <span className={[
              'absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-200',
              faceScan ? 'left-7 bg-white' : 'left-1 bg-white',
            ].join(' ')} />
          </button>
        </div>

        {/* Status pill */}
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
              faceScan
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-500 border border-slate-200',
            ].join(' ')}>
              <span className={`w-1.5 h-1.5 rounded-full ${faceScan ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {faceScan ? 'چالاکە' : 'ناچالاکە'}
            </span>
          )}
        </div>
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
