'use client';

import { supabase } from '@/lib/supabase';
import type { GalleryPhoto } from '@/lib/types';
import { Check, ImageIcon, Loader2, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EditState {
  id: string;
  caption: string;
  photo_url: string;
}

export default function GalleryEditor() {
  const [photos, setPhotos]       = useState<GalleryPhoto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [caption, setCaption]     = useState('');
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState('');
  const [editing, setEditing]     = useState<EditState | null>(null);
  const [saving, setSaving]       = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [editError, setEditError] = useState('');
  const fileRef                   = useRef<HTMLInputElement>(null);
  const editFileRef               = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_photos').select('*').order('sort_order');
    if (data) setPhotos(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function nextOrder() {
    return photos.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
  }

  async function insertPhoto(photoUrl: string) {
    const { data } = await supabase
      .from('gallery_photos')
      .insert({ photo_url: photoUrl, caption: caption.trim() || null, sort_order: nextOrder() })
      .select()
      .single();
    if (data) setPhotos((prev) => [...prev, data]);
    setCaption('');
    await fetch('/api/revalidate', { method: 'POST' });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAddError('');
    setAdding(true);
    for (const file of files) {
      const ext  = file.name.split('.').pop();
      const path = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
      if (uploadErr) { setAddError(uploadErr.message); break; }
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      await insertPhoto(data.publicUrl);
    }
    setAdding(false);
    e.target.value = '';
  }

  async function handleDelete(id: string) {
    await supabase.from('gallery_photos').delete().eq('id', id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch('/api/revalidate', { method: 'POST' });
  }

  async function handleReplacePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setEditError('');
    setReplacing(true);
    const ext  = file.name.split('.').pop();
    const path = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (uploadErr) {
      setEditError(uploadErr.message);
    } else {
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setEditing((prev) => prev ? { ...prev, photo_url: data.publicUrl } : prev);
    }
    setReplacing(false);
    e.target.value = '';
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    await supabase.from('gallery_photos').update({
      photo_url: editing.photo_url,
      caption:   editing.caption.trim() || null,
    }).eq('id', editing.id);
    setPhotos((prev) => prev.map((p) =>
      p.id === editing.id
        ? { ...p, photo_url: editing.photo_url, caption: editing.caption.trim() || null }
        : p
    ));
    await fetch('/api/revalidate', { method: 'POST' });
    setEditing(null);
    setSaving(false);
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-neutral-900 font-semibold text-lg">گەلەری</h2>
        <p className="text-neutral-400 text-sm mt-0.5">کۆکراوەی وێنەی کارەکانت بەڕێوە ببە</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <p className="text-amber-700 text-xs tracking-wider font-medium">زیادکردنی وێنە</p>

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="پێناس (ئارەزوومەند)"
          className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm placeholder-neutral-400 outline-none focus:border-amber-400 transition-colors"
        />

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={adding}
          className={[
            'w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all touch-manipulation',
            adding
              ? 'border-amber-300 bg-amber-50/50 cursor-not-allowed'
              : 'border-neutral-300 bg-white active:bg-neutral-50',
          ].join(' ')}
        >
          {adding
            ? <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            : <Upload className="w-7 h-7 text-neutral-400" />
          }
          <span className="text-neutral-500 text-sm">{adding ? 'بارکردن...' : 'کرتە بکە بۆ هەڵبژاردنی وێنە'}</span>
          {!adding && <span className="text-neutral-400 text-xs">دەکرێت چەند وێنەیەک لەکاتێکدا هەڵبژێریت</span>}
        </button>

        {addError && <p className="text-red-500 text-xs">{addError}</p>}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <ImageIcon className="w-9 h-9 text-neutral-300" />
          <p className="text-neutral-400 text-sm"> هیچ وێنەیەک نییە</p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm" style={{ aspectRatio: '3/4' }}>
              <img src={photo.photo_url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {photo.caption && (
                <p className="absolute bottom-2 right-2 left-8 text-white text-[0.65rem] font-medium truncate">{photo.caption}</p>
              )}
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 active:text-red-400 touch-manipulation transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setEditError(''); setEditing({ id: photo.id, caption: photo.caption ?? '', photo_url: photo.photo_url }); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 active:text-amber-400 touch-manipulation transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setEditing(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full md:w-[380px] bg-white rounded-t-3xl md:rounded-3xl px-5 pt-4 pb-8 md:pb-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle (mobile only) */}
            <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-4 md:hidden" />

            <p className="text-neutral-900 font-semibold text-sm text-center mb-4">دەستکاریکردنی وێنە</p>

            {/* Preview — 3/4 ratio, constrained width, centered */}
            <div className="flex justify-center mb-4">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 w-40" style={{ aspectRatio: '3/4' }}>
                <img src={editing.photo_url} alt="" className="w-full h-full object-cover" />
                {replacing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  </div>
                )}
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleReplacePhoto} />
                <button
                  onClick={() => editFileRef.current?.click()}
                  disabled={replacing}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[0.6rem] font-medium touch-manipulation whitespace-nowrap"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  گۆڕینی وێنە
                </button>
              </div>
            </div>

            {editError && <p className="text-red-500 text-xs mb-2 text-center">{editError}</p>}

            {/* Caption */}
            <div className="mb-4">
              <p className="text-neutral-400 text-xs mb-1.5">پێناس (ئارەزوومەند)</p>
              <input
                type="text"
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(null); }}
                placeholder="پێناس بنووسە..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm placeholder-neutral-400 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3.5 rounded-xl border border-neutral-200 text-neutral-500 font-medium text-sm touch-manipulation active:bg-neutral-50 transition-colors"
              >
                گەڕانەوە
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || replacing}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-semibold text-sm touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                پاشەکەوت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
