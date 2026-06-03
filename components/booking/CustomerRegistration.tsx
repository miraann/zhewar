'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, User, Phone, Loader2, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface Props {
  onComplete: (customer: Customer) => void;
}

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export default function CustomerRegistration({ onComplete }: Props) {
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [photoUrl, setPhotoUrl]   = useState('');
  const [fbId, setFbId]           = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Read Facebook profile from OAuth redirect cookie
  useEffect(() => {
    const match = document.cookie.split('; ').find((r) => r.startsWith('fb_auth='));
    if (!match) return;
    try {
      const data = JSON.parse(atob(match.split('=')[1]));
      if (data.name)  setName(data.name);
      if (data.photo) setPhotoUrl(data.photo);
      if (data.id)    setFbId(data.id);
    } catch {}
    document.cookie = 'fb_auth=; max-age=0; path=/';
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `customer-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (!name.trim())  { setError('تکایە ناوی خۆت بنووسە');       return; }
    if (!phone.trim()) { setError('تکایە ژمارەی مۆبایلت بنووسە'); return; }
    setError('');
    setSaving(true);
    const { data, error: dbErr } = await supabase
      .from('customers')
      .upsert(
        { full_name: name.trim(), phone_number: phone.trim(), photo_url: photoUrl || null, facebook_id: fbId || null },
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
    <div className="flex flex-col min-h-screen bg-white px-5 pt-10 pb-10">

      {/* Header */}
      <div className="text-right mb-7">
        <div className="flex items-center justify-end mb-5">
          <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm">
            <Scissors className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        <h1 className="text-[1.75rem] font-bold text-neutral-900 leading-tight">بەخێربێیت</h1>
        <p className="text-neutral-500 text-sm mt-1.5 leading-relaxed">
          زانیارییەکانت داخڵ بکە بۆ تۆمارکردنی کاتی سەردانیکردن
        </p>
      </div>

      {/* Facebook button */}
      {FB_APP_ID && (
        <>
          <a
            href="/api/auth/facebook"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#1877F2] text-white font-bold text-base touch-manipulation select-none transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(24,119,242,0.35)]"
          >
            <FacebookIcon className="w-5 h-5" />
            بەفەیسبووک داخڵ بە
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-neutral-400 text-xs font-medium">یان</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>
        </>
      )}

      {/* Photo upload */}
      <div className="flex flex-col items-center mb-6">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative w-24 h-24 rounded-full border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center overflow-hidden touch-manipulation active:scale-[0.96] transition-transform shadow-sm"
        >
          {photoUrl ? (
            <>
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/25 flex items-end justify-center pb-2">
                <Camera className="w-5 h-5 text-white drop-shadow" />
              </div>
            </>
          ) : uploading ? (
            <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Camera className="w-6 h-6 text-amber-400" />
              <span className="text-amber-500 text-[0.6rem] font-semibold">وێنەی خۆت</span>
            </div>
          )}
        </button>
        <p className="text-neutral-400 text-xs mt-2">ئارەزوومەند</p>
      </div>

      {/* Form inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-neutral-500 text-xs mb-1.5 text-right">
            ناوی تەواو <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="ناوی تەواوی خۆت بنووسە"
              className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl pr-10 pl-4 py-4 text-neutral-900 text-sm placeholder-neutral-400 outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-500 text-xs mb-1.5 text-right">
            ژمارەی مۆبایل <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="+964 7XX XXX XXXX"
              dir="ltr"
              className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl pr-10 pl-4 py-4 text-neutral-900 text-sm placeholder-neutral-400 outline-none focus:border-amber-400 transition-colors text-right"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-right px-1">{error}</p>}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || uploading}
        className={[
          'w-full py-[18px] rounded-2xl font-bold text-base mt-8 transition-all touch-manipulation select-none',
          saving || uploading
            ? 'bg-amber-400 text-white cursor-not-allowed'
            : 'bg-amber-500 text-white shadow-[0_0_32px_rgba(245,158,11,0.4),0_4px_16px_rgba(245,158,11,0.25)] active:scale-[0.98]',
        ].join(' ')}
      >
        {saving
          ? <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> چاوەڕوانبە...
            </span>
          : 'دەستپێبکە ←'}
      </button>
    </div>
  );
}
