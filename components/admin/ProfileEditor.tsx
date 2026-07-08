'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BarberProfile } from '@/lib/types';
import { Save, Loader2, Instagram, Facebook, MessageCircle, Music2, MapPin, Map, User, Upload, X } from 'lucide-react';

type EditableFields = Omit<BarberProfile, 'id' | 'updated_at' | 'face_scan_enabled'>;

const SOCIAL_FIELDS: { key: keyof EditableFields; label: string; icon: React.ElementType; iconColor: string; placeholder: string }[] = [
  { key: 'instagram_url',   label: 'بەستەری ئینستاگرام', icon: Instagram,     iconColor: 'text-pink-500',    placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook_url',    label: 'بەستەری فەیسبوک',   icon: Facebook,      iconColor: 'text-blue-600',    placeholder: 'https://facebook.com/yourpage'    },
  { key: 'whatsapp_number', label: 'ژمارەی واتسئاپ',    icon: MessageCircle, iconColor: 'text-emerald-500', placeholder: '+9647501234567'                   },
  { key: 'tiktok_url',      label: 'بەستەری تیکتۆک',    icon: Music2,        iconColor: 'text-slate-700',   placeholder: 'https://tiktok.com/@yourhandle'   },
  { key: 'maps_url',        label: 'بەستەری گوگڵ مەپس', icon: Map,           iconColor: 'text-amber-500',   placeholder: 'https://maps.google.com/?q=...'   },
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
        <h2 className="text-slate-900 font-semibold text-lg">پرۆفایلی دوکان</h2>
        <p className="text-slate-500 text-sm mt-0.5">زانیارییەکانت نوێ بکەرەوە</p>
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <Label>ناسنامە</Label>
        <LogoUpload
          value={form.logo_url ?? ''}
          onChange={(v) => set('logo_url', v)}
        />
        <Field icon={User}   iconColor="text-blue-500"  label="ناوی دوکان" value={form.name}         onChange={(v) => set('name', v)}    placeholder="ژێوار محمد"    />
        <Field icon={User}   iconColor="text-violet-500" label="بایۆ"  value={form.tagline ?? ''} onChange={(v) => set('tagline', v)} placeholder="چاکسازی بەرز..." />
        <Field icon={MapPin} iconColor="text-rose-500"  label="ناونیشان"  value={form.address ?? ''} onChange={(v) => set('address', v)} placeholder="کوڕە سەرەکی، شار" />
      </div>

      {/* Social links */}
      <div className="space-y-3">
        <Label>بەستەرەکانی تۆڕی کۆمەڵایەتی</Label>
        {SOCIAL_FIELDS.map(({ key, label, icon, iconColor, placeholder }) => (
          <Field key={key} icon={icon} iconColor={iconColor} label={label} value={(form[key] as string) ?? ''} onChange={(v) => set(key, v)} placeholder={placeholder} />
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={[
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all touch-manipulation',
          saved
            ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700'
            : 'bg-blue-600 text-white shadow-md shadow-blue-200/60 active:bg-blue-700 active:scale-[0.98]',
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
        <p className="text-red-600 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
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
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', 'uploads');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'هەڵەی بارکردن');
    } else {
      const { url } = await res.json();
      onChange(url);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <p className="text-slate-700 text-xs font-medium mb-1.5">وێنەی لۆگۆ</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
          <img src={value} alt="لۆگۆ" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs truncate">{value.split('/').pop()}</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1.5 flex items-center gap-1.5 text-blue-600 text-xs font-medium touch-manipulation"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'بارکردن...' : 'گۆڕینی وێنە'}
            </button>
          </div>
          <button onClick={() => onChange('')} className="text-slate-300 active:text-red-500 transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            : <Upload className="w-6 h-6 text-slate-400" />
          }
          <span className="text-slate-400 text-xs">
            {uploading ? 'بارکردن...' : 'کرتە بکە بۆ بارکردنی لۆگۆ'}
          </span>
        </button>
      )}

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-500 text-[0.65rem] tracking-wider font-semibold">{children}</p>;
}

function Field({
  icon: Icon, iconColor = 'text-slate-400', label, value, onChange, placeholder,
}: {
  icon: React.ElementType; iconColor?: string; label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <p className="text-slate-700 text-xs font-medium mb-1.5">{label}</p>
      <div className="relative">
        <Icon className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor} pointer-events-none`} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-6 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 border border-slate-200 animate-pulse" />
      ))}
    </div>
  );
}
