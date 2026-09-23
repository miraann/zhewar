'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BarberProfile } from '@/lib/types';
import { Save, Loader2, Instagram, Facebook, MessageCircle, Music2, MapPin, Map, User, Upload, X } from 'lucide-react';
import TextField, { FieldLabel } from './ui/TextField';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

type EditableFields = Omit<BarberProfile, 'id' | 'updated_at' | 'face_scan_enabled' | 'facebook_required'>;

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

  if (loading) return <div className="px-4 py-6"><Skeleton variant="row" count={6} /></div>;

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h2 className="text-md-on-surface font-semibold text-lg">پرۆفایلی دوکان</h2>
        <p className="text-md-on-surface-variant text-sm mt-0.5">زانیارییەکانت نوێ بکەرەوە</p>
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <FieldLabel>ناسنامە</FieldLabel>
        <LogoUpload
          value={form.logo_url ?? ''}
          onChange={(v) => set('logo_url', v)}
        />
        <TextField icon={User}   iconColor="text-blue-500"   label="ناوی دوکان" value={form.name}         onChange={(v) => set('name', v)}    placeholder="ژێوار عزیز"    />
        <TextField icon={User}   iconColor="text-violet-500" label="بایۆ"  value={form.tagline ?? ''} onChange={(v) => set('tagline', v)} placeholder="چاکسازی بەرز..." />
        <TextField icon={MapPin} iconColor="text-rose-500"   label="ناونیشان"  value={form.address ?? ''} onChange={(v) => set('address', v)} placeholder="کوڕە سەرەکی، شار" />
      </div>

      {/* Social links */}
      <div className="space-y-3">
        <FieldLabel>بەستەرەکانی تۆڕی کۆمەڵایەتی</FieldLabel>
        {SOCIAL_FIELDS.map(({ key, label, icon, iconColor, placeholder }) => (
          <TextField key={key} icon={icon} iconColor={iconColor} label={label} value={(form[key] as string) ?? ''} onChange={(v) => set(key, v)} placeholder={placeholder} />
        ))}
      </div>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} variant={saved ? 'success' : 'filled'}>
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> پاشەکەوتکردن...</>
          : saved
            ? '✓ پرۆفایل پاشەکەوتکرا!'
            : <><Save className="w-4 h-4" /> پرۆفایل پاشەکەوت بکە</>
        }
      </Button>
      {saveError && (
        <p className="text-md-on-error-container text-xs text-center bg-md-error-container border border-md-error/20 rounded-md-md px-4 py-3">
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
      <p className="text-md-on-surface text-xs font-medium mb-1.5">وێنەی لۆگۆ</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-md-sm border border-md-outline bg-md-surface-container">
          <img src={value} alt="لۆگۆ" className="w-14 h-14 rounded-full object-cover border-2 border-md-primary-container flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-md-on-surface-variant text-xs truncate">{value.split('/').pop()}</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1.5 flex items-center gap-1.5 text-md-primary text-xs font-medium touch-manipulation"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'بارکردن...' : 'گۆڕینی وێنە'}
            </button>
          </div>
          <button onClick={() => onChange('')} className="text-md-on-surface-variant active:text-md-error transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-md-sm border-2 border-dashed border-md-outline bg-md-surface-container-high active:bg-md-surface-container-highest transition-colors touch-manipulation"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 text-md-primary animate-spin" />
            : <Upload className="w-6 h-6 text-md-on-surface-variant" />
          }
          <span className="text-md-on-surface-variant text-xs">
            {uploading ? 'بارکردن...' : 'کرتە بکە بۆ بارکردنی لۆگۆ'}
          </span>
        </button>
      )}

      {error && <p className="text-md-error text-xs mt-1.5">{error}</p>}
    </div>
  );
}
