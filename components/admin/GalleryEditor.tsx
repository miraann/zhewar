'use client';

import { supabase } from '@/lib/supabase';
import type { GalleryPhoto } from '@/lib/types';
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, ImageIcon, Loader2, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_photos').select('*').order('sort_order');
    if (data) setPhotos(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime:gallery_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  function nextOrder() {
    return photos.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
  }

  async function insertPhoto(photoUrl: string) {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: photoUrl, caption: caption.trim() || null, sort_order: nextOrder() }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => [...prev, data]);
    }
    setCaption('');
    await fetch('/api/revalidate', { method: 'POST' });
  }

  async function uploadToStorage(file: File): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', 'gallery_photos');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
    if (!res.ok) { const j = await res.json().catch(() => ({})); setAddError(j.error ?? 'هەڵەی بارکردن'); return null; }
    const { url } = await res.json();
    return url;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAddError('');
    setAdding(true);
    for (const file of files) {
      const url = await uploadToStorage(file);
      if (!url) break;
      await insertPhoto(url);
    }
    setAdding(false);
    e.target.value = '';
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch('/api/revalidate', { method: 'POST' });
  }

  async function handleReplacePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setEditError('');
    setReplacing(true);
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', 'gallery_photos');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setEditError(j.error ?? 'هەڵەی بارکردن');
    } else {
      const { url } = await res.json();
      setEditing((prev) => prev ? { ...prev, photo_url: url } : prev);
    }
    setReplacing(false);
    e.target.value = '';
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/admin/gallery/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: editing.photo_url, caption: editing.caption.trim() || null }),
    });
    setPhotos((prev) => prev.map((p) =>
      p.id === editing.id
        ? { ...p, photo_url: editing.photo_url, caption: editing.caption.trim() || null }
        : p
    ));
    await fetch('/api/revalidate', { method: 'POST' });
    setEditing(null);
    setSaving(false);
  }

  async function persistOrder(ordered: GalleryPhoto[]) {
    await fetch('/api/admin/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ordered.map((p, i) => ({ id: p.id, sort_order: i })) }),
    });
    await fetch('/api/revalidate', { method: 'POST' });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPhotos((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      persistOrder(reordered);
      return reordered;
    });
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">گەلەری</h2>
        <p className="text-slate-500 text-sm mt-0.5">کۆکراوەی وێنەی کارەکانت بەڕێوە ببە</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <p className="text-blue-700 text-xs font-semibold tracking-wider">زیادکردنی وێنە</p>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="پێناس (ئارەزوومەند)"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
        />
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={adding}
          className={[
            'w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all touch-manipulation',
            adding ? 'border-blue-300 bg-blue-100/50 cursor-not-allowed' : 'border-slate-300 bg-white active:bg-slate-50',
          ].join(' ')}
        >
          {adding ? <Loader2 className="w-7 h-7 text-blue-500 animate-spin" /> : <Upload className="w-7 h-7 text-slate-400" />}
          <span className="text-slate-600 text-sm font-medium">{adding ? 'بارکردن...' : 'کلیک بکە بۆ هەڵبژاردنی وێنە'}</span>
          {!adding && <span className="text-slate-400 text-xs">پێویستە شێوازی وێنەکە ٩:١٦ بێت</span>}
        </button>
        {addError && <p className="text-red-500 text-xs">{addError}</p>}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <ImageIcon className="w-9 h-9 text-slate-300" />
          <p className="text-slate-400 text-sm">هیچ وێنەیەک نییە</p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onEdit={() => { setEditError(''); setEditing({ id: photo.id, caption: photo.caption ?? '', photo_url: photo.photo_url }); }}
                  onDelete={() => handleDelete(photo.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit sheet */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full md:w-[380px] bg-white border border-slate-200 rounded-t-3xl md:rounded-3xl px-5 pt-4 pb-8 md:pb-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 md:hidden" />
            <p className="text-slate-900 font-semibold text-sm text-center mb-4">دەستکاریکردنی وێنە</p>
            <div className="flex justify-center mb-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 w-40" style={{ aspectRatio: '3/4' }}>
                <img src={editing.photo_url} alt="" className="w-full h-full object-cover" />
                {replacing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                )}
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleReplacePhoto} />
                <button
                  onClick={() => editFileRef.current?.click()}
                  disabled={replacing}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-slate-700 text-[0.6rem] font-medium touch-manipulation whitespace-nowrap shadow-sm border border-slate-200"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  گۆڕینی وێنە
                </button>
              </div>
            </div>
            {editError && <p className="text-red-500 text-xs mb-2 text-center">{editError}</p>}
            <div className="mb-4">
              <p className="text-slate-700 text-xs font-medium mb-1.5">پێناس (ئارەزوومەند)</p>
              <input
                type="text"
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(null); }}
                placeholder="پێناس بنووسە..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium text-sm touch-manipulation active:bg-slate-100 transition-colors"
              >
                گەڕانەوە
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || replacing}
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

function SortablePhoto({
  photo, onEdit, onDelete,
}: {
  photo: GalleryPhoto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, aspectRatio: '3/4' }}
      className="relative rounded-2xl overflow-hidden border border-slate-200"
    >
      <img src={photo.photo_url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      {photo.caption && (
        <p className="absolute bottom-2 right-2 left-8 text-white text-[0.65rem] font-medium truncate">{photo.caption}</p>
      )}

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
