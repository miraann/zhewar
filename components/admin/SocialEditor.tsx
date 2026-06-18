'use client';

import { supabase } from '@/lib/supabase';
import type { SocialLink } from '@/lib/types';
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Link as LinkIcon, Loader2, Pencil, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('social_links').select('*').order('sort_order');
    if (data) setLinks(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime:social_links')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_links' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

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

  function isValidUrl(raw: string): boolean {
    try {
      const parsed = new URL(raw.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async function handleAdd() {
    if (!imageUrl || !url.trim()) return;
    if (!isValidUrl(url)) {
      setAddError('بەستەرێکی دروست بنووسە (https://...)');
      return;
    }
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
    if (!isValidUrl(editing.url)) {
      setEditError('بەستەرێکی دروست بنووسە (https://...)');
      return;
    }
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

  async function persistOrder(ordered: SocialLink[]) {
    await Promise.all(
      ordered.map((l, i) =>
        supabase.from('social_links').update({ sort_order: i }).eq('id', l.id)
      )
    );
    await fetch('/api/revalidate', { method: 'POST' });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLinks((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      persistOrder(reordered);
      return reordered;
    });
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">پۆستەکانی سۆشیاڵ میدیا</h2>
        <p className="text-slate-500 text-sm mt-0.5">    </p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <p className="text-blue-700 text-xs font-semibold tracking-wider">زیادکردنی بەستەر</p>

        <div>
          <p className="text-slate-700 text-xs font-medium mb-1.5">وێنە / ئایکۆن <span className="text-red-500">*</span></p>
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file, setImageUrl, setUploading);
              e.target.value = '';
            }}
          />
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0" />
              <button onClick={() => fileRef.current?.click()} className="text-blue-600 text-xs font-medium touch-manipulation">گۆڕینی وێنە</button>
              <button onClick={() => setImageUrl('')} className="text-slate-400 active:text-red-500 touch-manipulation ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-500 text-xs touch-manipulation active:bg-slate-50 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'بارکردن...' : 'بارکردنی وێنە'}
            </button>
          )}
        </div>

        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="ناونیشان (ئارەزوومەند)"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
        />

        <div className="relative">
          <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
          />
        </div>

        {addError && <p className="text-red-500 text-xs">{addError}</p>}

        <button
          onClick={handleAdd}
          disabled={!imageUrl || !url.trim() || adding || uploading}
          className={[
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all touch-manipulation',
            !imageUrl || !url.trim() || adding || uploading
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-blue-600 text-white shadow-md shadow-blue-200/50 active:bg-blue-700 active:scale-[0.98]',
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
            <div key={i} className="h-16 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Share2 className="w-9 h-9 text-slate-300" />
          <p className="text-slate-400 text-sm">هیچ بەستەرێک نییە</p>
        </div>
      )}

      {!loading && links.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {links.map((link) => (
                <SortableLink
                  key={link.id}
                  link={link}
                  onEdit={() => { setEditError(''); setEditing({ id: link.id, title: link.title, image_url: link.image_url ?? '', url: link.url }); }}
                  onDelete={() => handleDelete(link.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full md:w-[400px] bg-white border border-slate-200 rounded-t-3xl md:rounded-3xl px-5 pt-4 pb-8 md:pb-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto md:hidden" />
            <p className="text-slate-900 font-semibold text-sm text-center">دەستکاریکردنی بەستەر</p>

            <div>
              <p className="text-slate-700 text-xs font-medium mb-1.5">وێنە / ئایکۆن <span className="text-red-500">*</span></p>
              <input
                ref={editFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, (u) => setEditing((prev) => prev ? { ...prev, image_url: u } : prev), setEditUploading);
                  e.target.value = '';
                }}
              />
              {editing.image_url ? (
                <div className="flex items-center gap-3">
                  <img src={editing.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0" />
                  <button onClick={() => editFileRef.current?.click()} className="text-blue-600 text-xs font-medium touch-manipulation">
                    {editUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                    گۆڕینی وێنە
                  </button>
                  <button onClick={() => setEditing({ ...editing, image_url: '' })} className="text-slate-400 active:text-red-500 touch-manipulation ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => editFileRef.current?.click()}
                  disabled={editUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs touch-manipulation"
                >
                  {editUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4" />}
                  {editUploading ? 'بارکردن...' : 'بارکردنی وێنە'}
                </button>
              )}
            </div>

            <div>
              <p className="text-slate-700 text-xs font-medium mb-1.5">ناونیشان (ئارەزوومەند)</p>
              <input
                type="text" value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="ناونیشان"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>

            <div>
              <p className="text-slate-700 text-xs font-medium mb-1.5">بەستەر</p>
              <div className="relative">
                <LinkIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="url" value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
                />
              </div>
            </div>

            {editError && <p className="text-red-500 text-xs">{editError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium text-sm touch-manipulation active:bg-slate-100 transition-colors"
              >
                گەڕانەوە
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || editUploading || !editing.image_url || !editing.url.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-40"
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

function SortableLink({
  link, onEdit, onDelete,
}: {
  link: SocialLink;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.55 : 1,
    aspectRatio: '3/4',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-2xl overflow-hidden border border-slate-200"
    >
      {link.image_url ? (
        <img src={link.image_url} alt={link.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2">
          <Share2 className="w-8 h-8 text-slate-300" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />

      <p className="absolute bottom-2 right-2 left-8 text-white text-[0.65rem] font-semibold truncate">
        {link.title}
      </p>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-500 shadow-sm cursor-grab active:cursor-grabbing touch-manipulation"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="absolute bottom-8 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-500 active:text-red-500 touch-manipulation transition-colors shadow-sm"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Edit */}
      <button
        onClick={onEdit}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-slate-500 active:text-blue-600 touch-manipulation transition-colors shadow-sm"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
