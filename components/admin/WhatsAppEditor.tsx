'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check, CheckCircle2, GripVertical, Loader2, MessageCircle, Pencil, Plus, RefreshCw, Trash2, XCircle,
} from 'lucide-react';
import type { WhatsAppTemplate, WhatsAppTemplateKind } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';
import {
  WA_BODY_MAX, WA_KIND_LABEL, WA_TITLE_MAX, WA_TOKENS,
  byTemplateOrder, fillWaTemplate, type WaMessageValues,
} from '@/lib/whatsapp';
import Skeleton from './ui/Skeleton';

const API = '/api/admin/whatsapp-templates';

const KINDS: WhatsAppTemplateKind[] = ['accept', 'decline'];

const SECTION: Record<WhatsAppTemplateKind, { title: string; hint: string; icon: React.ElementType; iconCls: string }> = {
  accept: {
    title:   'پەیامی پەسەندکردن',
    hint:    'دوای پەسەندکردنی کاتی سەردان پێشنیار دەکرێت',
    icon:    CheckCircle2,
    iconCls: 'bg-md-success-container text-md-success',
  },
  decline: {
    title:   'پەیامی هەڵوەشاندن',
    hint:    'دوای هەڵوەشاندنی کاتی سەردان پێشنیار دەکرێت',
    icon:    XCircle,
    iconCls: 'bg-md-error-container text-md-error',
  },
};

// Splits a body around its placeholders so the cards can show them as chips.
const TOKEN_SPLIT_RE = /(\{(?:name|date|time|link|book)\})/;
const TOKEN_LABEL: Record<string, string> = Object.fromEntries(WA_TOKENS.map((t) => [t.token, t.label]));

// Made-up booking the editor's preview fills the placeholders from.
function sampleValues(): WaMessageValues {
  const origin = window.location.origin;
  return {
    name: 'ئاراس محەمەد',
    date: 'شەممە 4/10',
    time: '4:30 دوا نیوەڕۆ',
    link: `${origin}/appointment/3f2a9c1e`,
    book: `${origin}/book`,
  };
}

interface Draft {
  id?: string;
  kind: WhatsAppTemplateKind;
  title: string;
  body: string;
}

