'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

export type BookingDecision = 'accept' | 'decline';

const COPY: Record<BookingDecision, { question: string; confirm: string }> = {
  accept:  { question: 'ئەم کاتی سەردانە پەسەند بکرێت؟',  confirm: 'پەسەندکردن' },
  decline: { question: 'ئەم کاتی سەردانە هەڵبوەشێنرێتەوە؟', confirm: 'هەڵوەشاندن' },
};
const ACCEPTED = 'کاتەکە پەسەند کرا';

// How long the accept success check stays up before handing off.
const SUCCESS_MS = 1400;

// Asks before a booking is accepted/declined, saves it, and — for an
// accept — shows an animated success check before calling onDone (which
// the caller uses to offer the WhatsApp message). A decline closes straight
// away. Stays open on a failed save so the admin can retry.
export default function BookingConfirmSheet({
  decision, name, when, onConfirm, onCancel, onDone,
}: {
  decision: BookingDecision;
  name: string;
  /** Day + time of the booking, e.g. "یەکشەممە 4/10 · 1:30 دوا نیوەڕۆ". */
  when: string;
  /** Saves the change; resolves false if it didn't go through. */
  onConfirm: () => Promise<boolean>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'ask' | 'saving' | 'failed' | 'done'>('ask');
  const copy    = COPY[decision];
  const accept  = decision === 'accept';
  const saving  = phase === 'saving';

  // The list re-renders while the success check is up; keep its timer.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  async function confirm() {
    setPhase('saving');
    const ok = await onConfirm();
    if (!ok) { setPhase('failed'); return; }
    if (accept) setPhase('done');
    else onDone();
  }

  useEffect(() => {
    if (phase !== 'done') return;
    const id = setTimeout(() => onDoneRef.current(), SUCCESS_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // Escape cancels (web); ignored mid-save and on the success screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && (phase === 'ask' || phase === 'failed')) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, onCancel]);

  function onBackdrop() {
    if (phase === 'done') onDone();
    else if (!saving) onCancel();
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={phase === 'done' ? ACCEPTED : copy.question}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onBackdrop}
    >
      <div className="absolute inset-0 bg-md-on-surface/50 backdrop-blur-sm" />
      <div
        className="relative w-full md:w-[380px] bg-md-surface-container border border-md-outline-variant rounded-t-md-xl md:rounded-md-xl px-5 pt-4 pb-8 md:pb-5 shadow-md-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-md-outline-variant mx-auto mb-4 md:hidden" />

        {phase === 'done' ? (
          <button
            type="button"
            onClick={onDone}
            className="w-full flex flex-col items-center py-4 touch-manipulation"
          >
            <span className="relative flex w-20 h-20 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-md-success/15 animate-pop-in motion-reduce:animate-none" />
              <span className="relative flex w-14 h-14 items-center justify-center rounded-full bg-md-success text-white shadow-md-1 animate-pop-in motion-reduce:animate-none">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path
                    d="M20 6 9 17l-5-5"
                    pathLength={1}
                    strokeDasharray={1}
                    className="animate-draw motion-reduce:animate-none"
                  />
                </svg>
              </span>
            </span>
            <p className="mt-4 font-bold text-[1rem] text-md-on-surface animate-fade-in">{ACCEPTED}</p>
            <p className="mt-1 text-[0.8rem] text-md-on-surface-variant animate-fade-in">{name} · {when}</p>
          </button>
        ) : (
          <>
            <span
              className={[
                'mx-auto mb-3 flex w-14 h-14 items-center justify-center rounded-full',
                accept ? 'bg-md-primary-container text-md-primary' : 'bg-md-error-container text-md-error',
              ].join(' ')}
            >
              {accept
                ? <CheckCircle2 className="w-7 h-7" strokeWidth={2.25} />
                : <XCircle className="w-7 h-7" strokeWidth={2.25} />}
            </span>

            <p className="font-bold text-[0.95rem] text-md-on-surface">{name}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[0.78rem] font-semibold text-md-on-surface-variant">
              <Clock className="w-3 h-3" />
              {when}
            </p>
            <p className="text-md-on-surface text-[0.85rem] mt-3 leading-relaxed">{copy.question}</p>

            {phase === 'failed' && (
              <p className="mt-3 rounded-md-md bg-md-error-container px-3 py-2 text-[0.75rem] font-semibold text-md-on-error-container">
                هەڵەیەک ڕوویدا — دووبارە هەوڵبدەرەوە.
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="flex-1 py-3.5 rounded-md-full border border-md-outline text-md-on-surface font-medium text-sm touch-manipulation active:bg-md-surface-container-high transition-colors disabled:opacity-50"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving}
                className={[
                  'flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-md-full font-semibold text-sm touch-manipulation transition-all active:scale-[0.98] shadow-md-1 disabled:opacity-80',
                  accept ? 'bg-md-primary text-md-on-primary' : 'bg-md-error text-md-on-error',
                ].join(' ')}
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : accept ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {copy.confirm}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
