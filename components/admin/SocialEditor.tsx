'use client';

import { supabase } from '@/lib/supabase';
import type { SocialLink } from '@/lib/types';
import { Check, Link as LinkIcon, Loader2, Pencil, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EditState {
  id: string;
  title: string;
  image_url: string;
  url: string;
}

export default function SocialEditor() {
  const [links, setLinks]         = useState<SocialLink[]>([]);
  const [loading, setLoading]     = useState(true);
  const [title, setTitle]         = useState('');
  const [url, setUrl]             = useState('');
  const [imageUrl, setImageUrl]   = useState('');
  const [adding, setAdding]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addError, setAddError]   = useState('');
  const [editing, setEditing]     = useState<EditState | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editError, setEditError] = useState('');
  const fileRef                   = useRef<HTMLInputElement>(null);
  const editFileRef               = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('social_links').select('*').order('sort_order');
    if (data) setLinks(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function nextOrder() {
    return links.reduce((m, l) => Math.max(m, l.sort_order), 0) + 1;
  }

  async function uploadImage(file: File, onDone: (url: string) => void, onLoading: (v: boolean) => void) {
    onLoading(true);
    const ext  = file.name.split('.').pop();
    const path = `social-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      onDone(data.publicUrl);
    }
    onLoading(false);
  }

  async function handleAdd() {
    if (!title.trim() || !url.trim()) return;
    setAdding(true);
    setAddError('');
    const { data, error } = await supabase
      .from('social_links')
      .insert({ title: title.trim(), url: url.trim(), image_url: imageUrl || null, sort_order: nextOrder() })
      .select()
      .single();
    if (error) {
      setAddError(error.message);
    } else if (data) {
      setLinks((prev) => [...prev, data]);
      setTitle('');
      setUrl('');
      setImageUrl('');
      await fetch('/api/revalidate', { method: 'POST' });
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('social_links').delete().eq('id', id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch('/api/revalidate', { method: 'POST' });
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    await supabase.from('social_links').update({
      title:     editing.title.trim(),
      url:       editing.url.trim(),
      image_url: editing.image_url || null,
    }).eq('id', editing.id);
    setLinks((prev) => prev.map((l) =>
      l.id === editing.id
        ? { ...l, title: editing.title.trim(), url: editing.url.trim(), image_url: editing.image_url || null }
        : l
    ));
    await fetch('/api/revalidate', { method: 'POST' });
    setEditing(null);
    setSaving(false);
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-white font-semibold text-lg">پۆستەکانی سۆشیاڵ میدیا</h2>
        <p className="text-white/35 text-sm mt-0.5">بەستەرەکانی تۆڕی کۆمەڵایەتی بەڕێوە ببە</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/8 p-4 space-y-3">
        <p className="text-amber-400/70 text-xs tracking-wider font-medium">زیادکردنی بەستەر</p>

        {/* Image upload */}
        <div>
          <p className="text-white/35 text-xs mb-1.5">وێنە / ئایکۆن (ئارەزوومەند)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file, setImageUrl, setUploading);
              e.target.value = '';
            }}
          />
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 flex-shrink-0" />
              <button
                onClick={() => fileRef.current?.click()}
                className="text-amber-400 text-xs font-medium touch-manipulation"
              >
                گۆڕینی وێنە
              </button>
              <button onClick={() => setImageUrl('')} className="text-white/25 active:text-red-400 touch-manipulation ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 bg-white/3 text-white/30 text-xs touch-manipulation active:bg-white/5 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'بارکردن...' : 'بارکردنی وێنە'}
            </button>
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ناونیشان"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-amber-500/50 transition-colors"
        />

        {/* URL */}
        <div className="relative">
          <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {addError && <p className="text-red-400 text-xs">{addError}</p>}

        <button
          onClick={handleAdd}
          disabled={!title.trim() || !url.trim() || adding || uploading}
          className={[
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all touch-manipulation',
            !title.trim() || !url.trim() || adding || uploading
              ? 'bg-white/5 text-white/20 border border-white/8 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.2)]',
          ].join(' ')}
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          زیادکردن
        </button>
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/8 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Share2 className="w-9 h-9 text-white/15" />
          <p className="text-white/25 text-sm">هیچ بەستەرێک نییە</p>
        </div>
      )}

      {!loading && links.map((link) => (
        <div key={link.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          {link.image_url ? (
            <img src={link.image_url} alt={link.title} className="w-11 h-11 rounded-xl object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-white/25" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{link.title}</p>
            <p className="text-white/30 text-xs truncate mt-0.5">{link.url.replace(/https?:\/\/(www\.)?/, '')}</p>
          </div>
          <button
            onClick={() => { setEditError(''); setEditing({ id: link.id, title: link.title, image_url: link.image_url ?? '', url: link.url }); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/25 active:text-amber-400 touch-manipulation transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(link.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/25 active:text-red-400 touch-manipulation transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full md:w-[400px] bg-neutral-900 border border-white/10 rounded-t-3xl md:rounded-3xl px-5 pt-4 pb-8 md:pb-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto md:hidden" />
            <p className="text-white font-semibold text-sm text-center">دەستکاریکردنی بەستەر</p>

            {/* Image */}
            <div>
              <p className="text-white/35 text-xs mb-1.5">وێنە / ئایکۆن</p>
              <input
                ref={editFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, (u) => setEditing((prev) => prev ? { ...prev, image_url: u } : prev), setEditUploading);
                  e.target.value = '';
                }}
              />
              {editing.image_url ? (
                <div className="flex items-center gap-3">
                  <img src={editing.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                  <button onClick={() => editFileRef.current?.click()} className="text-amber-400 text-xs font-medium touch-manipulation">
                    {editUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                    گۆڕینی وێنە
                  </button>
                  <button onClick={() => setEditing({ ...editing, image_url: '' })} className="text-white/25 active:text-red-400 touch-manipulation ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => editFileRef.current?.click()}
                  disabled={editUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 bg-white/3 text-white/30 text-xs touch-manipulation"
                >
                  {editUploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4" />}
                  {editUploading ? 'بارکردن...' : 'بارکردنی وێنە'}
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <p className="text-white/35 text-xs mb-1.5">ناونیشان</p>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="ناونیشان"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {/* URL */}
            <div>
              <p className="text-white/35 text-xs mb-1.5">بەستەر</p>
              <div className="relative">
                <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type="url"
                  value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            {editError && <p className="text-red-400 text-xs">{editError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white/50 font-medium text-sm touch-manipulation active:bg-white/10 transition-colors"
              >
                گەڕانەوە
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || editUploading || !editing.title.trim() || !editing.url.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-semibold text-sm touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-40"
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
