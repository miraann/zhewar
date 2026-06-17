'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';

function compressImage(file: File, maxPx = 400, quality = 0.78): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w      = Math.round(img.width  * scale);
      const h      = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.src = url;
  });
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
  }, []);

  function toFbUrl(raw: string): string {
    const s = raw.trim();
    if (!s) return '';
    const mme = s.match(/m\.me\/([^/?&#\s]+)/);
    if (mme) return `https://m.me/${mme[1]}`;
    const fb = s.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&#\s]+)/);
    if (fb) return `https://www.facebook.com/${fb[1]}`;
    if (s.startsWith('http')) return s;
    if (/^\d+$/.test(s)) return `https://www.facebook.com/profile.php?id=${s}`;
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

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file);
    const path = `customer-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (!uploadErr) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (!name.trim())                  { setError('تکایە ناوی خۆت بنووسە');                     return; }
    if (name.trim().length > 60)       { setError('ناو زۆر درێژە (زیاتر لە ٦٠ پیت)');             return; }
    if (!phone.trim())                 { setError('تکایە ژمارەی مۆبایلت بنووسە');               return; }
    if (!/^\+?[0-9\s\-]{7,20}$/.test(phone.trim())) { setError('ژمارەی تەلەفۆن درست نییە');      return; }
    if (!messengerUrl.trim())          { setError('تکایە لینکی فەیسبووک یان مێسینجەرت بنووسە'); return; }
    setError('');
    setSaving(true);
    const { data, error: dbErr } = await supabase
      .from('customers')
      .upsert(
        { full_name: name.trim(), phone_number: phone.trim(), photo_url: photoUrl || null, facebook_id: fbId || messengerUrl.trim() || null },
        { onConflict: 'phone_number' },
      )
      .select()
      .single();
    setSaving(false);
    if (data && !dbErr) {
      try {
        localStorage.setItem('luxe_customer', JSON.stringify(data));
        localStorage.setItem('luxe_registered', '1');
      } catch {}
      onComplete(data as Customer);
    } else {
      setError('هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-10">

      {/* Floating glass card */}
      <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="text-right">
          <div className="flex items-center justify-end mb-4">
            <div
              className="w-10 h-10 rounded-2xl p-[2px] flex-shrink-0"
              style={{
                background:
                  'conic-gradient(#ef4444 0deg,#ef4444 120deg,#f8fafc 145deg,#3b82f6 170deg,#3b82f6 300deg,#f8fafc 325deg,#ef4444 360deg)',
              }}
            >
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
                <span className="text-blue-600 text-lg">✂</span>
              </div>
            </div>
          </div>
          <h1 className="text-[1.75rem] font-bold text-slate-900 leading-tight">بەخێربێیت</h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            زانیارییەکانت داخڵ بکە بۆ تۆمارکردنی کاتی سەردانیکردن
          </p>
        </div>

        {/* Photo upload */}
        <div className="flex flex-col items-center">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden touch-manipulation active:scale-[0.96] transition-transform"
          >
            {photoUrl ? (
              <>
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-1.5">
                  <Camera className="w-4 h-4 text-white drop-shadow" />
                </div>
              </>
            ) : uploading ? (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400 text-[0.55rem] font-semibold">وێنەی خۆت</span>
              </div>
            )}
          </button>
          <p className="text-slate-400 text-xs mt-1.5">ئارەزوومەند</p>
        </div>

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
                فەیسبووک / مێسینجەر <span className="text-red-500">*</span>
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
          disabled={saving || uploading}
          className={[
            'w-full h-14 rounded-2xl font-bold text-base transition-all touch-manipulation select-none',
            saving || uploading
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
            <p className="text-slate-400 text-xs text-center mb-6">پەیوەندیت پێوە بکەین بە ئاسانی</p>
            <div className="space-y-3 text-right" dir="rtl">
              {[
                { n: '١', text: 'ئەپی فەیسبووک یان مێسینجەر بکەرەوە' },
                { n: '٢', text: 'بچۆ بۆ پرۆفایلەکەت' },
                { n: '٣', text: 'لینکەکە لە بارێکی ناونیشان کۆپی بکە' },
                { n: '٤', text: 'گەڕەوە ئێرە و دوگمەی "پەیست" بپەڕێنە' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
                  <span className="text-slate-600 text-sm">{text}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
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
              <a
                href="https://www.messenger.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 py-4 rounded-2xl text-white touch-manipulation active:scale-[0.97] transition-transform"
                style={{ background: 'linear-gradient(135deg,#00B2FF,#7B5FF2)' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
                </svg>
                <span className="text-xs font-bold">مێسینجەر</span>
              </a>
            </div>
            <p className="text-slate-400 text-[0.65rem] text-center mt-3" dir="rtl">
              کرتە بکە بچۆ، لینکەکە کۆپی بکە، گەڕەوە پەیست بکە
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
