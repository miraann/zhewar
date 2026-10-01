'use client';

import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { WhatsAppTemplate, WhatsAppTemplateKind } from '@/lib/types';
import { fillWaTemplate, waLink, type WaMessageValues } from '@/lib/whatsapp';

const PROMPT: Record<WhatsAppTemplateKind, string> = {
  accept:  'کاتەکە پەسەند کرا. پەیامێک بۆ واتساپی کڕیار بنێردرێت؟',
  decline: 'کاتەکە هەڵوەشێنرایەوە. پەیامێک بۆ واتساپی کڕیار بنێردرێت؟',
};

// Pick one of the واتساپ-tab messages (the kind's first is preselected), see
// it filled in for this booking, and open it in WhatsApp. Shown right after
// a booking is accepted/declined, and from the WhatsApp button on a
// confirmed/cancelled card. The send button is a real <a>, not
// window.open() — the tap itself is what lets the APK's WebView hand wa.me
// off to WhatsApp.
export default function WhatsAppSendSheet({
  phone, kind, templates, values, afterAction, onClose,
}: {
  phone: string;
  kind: WhatsAppTemplateKind;
  /** Non-empty, in send order — callers only open the sheet when there's something to send. */
  templates: WhatsAppTemplate[];
  values: WaMessageValues;
  afterAction: boolean;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];
  const message  = fillWaTemplate(selected.body, values);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-md-on-surface/50 backdrop-blur-sm" />
      <div
        className="relative w-full md:w-[420px] max-h-[92vh] overflow-y-auto bg-md-surface-container border border-md-outline-variant rounded-t-md-xl md:rounded-md-xl px-5 pt-4 pb-8 md:pb-5 shadow-md-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-md-outline-variant mx-auto mb-4 md:hidden" />

        <span
          className="mx-auto mb-3 flex w-14 h-14 items-center justify-center rounded-full"
          style={{ background: 'rgb(37 211 102 / 0.14)', color: '#128c4b' }}
        >
          <MessageCircle className="w-7 h-7" strokeWidth={2.25} />
        </span>

        <p className="font-bold text-[0.95rem] text-md-on-surface">{values.name}</p>
        <p className="text-md-on-surface-variant text-[0.8rem] mt-1 leading-relaxed">
          {afterAction ? PROMPT[kind] : 'کام پەیام بۆ واتساپی کڕیار بنێردرێت؟'}
        </p>

        {templates.length > 1 && (
          <div role="radiogroup" className="mt-4 flex flex-wrap justify-center gap-1.5">
            {templates.map((t) => {
              const active = t.id === selected.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(t.id)}
                  className={[
                    'max-w-full truncate px-3.5 py-[7px] rounded-md-full text-[0.72rem] font-semibold leading-none border touch-manipulation transition-all active:scale-95',
                    active
                      ? 'text-white border-transparent'
                      : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant',
                  ].join(' ')}
                  style={active ? { background: '#25d366' } : undefined}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        )}

        <p
          dir="rtl"
          className="mt-4 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md-md border-s-4 bg-md-surface-container-high px-4 py-3 text-start text-[0.78rem] leading-relaxed text-md-on-surface"
          style={{ borderInlineStartColor: 'rgb(37 211 102 / 0.55)' }}
        >
          {message}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-md-full border border-md-outline text-md-on-surface font-medium text-sm touch-manipulation active:bg-md-surface-container-high transition-colors"
          >
            {afterAction ? 'دواتر' : 'پاشگەزبوونەوە'}
          </button>
          <a
            href={waLink(phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-md-full text-white font-semibold text-sm touch-manipulation active:opacity-80 transition-opacity shadow-md-1"
            style={{ background: '#25d366' }}
          >
            <Send className="w-4 h-4" />
            ناردن بە واتساپ
          </a>
        </div>

        {!afterAction && (
          <a
            href={waLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-block mt-3 text-[0.72rem] font-medium text-md-on-surface-variant underline underline-offset-4 touch-manipulation"
          >
            کردنەوەی چات بەبێ پەیام
          </a>
        )}
      </div>
    </div>
  );
}
