'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BarberProfile } from '@/lib/types';
import { Save, Loader2, Instagram, Facebook, MessageCircle, Music2, MapPin, Map, User, Upload, X } from 'lucide-react';

type EditableFields = Omit<BarberProfile, 'id' | 'updated_at'>;

const SOCIAL_FIELDS: { key: keyof EditableFields; label: string; icon: React.ElementType; placeholder: string }[] = [
  { key: 'instagram_url',   label: 'بەستەری ئینستاگرام', icon: Instagram,     placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook_url',    label: 'بەستەری فەیسبوک',   icon: Facebook,      placeholder: 'https://facebook.com/yourpage'    },
  { key: 'whatsapp_number', label: 'ژمارەی واتسئاپ',    icon: MessageCircle, placeholder: '+9647501234567'                   },
  { key: 'tiktok_url',      label: 'بەستەری تیکتۆک',    icon: Music2,        placeholder: 'https://tiktok.com/@yourhandle'   },
  { key: 'maps_url',        label: 'بەستەری گوگڵ مەپس', icon: Map,           placeholder: 'https://maps.google.com/?q=...'   },
];

const DEFAULT: EditableFields = {
  name: '', tagline: '', logo_url: '', address: '',
  instagram_url: '', facebook_url: '', whatsapp_number: '', tiktok_url: '', maps_url: '',
};

export default function ProfileEditor() {
  const [form, setForm]       = useState<EditableFields>(DEFAULT);
  const [id, setId]           = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    supabase.from('barber_profile').select('*').single().then(({ data }) => {
      if (data) {
        setId(data.id);
        const { id: _id, updated_at: _u, ...fields } = data as BarberProfile;
        setForm(fields);
      }
      setLoading(false);
    });
  }, []);

  function set(key: keyof EditableFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/admin/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...form }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setSaveError(json.error ?? 'پاشەکەوتکردن سەرکەوتوو نەبوو');
    } else {
      await fetch('/api/revalidate', { method: 'POST' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (loading) return <Skeleton />;

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h2 className="text-white font-semibold text-lg">پرۆفایلی دوکان</h2>
        <p className="text-white/35 text-sm mt-0.5">زانیاری خۆت نوێ بکەرەوە</p>
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <Label>ناسنامە</Label>
        <LogoUpload
          value={form.logo_url ?? ''}
          onChange={(v) => set('logo_url', v)}
        />
        <Field icon={User}   label="ناوی دوکان" value={form.name}         onChange={(v) => set('name', v)}    placeholder="بەربەری لوکس"    />
        <Field icon={User}   label="ووردەپیت"  value={form.tagline ?? ''} onChange={(v) => set('tagline', v)} placeholder="چاکسازی بەرز..." />
        <Field icon={MapPin} label="ناونیشان"  value={form.address ?? ''} onChange={(v) => set('address', v)} placeholder="کوڕە سەرەکی، شار" />
      </div>

      {/* Social links */}
      <div className="space-y-3">
        <Label>بەستەرەکانی تۆڕی کۆمەڵایەتی</Label>
        {SOCIAL_FIELDS.map(({ key, label, icon, placeholder }) => (
          <Field key={key} icon={icon} label={label} value={(form[key] as string) ?? ''} onChange={(v) => set(key, v)} placeholder={placeholder} />
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={[
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all touch-manipulation',
          saved
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_30px_rgba(245,158,11,0.25)] active:scale-[0.98]',
        ].join(' ')}
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> پاشەکەوتکردن...</>
          : saved
            ? '✓ پرۆفایل پاشەکەوتکرا!'
            : <><Save className="w-4 h-4" /> پرۆفایل پاشەکەوت بکە</>
        }
      </button>
      {saveError && (
        <p className="text-red-400 text-xs text-center bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
          ⚠️ {saveError}
        </p>
      )}
    </div>
  );
}

function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (uploadErr) {
      setError(uploadErr.message);
    } else {
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <p className="text-white/35 text-xs mb-1.5">وێنەی لۆگۆ</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
          <img src={value} alt="لۆگۆ" className="w-14 h-14 rounded-full object-cover border border-amber-500/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-xs truncate">{value.split('/').pop()}</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1.5 flex items-center gap-1.5 text-amber-400 text-xs font-medium touch-manipulation"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'بارکردن...' : 'گۆڕینی وێنە'}
            </button>
          </div>
          <button onClick={() => onChange('')} className="text-white/20 active:text-red-400 transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border border-dashed border-white/10 bg-white/3 active:bg-white/5 transition-colors touch-manipulation"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            : <Upload className="w-6 h-6 text-white/25" />
          }
          <span className="text-white/25 text-xs">
            {uploading ? 'بارکردن...' : 'کرتە بکە بۆ بارکردنی لۆگۆ'}
          </span>
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-amber-400/60 text-[0.65rem] tracking-wider font-medium">{children}</p>;
}

function Field({
  icon: Icon, label, value, onChange, placeholder,
}: {
  icon: React.ElementType; label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <p className="text-white/35 text-xs mb-1.5">{label}</p>
      <div className="relative">
        <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-6 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-white/5 border border-white/8 animate-pulse" />
      ))}
    </div>
  );
}
