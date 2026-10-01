'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import Button from './ui/Button';
import { StatusBadge, SavingIndicator } from './ui/ToggleListItem';
import { adminFetch } from '@/lib/adminFetch';
import { FCM_TOKEN_KEY, isNativePlatform } from '@/lib/pushNotifications';

type Result = { text: string; tone: 'success' | 'error' };

export default function PushTestCard() {
  const [native, setNative]   = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<Result | null>(null);

  useEffect(() => setNative(isNativePlatform()), []);

  async function handleSend() {
    // Inside the app only this phone is tested; from a browser, every
    // registered phone gets it
    const token = native ? localStorage.getItem(FCM_TOKEN_KEY) : null;
    if (native && !token) {
      setResult({ text: 'ئاگادارکردنەوە لەم مۆبایلە ناچالاکە — سەرەتا چالاکی بکە', tone: 'error' });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await adminFetch('/api/admin/push-test', {
        method: 'POST',
        body: JSON.stringify(token ? { token } : {}),
      });
      if (res.status === 503) {
        setResult({ text: 'Firebase لەسەر سێرڤەر ڕێکنەخراوە', tone: 'error' });
        return;
      }
      if (!res.ok) throw new Error();

      const { total, sent, failed } = await res.json();
      if (!total) {
        setResult({
          text: native
            ? 'ئەم مۆبایلە تۆمار نەکراوە — ئاگادارکردنەوە بکوژێنەوە و دووبارە چالاکی بکەوە'
            : 'هیچ مۆبایلێک تۆمار نەکراوە — لە ئەپی ئەندرۆید ئاگادارکردنەوە چالاک بکە',
          tone: 'error',
        });
      } else if (!sent) {
        setResult({ text: 'ناردن سەرکەوتوو نەبوو', tone: 'error' });
      } else {
        setResult({
          text: native
            ? '✓ نێردرا'
            : `✓ نێردرا بۆ ${sent} مۆبایل${failed ? ` — ${failed} سەرکەوتوو نەبوو` : ''}`,
          tone: 'success',
        });
      }
    } catch {
      setResult({ text: 'هەڵەیەک ڕوویدا — دووبارە هەوڵبدەوە', tone: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-md-lg p-5 bg-md-surface-container border border-md-outline-variant shadow-md-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md-md flex items-center justify-center flex-shrink-0 bg-md-surface-container-high">
          <Send className="w-5 h-5 text-md-on-surface-variant" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-md-on-surface">تاقیکردنەوەی ئاگادارکردنەوە</p>
          <p className="text-md-on-surface-variant text-xs mt-0.5 leading-snug">
            {native
              ? 'ئاگادارکردنەوەیەکی تاقیکاری بۆ ئەم مۆبایلە دەنێرێت بە دەنگی هەڵبژێردراو'
              : 'ئاگادارکردنەوەیەکی تاقیکاری بۆ هەموو مۆبایلە تۆمارکراوەکان دەنێرێت'}
          </p>
        </div>
      </div>

      <Button variant="tonal" onClick={handleSend} disabled={sending} className="mt-4">
        <Send className="w-4 h-4" />
        ناردنی ئاگادارکردنەوەی تاقیکاری
      </Button>

      {(sending || result) && (
        <div className="mt-3 flex items-center gap-2">
          {sending ? <SavingIndicator label="ناردن..." />
            : result?.tone === 'success' ? <StatusBadge text={result.text} tone="success" />
            : <span className="text-[0.7rem] text-md-error leading-snug">{result?.text}</span>}
        </div>
      )}
    </div>
  );
}
