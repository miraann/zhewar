'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { GalleryPhoto } from '@/lib/types';
import { Plus, Trash2, ImageIcon, Loader2, Upload, Link as LinkIcon } from 'lucide-react';

type AddMode = 'upload' | 'url';

export default function GalleryEditor() {
  const [photos, setPhotos]     = useState<GalleryPhoto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<AddMode>('upload');
  const [url, setUrl]           = useState('');
  const [caption, setCaption]   = useState('');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef                 = useRef<HTMLInputElement>(null);

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
    setError('');
    setAdding(true);
    for (const file of files) {
      const ext  = file.name.split('.').pop();
      const path = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
      if (uploadErr) {
        setError(uploadErr.message);
        break;
      }
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      await insertPhoto(data.publicUrl);
    }
    setAdding(false);
    e.target.value = '';
  }

  async function handleAddUrl() {
    if (!url.trim()) return;
    setAdding(true);
    await insertPhoto(url.trim());
    setUrl('');
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('gallery_photos').delete().eq('id', id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch('/api/revalidate', { method: 'POST' });
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-white font-semibold text-lg">گالری</h2>
        <p className="text-neutral-500 text-sm mt-0.5">کۆکراوەی وێنەی کارەکانت بەڕێوە ببە</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3">
        <p className="text-amber-400/80 text-xs tracking-wider font-medium">زیادکردنی وێنە</p>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <button
            onClick={() => setMode('upload')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation',
              mode === 'upload' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400',
            ].join(' ')}
          >
            <Upload className="w-3.5 h-3.5" />
            بارکردن
          </button>
          <button
            onClick={() => setMode('url')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation',
              mode === 'url' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400',
            ].join(' ')}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            بەستەر
          </button>
        </div>

        {/* Caption (shared) */}
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="پێناس (ئارەزوومەند)"
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-700 outline-none focus:border-amber-500/50 transition-colors"
        />

        {mode === 'upload' ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={adding}
              className={[
                'w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all touch-manipulation',
                adding
                  ? 'border-amber-500/40 bg-amber-500/[0.06] cursor-not-allowed'
                  : 'border-white/20 bg-white/[0.03] active:bg-white/[0.06]',
              ].join(' ')}
            >
              {adding
                ? <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                : <Upload className="w-7 h-7 text-neutral-500" />
              }
              <span className="text-neutral-500 text-sm">
                {adding ? 'بارکردن...' : 'کرتە بکە بۆ هەڵبژاردنی وێنە'}
              </span>
              {!adding && <span className="text-neutral-700 text-xs">دەکرێت چەند وێنەیەک لەکاتێکدا هەڵبژێریت</span>}
            </button>
          </>
        ) : (
          <>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… (بەستەری وێنە)"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-700 outline-none focus:border-amber-500/50 transition-colors"
            />
            <button
              onClick={handleAddUrl}
              disabled={!url.trim() || adding}
              className={[
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all touch-manipulation',
                !url.trim() || adding
                  ? 'bg-white/[0.05] text-neutral-600 border border-white/[0.07] cursor-not-allowed'
                  : 'bg-amber-500 text-neutral-950 active:scale-[0.98]',
              ].join(' ')}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              زیادکردن بۆ گالری
            </button>
          </>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <ImageIcon className="w-9 h-9 text-neutral-700" />
          <p className="text-neutral-600 text-sm">هنوکا هیچ وێنەیەک نییە</p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-2xl overflow-hidden border border-white/[0.07]" style={{ aspectRatio: '3/4' }}>
              <img src={photo.photo_url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {photo.caption && (
                <p className="absolute bottom-2 right-2 left-8 text-white text-[0.65rem] font-medium truncate">{photo.caption}</p>
              )}
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 active:text-red-400 touch-manipulation transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
