'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, Loader2, HelpCircle, AlertCircle, CheckCircle2, Home, ScanFace, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';
import LiveCameraCapture from './LiveCameraCapture';

// Re-compress to a capped JPEG before uploading (guards against large inputs)
function compressDataUrl(dataUrl: string, maxPx = 240, quality = 0.60): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const cv  = document.createElement('canvas');
      cv.width  = w;
      cv.height = h;
      cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bin  = atob(b64);
  const arr  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

interface Props {
  onComplete: (customer: Customer) => void;
}

export default function CustomerRegistration({ onComplete }: Props) {
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [photoUrl, setPhotoUrl]         = useState('');
  const [fbId, setFbId]                 = useState('');
  const [messengerUrl, setMessengerUrl] = useState('');
  const [showHelp, setShowHelp]         = useState(false);
  const [pasted, setPasted]             = useState(false);
  const [fetchingFb, setFetchingFb]     = useState(false);
  const [fbFetched, setFbFetched]       = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [alertMsg, setAlertMsg]         = useState('');
  const [showCamera, setShowCamera]     = useState(false);
  const [notes, setNotes]               = useState('');
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);
  const [faceScanEnabled, setFaceScanEnabled]   = useState(true);
  const [facebookRequired, setFacebookRequired] = useState(true);
  const [regStep, setRegStep]           = useState<'scan' | 'form'>('form');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/facebook/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        if (data.name)  setName(data.name);
        if (data.photo) setPhotoUrl(data.photo);
        if (data.id)    setFbId(data.id);
      })
      .catch(() => {});

    supabase.from('barber_profile').select('logo_url, face_scan_enabled, facebook_required').single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
        if (typeof data?.face_scan_enabled === 'boolean') {
          setFaceScanEnabled(data.face_scan_enabled);
          if (data.face_scan_enabled) setRegStep('scan');
        }
        if (typeof data?.facebook_required === 'boolean') setFacebookRequired(data.facebook_required);
      });
  }, []);

  function toFbUrl(raw: string): string {
    const s = raw.trim();
    if (!s) return '';
    // m.me links
    const mme = s.match(/m\.me\/([^/?&#\s]+)/);
    if (mme) return `https://m.me/${mme[1]}`;
    // Any facebook.com URL (profiles, share links, etc.) — keep full URL as-is
    if (s.includes('facebook.com') || s.includes('fb.com')) {
      return s.startsWith('http') ? s : `https://${s}`;
    }
    // Plain numeric ID
    if (/^\d+$/.test(s)) return `https://www.facebook.com/profile.php?id=${s}`;
    // Plain username
    if (/^[a-zA-Z0-9._]+$/.test(s)) return `https://www.facebook.com/${s}`;
    return '';
  }

  async function fetchFromFb(url: string) {
    if (!url.includes('facebook') && !url.includes('fb.com') && !url.includes('m.me')) return;
    setFetchingFb(true);
    try {
      const res  = await fetch(`/api/fb-preview?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.name  && !name)     setName(data.name);
      if (data.photo && !photoUrl) setPhotoUrl(data.photo);
      if (data.name || data.photo) setFbFetched(true);
    } catch {}
    setFetchingFb(false);
  }

  async function handleCameraCapture(dataUrl: string) {
    setShowCamera(false);
    setUploading(true);
    const compressed = await compressDataUrl(dataUrl);
    setPhotoUrl(compressed);
    setRegStep('form');
    const blob = dataUrlToBlob(compressed);
    const path = `customer-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('customer_photos')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (!uploadErr) {
      const { data } = supabase.storage.from('customer_photos').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const compressed = await compressDataUrl(dataUrl);
      setPhotoUrl(compressed);
      const blob = dataUrlToBlob(compressed);
      const path = `customer-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('customer_photos')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!uploadErr) {
        const { data } = supabase.storage.from('customer_photos').getPublicUrl(path);
        setPhotoUrl(data.publicUrl);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!name.trim())                  { setError('تکایە ناوی خۆت بنووسە');                     return; }
    if (name.trim().length > 60)       { setError('ناو زۆر درێژە (زیاتر لە ٦٠ پیت)');             return; }
    if (!phone.trim())                 { setError('تکایە ژمارەی مۆبایلت بنووسە');               return; }
    if (!/^\+?[0-9\s\-]{7,20}$/.test(phone.trim())) { setError('ژمارەی تەلەفۆن دروست نییە');      return; }
    if (facebookRequired && !messengerUrl.trim()) {
      setAlertMsg('بۆ پێشەکەش کردنی داواکاری پێویستە لینکی فەیسبووک یاخود مێسینجەر هاوپێج بکەیت');
      return;
    }
    setError('');
    setSaving(true);
    let saved: Customer | null = null;
    try {
      const res = await fetch('/api/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:    name.trim(),
          phone_number: phone.trim(),
          photo_url:    photoUrl || null,
          facebook_id:  fbId || messengerUrl.trim() || null,
          notes:        notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.id) saved = json as Customer;
    } catch {}
    setSaving(false);
    if (saved) {
      try {
        localStorage.setItem('luxe_customer', JSON.stringify(saved));
        localStorage.setItem('luxe_registered', '1');
      } catch {}
      onComplete(saved);
    } else {
      setError('هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-10">

      {/* Custom alert modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMsg('')} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-100 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" />
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-blue-500" />
              </div>
              {/* Message */}
              <p className="text-slate-800 font-semibold text-sm leading-relaxed">{alertMsg}</p>
              {/* Button */}
              <button
                onClick={() => setAlertMsg('')}
                className="w-full h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation shadow-md shadow-blue-200/60"
              >
                باشە، تێگەیشتم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating glass card */}
      <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="text-right">
          <style>{`@keyframes regRingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <div className="flex items-center justify-between mb-4">
            {/* Shop logo — spinning red/blue ring */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
                  animation: 'regRingRotate 4s linear infinite',
                }}
              />
              <div className="absolute inset-[2.5px] rounded-full bg-white">
                <div className="absolute inset-[2px] rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  {logoUrl
                    ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-blue-600 text-base">✂</span>
                  }
                </div>
              </div>
            </div>

            {/* Home button */}
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm active:bg-slate-50 active:scale-95 transition-all touch-manipulation"
            >
              <Home className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
          <h1 className="text-[1.75rem] font-bold text-slate-900 leading-tight">بەخێربێیت</h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            زانیارییەکانت داخڵ بکە بۆ تۆمارکردنی کاتی سەردانیکردن
          </p>
        </div>

        {/* ── STEP 1: Face scan ─────────────────────────────────────── */}
        {regStep === 'scan' ? (
          <>
            {showCamera && (
              <LiveCameraCapture
                onCapture={handleCameraCapture}
                onCancel={() => setShowCamera(false)}
              />
            )}

            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-28 h-28 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center">
                {uploading
                  ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  : <ScanFace className="w-12 h-12 text-blue-400" />
                }
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-slate-900 font-semibold text-base">سکانی ڕووخسارت بکە</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  پێش داخڵکردنی زانیاریەکانت، تکایە وێنەی ڕووخسارت تۆمار بکە
                </p>
              </div>
              <button
                onClick={() => setShowCamera(true)}
                disabled={uploading}
                className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-sm touch-manipulation active:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-200/70 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ScanFace className="w-5 h-5" />
                {uploading ? 'بارکردن...' : 'سکانی ڕووخسار'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── STEP 2: Form ──────────────────────────────────────────── */}

            {/* Photo section */}
            {faceScanEnabled ? (
              /* After face scan: read-only avatar with retake */
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-blue-200 shadow-sm bg-blue-50 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-blue-300" />
                    )}
                  </div>
                  {photoUrl && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md border-2 border-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setRegStep('scan')}
                  className="mt-1.5 flex items-center gap-1 text-blue-500 text-xs font-medium touch-manipulation active:text-blue-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  گۆڕینی وێنە
                </button>
              </div>
            ) : (
              /* Face scan off: optional file/camera upload */
              <div className="flex flex-col items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="relative w-20 h-20 rounded-full border-2 border-dashed border-blue-300 bg-blue-50/40 flex items-center justify-center overflow-hidden touch-manipulation active:scale-[0.96] transition-transform"
                >
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-1.5">
                        <Camera className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </>
                  ) : uploading ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 text-[0.55rem] font-semibold">وێنەی خۆت</span>
                    </div>
                  )}
                </button>
                <p className="text-slate-400 text-xs mt-1.5">وێنەی ڕووخسارت زیاد بکە (ئارەزوومەند)</p>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-3.5">

              {/* Name */}
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="ناوی تەواو"
                  className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl pr-12 pl-4 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 focus:bg-white transition-all"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="+964 7XX XXX XXXX"
                  dir="ltr"
                  className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl pr-12 pl-4 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 focus:bg-white transition-all text-right"
                />
              </div>

              {/* Facebook / Messenger */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="flex items-center gap-1 text-blue-600 text-xs font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    چۆن بدۆزمەوە؟
                  </button>
                  <span className="text-slate-700 text-xs font-medium">
                    فەیسبووک{' '}
                    {facebookRequired
                      ? <span className="text-red-500">*</span>
                      : <span className="text-slate-400">(ئارەزوومەند)</span>}
                  </span>
                </div>
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1877F2]/50">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <input
                      type="url"
                      value={messengerUrl}
                      onChange={(e) => { setMessengerUrl(e.target.value); setPasted(false); setFbFetched(false); }}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        if (!raw) return;
                        const normalized = toFbUrl(raw);
                        if (!normalized) {
                          setError('تکایە لینکی تەواوی فەیسبووک یان مێسینجەر پەیست بکە');
                          setMessengerUrl('');
                          return;
                        }
                        if (normalized !== raw) setMessengerUrl(normalized);
                        fetchFromFb(normalized);
                      }}
                      placeholder="https://facebook.com/username"
                      dir="ltr"
                      className={[
                        'w-full h-14 rounded-2xl pr-12 pl-8 text-sm outline-none transition-all',
                        fbFetched
                          ? 'bg-emerald-50 border border-emerald-300 text-slate-900 placeholder-slate-400'
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1877F2]/60 focus:bg-white',
                      ].join(' ')}
                    />
                    {fetchingFb && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      </span>
                    )}
                    {fbFetched && !fetchingFb && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[0.65rem] font-bold">✓</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const url  = toFbUrl(text.trim());
                        if (!url) {
                          setError('تکایە لینکی تەواوی فەیسبووک یان مێسینجەر پەیست بکە');
                          return;
                        }
                        setMessengerUrl(url);
                        setPasted(true);
                        await fetchFromFb(url);
                      } catch {
                        setShowHelp(true);
                      }
                    }}
                    className="px-5 h-14 rounded-2xl bg-[#1877F2] text-white text-sm font-bold touch-manipulation active:scale-[0.97] transition-transform shadow-md shadow-blue-200/60 whitespace-nowrap flex-shrink-0"
                  >
                    پەیست
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">ئارەزوومەند</span>
                  <span className="text-slate-700 text-xs font-medium">تێبینی</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={100}
                  rows={3}
                  placeholder="ئایا تێبینییەکت هەیە؟ وەک جۆری مووی، خواستەکانت…"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 focus:bg-white transition-all resize-none leading-relaxed"
                  dir="rtl"
                />
                {notes.length > 70 && (
                  <p className="text-slate-400 text-[0.65rem] text-left mt-1">{notes.length}/100</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-xs text-right px-1 flex items-center justify-end gap-1.5">
                  ⚠ {error}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={[
                'w-full h-14 rounded-2xl font-bold text-base transition-all touch-manipulation select-none',
                saving
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-200/70 active:bg-blue-700 active:scale-[0.98]',
              ].join(' ')}
            >
              <span className="flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> چاوەڕوانبە...</>
                  : 'دەستپێبکە ←'
                }
              </span>
            </button>
          </>
        )}
      </div>

      {/* Help bottom sheet */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <div className="w-14 h-14 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#1877F2]">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-bold text-lg text-center mb-1">چۆن لینکەکە بدۆزیتەوە؟</h3>
            <p className="text-slate-400 text-xs text-center mb-6">    </p>
            <div className="space-y-3 text-right" dir="rtl">
              {[
                { n: '١', text: 'ئەپی فەیسبووک بکەرەوە' },
                { n: '٢', text: 'بڕۆ بۆ بەشی پرۆفایل' },
                { n: '٣', text: '     کلیک لەسەر "COPY PROFILE LINK"بکە' },
                { n: '٤', text: 'پاشان بگەرێوە ئێرە و دوگمەی "پەیست" دابگرە' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
                  <span className="text-slate-600 text-sm">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a
                href="https://www.facebook.com/me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#1877F2] text-white touch-manipulation active:scale-[0.97] transition-transform"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-xs font-bold">فەیسبووک</span>
              </a>
            </div>
            <p className="text-slate-400 text-[0.65rem] text-center mt-3" dir="rtl">
              کلیک لەسەر ئایکۆنی فەیسبووک بکە بۆ کردنەوەی پرۆفایلەکەت
            </p>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-sm touch-manipulation active:scale-[0.98] transition-transform"
            >
              داخستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