export default function WhatsAppEditor() {
  const [templates, setTemplates]         = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [actionError, setActionError]     = useState('');
  const [editing, setEditing]             = useState<Draft | null>(null);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await adminFetch(API);
      if (!res.ok) throw new Error();
      setTemplates(await res.json());
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Delete needs a second tap; the first one only arms it for a few seconds.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  function openEditor(draft: Draft) {
    setSaveError('');
    setEditing(draft);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await adminFetch(editing.id ? `${API}/${editing.id}` : API, {
        method: editing.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ kind: editing.kind, title: editing.title, body: editing.body }),
      });
      if (!res.ok) throw new Error();
      const saved: WhatsAppTemplate = await res.json();
      setTemplates((prev) => editing.id ? prev.map((t) => t.id === saved.id ? saved : t) : [...prev, saved]);
      setEditing(null);
    } catch {
      setSaveError('پاشەکەوتکردن سەرکەوتوو نەبوو');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setConfirmDelete(null);
    setActionError('');
    const res = await adminFetch(`${API}/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    else setActionError('سڕینەوە سەرکەوتوو نەبوو');
  }

  function handleDragEnd(kind: WhatsAppTemplateKind, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list     = templates.filter((t) => t.kind === kind).sort(byTemplateOrder);
    const oldIndex = list.findIndex((t) => t.id === active.id);
    const newIndex = list.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    const order     = new Map(reordered.map((t, i) => [t.id, i]));
    setTemplates((prev) => prev.map((t) => order.has(t.id) ? { ...t, sort_order: order.get(t.id)! } : t));
    adminFetch(API, { method: 'PATCH', body: JSON.stringify({ ids: reordered.map((t) => t.id) }) })
      .then((res) => { if (!res.ok) load(); })
      .catch(() => load());
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 leading-tight">پەیامەکانی واتساپ</h2>
        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
          دوای پەسەندکردن یان هەڵوەشاندنی کاتێک، یەکێک لەم پەیامانە بۆ واتساپی کڕیار ئامادە دەکرێت.
          یەکەمی هەر بەشێک بنەڕەتە؛ بە ڕاکێشان ڕیزبەندی بگۆڕە.
        </p>
      </div>

      {actionError && (
        <p className="px-4 py-3 rounded-md-md bg-md-error-container text-md-on-error-container text-xs font-medium">
          {actionError}
        </p>
      )}

      {loading && <Skeleton variant="card" count={3} className="h-32" />}

      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <MessageCircle className="w-9 h-9 text-md-outline" />
          <p className="text-md-on-surface-variant text-sm">پەیامەکان بار نەکران</p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md-full border border-md-outline text-md-on-surface text-[0.8rem] font-semibold touch-manipulation active:bg-md-surface-container-high transition-colors"
          >
            <RefreshCw className="w-[13px] h-[13px]" />
            هەوڵدانەوە
          </button>
        </div>
      )}

      {!loading && !loadError && KINDS.map((kind) => {
        const list = templates.filter((t) => t.kind === kind).sort(byTemplateOrder);
        const { title, hint, icon: Icon, iconCls } = SECTION[kind];
        return (
          <section key={kind} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md-md flex items-center justify-center flex-shrink-0 ${iconCls}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-md-on-surface font-semibold text-sm">{title}</p>
                <p className="text-md-on-surface-variant text-xs mt-0.5">{hint}</p>
              </div>
              <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-md-surface-container-highest text-md-on-surface-variant text-[0.7rem] font-bold flex items-center justify-center">
                {list.length}
              </span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(kind, e)}>
              <SortableContext items={list.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {list.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isDefault={i === 0}
                      confirmingDelete={confirmDelete === t.id}
                      onEdit={() => openEditor({ id: t.id, kind: t.kind, title: t.title, body: t.body })}
                      onDelete={() => handleDelete(t.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={() => openEditor({ kind, title: '', body: '' })}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md-lg border-2 border-dashed border-md-outline bg-md-surface-container text-md-on-surface-variant text-xs font-semibold touch-manipulation active:bg-md-surface-container-highest transition-colors"
            >
              <Plus className="w-4 h-4" />
              زیادکردنی پەیامی {WA_KIND_LABEL[kind]}
            </button>
          </section>
        );
      })}

      {editing && (
        <TemplateSheet
          draft={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          saving={saving}
          error={saveError}
        />
      )}
    </div>
  );
}

// ── Template card ──────────────────────────────────────────────────────────────

function BodyWithTokens({ body }: { body: string }) {
  return (
    <>
      {body.split(TOKEN_SPLIT_RE).map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            className="inline-block px-1.5 mx-0.5 rounded-md-sm bg-md-primary-container text-md-on-primary-container text-[0.68rem] font-semibold leading-snug"
          >
            {TOKEN_LABEL[part]}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function TemplateCard({
  template, isDefault, confirmingDelete, onEdit, onDelete,
}: {
  template: WhatsAppTemplate;
  isDefault: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative bg-md-surface-container rounded-md-lg border border-md-outline-variant shadow-md-1 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="w-8 h-8 -ms-1.5 rounded-full flex items-center justify-center text-md-on-surface-variant flex-shrink-0 cursor-grab active:cursor-grabbing active:bg-md-surface-container-high touch-manipulation"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <p className="flex-1 min-w-0 truncate font-semibold text-sm text-md-on-surface">{template.title}</p>
        {isDefault && (
          <span className="flex-shrink-0 px-2 py-[3px] text-[10px] font-semibold rounded-md-full bg-md-success-container text-md-on-success-container">
            بنەڕەت
          </span>
        )}
      </div>

      {/* Padding on the wrapper, not the clamped <p> — otherwise the top of
          the next line peeks out through the bottom padding. */}
      <div className="rounded-md-md bg-md-surface-container-high px-3.5 py-2.5">
        <p dir="rtl" className="line-clamp-5 whitespace-pre-line break-words text-[0.78rem] leading-relaxed text-md-on-surface">
          <BodyWithTokens body={template.body} />
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 h-9 rounded-md-full font-semibold text-[0.8rem] flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.98] bg-md-secondary-container text-md-on-secondary-container active:bg-md-secondary-container/80"
        >
          <Pencil className="w-[13px] h-[13px]" />
          دەستکاریکردن
        </button>
        <button
          onClick={onDelete}
          className={[
            'px-4 h-9 rounded-md-full font-semibold text-[0.8rem] flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.98]',
            confirmingDelete
              ? 'bg-md-error text-md-on-error'
              : 'bg-md-error-container text-md-on-error-container active:bg-md-error-container/70',
          ].join(' ')}
        >
          <Trash2 className="w-[13px] h-[13px]" />
          {confirmingDelete ? 'دڵنیایت؟' : 'سڕینەوە'}
        </button>
      </div>
    </div>
  );
}

// ── Add / edit sheet ───────────────────────────────────────────────────────────

function TemplateSheet({
  draft, onChange, onClose, onSave, saving, error,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preview     = draft.body.trim() ? fillWaTemplate(draft.body.trim(), sampleValues()) : '';
  const canSave     = !!draft.title.trim() && !!draft.body.trim() && !saving;

  // Placeholder chips insert at the cursor, so nobody has to type {name}
  // and friends by hand.
  function insertToken(token: string) {
    const el    = textareaRef.current;
    const start = el?.selectionStart ?? draft.body.length;
    const end   = el?.selectionEnd ?? draft.body.length;
    const next  = draft.body.slice(0, start) + token + draft.body.slice(end);
    if (next.length > WA_BODY_MAX) return;
    onChange({ ...draft, body: next });
    // Put the caret back after the inserted token once React has re-rendered.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-md-on-surface/50 backdrop-blur-sm" />
      <div
        className="relative w-full md:w-[440px] max-h-[92vh] overflow-y-auto bg-md-surface-container border border-md-outline-variant rounded-t-md-xl md:rounded-md-xl px-5 pt-4 pb-8 md:pb-5 shadow-md-2 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-md-outline-variant mx-auto md:hidden" />
        <p className="text-md-on-surface font-semibold text-sm text-center">
          {draft.id ? 'دەستکاریکردنی پەیام' : 'پەیامی نوێ'}
        </p>

        {/* Kind */}
        <div>
          <p className="text-md-on-surface text-xs font-medium mb-1.5">جۆری پەیام</p>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => {
              const active = draft.kind === k;
              const Icon   = SECTION[k].icon;
              const activeCls = k === 'accept'
                ? 'bg-md-success-container text-md-on-success-container border-md-success/40'
                : 'bg-md-error-container text-md-on-error-container border-md-error/40';
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onChange({ ...draft, kind: k })}
                  className={[
                    'h-10 rounded-md-full text-[0.8rem] font-semibold flex items-center justify-center gap-1.5 border touch-manipulation transition-colors',
                    active ? activeCls : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant',
                  ].join(' ')}
                >
                  <Icon className="w-[14px] h-[14px]" />
                  {WA_KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="text-md-on-surface text-xs font-medium mb-1.5">ناونیشان</p>
          <input
            type="text"
            value={draft.title}
            maxLength={WA_TITLE_MAX}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="بۆ نموونە: پەسەندکردنی ئاسایی"
            className="admin-input"
          />
          <p className="text-md-on-surface-variant text-[0.68rem] mt-1">
            ناونیشان بۆ کڕیار نانێردرێت؛ تەنها بۆ هەڵبژاردنی پەیامەکەیە.
          </p>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-md-on-surface text-xs font-medium">دەقی پەیام</p>
            <span dir="ltr" className="text-[0.65rem] text-md-on-surface-variant">{draft.body.length}/{WA_BODY_MAX}</span>
          </div>
          <textarea
            ref={textareaRef}
            value={draft.body}
            maxLength={WA_BODY_MAX}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            rows={8}
            dir="rtl"
            className="admin-input leading-relaxed resize-y"
          />
        </div>

        {/* Placeholders */}
        <div>
          <p className="text-md-on-surface text-xs font-medium mb-1.5">زانیارییەکانی سەردان</p>
          <div className="flex flex-wrap gap-1.5">
            {WA_TOKENS.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md-full border border-md-outline-variant bg-md-surface-container-high text-[0.7rem] font-medium text-md-on-surface-variant touch-manipulation transition-all active:scale-95 active:bg-md-surface-container-highest"
              >
                <Plus className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-md-on-surface-variant text-[0.68rem] mt-1.5 leading-relaxed">
            کرتە لە هەر یەکێک بکە بۆ دانانی لە شوێنی نووسینەکەدا؛ لە کاتی ناردندا بە زانیاریی ڕاستەقینەی کاتەکە دەگۆڕدرێت.
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div>
            <p className="text-md-on-surface text-xs font-medium mb-1.5">پێشبینین (نموونە)</p>
            <div className="rounded-md-md bg-md-surface-container-high p-3">
              <p
                dir="rtl"
                className="whitespace-pre-wrap break-words rounded-md-md rounded-ss-sm px-3.5 py-2.5 text-[0.8rem] leading-relaxed shadow-md-1"
                style={{ background: '#d9fdd3', color: '#111b21' }}
              >
                {preview}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-md-error text-xs">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-md-full border border-md-outline text-md-on-surface font-medium text-sm touch-manipulation active:bg-md-surface-container-high transition-colors"
          >
            گەڕانەوە
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md-full bg-md-primary text-md-on-primary font-semibold text-sm touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            پاشەکەوت
          </button>
        </div>
      </div>
    </div>
  );
}
