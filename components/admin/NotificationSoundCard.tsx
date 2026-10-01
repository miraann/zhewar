'use client';

import { useEffect, useRef, useState } from 'react';
import { Music, Play } from 'lucide-react';
import { StatusBadge, SavingIndicator } from './ui/ToggleListItem';
import { adminFetch } from '@/lib/adminFetch';
import { NOTIFICATION_SOUNDS, NotificationSoundId, soundPreviewUrl } from '@/lib/notificationSounds';

export default function NotificationSoundCard({ initial }: { initial: NotificationSoundId }) {
  const [sound, setSound]   = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function preview(id: NotificationSoundId) {
    audio.current?.pause();
    const url = soundPreviewUrl(id);
    if (!url) return;
    audio.current = new Audio(url);
    audio.current.play().catch(() => {});
  }

  async function select(id: NotificationSoundId) {
    preview(id);
    if (id === sound || saving) return;
    const prev = sound;
    setSound(id);
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ notification_sound: id }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSound(prev);
      setError('پاشەکەوتکردن سەرکەوتوو نەبوو');
    }
    setSaving(false);
  }

  const statusNode = saving ? <SavingIndicator />
    : saved ? <StatusBadge text="✓ پاشەکەوتکرا" tone="success" />
    : error ? <span className="text-[0.7rem] text-md-error">{error}</span>
    : null;

  return (
    <div className="rounded-md-lg p-5 bg-md-surface-container border border-md-outline-variant shadow-md-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md-md flex items-center justify-center flex-shrink-0 bg-md-surface-container-high">
          <Music className="w-5 h-5 text-md-on-surface-variant" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-md-on-surface">دەنگی ئاگادارکردنەوە</p>
          <p className="text-md-on-surface-variant text-xs mt-0.5 leading-snug">
            ئەو دەنگەی لە مۆبایلەکان لێدەدرێت کاتێک داواکاری نوێ دێت
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-label="دەنگی ئاگادارکردنەوە" className="mt-4 space-y-1.5">
        {NOTIFICATION_SOUNDS.map((s) => {
          const active = s.id === sound;
          return (
            <div
              key={s.id}
              className={[
                'flex items-center rounded-md-md border transition-colors',
                active ? 'border-md-primary bg-md-primary-container/40' : 'border-md-outline-variant',
              ].join(' ')}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => select(s.id)}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-start touch-manipulation"
              >
                <span
                  className={[
                    'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    active ? 'border-md-primary' : 'border-md-outline',
                  ].join(' ')}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-md-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-md-on-surface">{s.label}</span>
                  <span className="block text-xs text-md-on-surface-variant leading-snug">{s.description}</span>
                </span>
              </button>
              {soundPreviewUrl(s.id) && (
                <button
                  type="button"
                  aria-label={`گوێگرتن لە ${s.label}`}
                  onClick={() => preview(s.id)}
                  className="w-10 h-10 me-1 rounded-full flex items-center justify-center flex-shrink-0 text-md-on-surface-variant active:bg-md-surface-container-high transition-colors touch-manipulation"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {statusNode && <div className="mt-4 flex items-center gap-2">{statusNode}</div>}
    </div>
  );
}
