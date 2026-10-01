'use client';

import { useEffect, useState } from 'react';
import { BatteryCharging } from 'lucide-react';
import Button from './ui/Button';
import { StatusBadge } from './ui/ToggleListItem';
import { isNativePlatform } from '@/lib/pushNotifications';
import {
  BackgroundStatus, getBackgroundStatus, isBackgroundReliable,
  openAppSettings, openAutostartSettings, requestIgnoreBatteryOptimizations,
} from '@/lib/backgroundReliability';

// 'outdated' = running in an APK built before BackgroundReliabilityPlugin
type Status = BackgroundStatus | 'outdated';

// Where each vendor keeps its "don't kill this app" switch — there's no API
// to read it, so the card can only point the way
function oemHint(manufacturer: string): string {
  if (manufacturer === 'samsung') {
    return 'لە ڕێکخستنی Battery، بەشی Background usage limits، ئەم ئەپە زیاد بکە بۆ Never sleeping apps';
  }
  if (['xiaomi', 'redmi', 'poco'].includes(manufacturer)) {
    return 'Autostart بۆ ئەم ئەپە چالاک بکە، و لە Battery saver بژاردەی No restrictions هەڵبژێرە';
  }
  if (['huawei', 'honor'].includes(manufacturer)) {
    return 'لە App launch، ئەم ئەپە بکە بە Manage manually و هەر سێ بژاردەکە چالاک بکە';
  }
  return 'Autostart بۆ ئەم ئەپە چالاک بکە، و لە لیستی ئەپە کراوەکان قوفڵی بکە';
}

export default function BackgroundDeliveryCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    // Battery settings only exist inside the Android app
    if (!isNativePlatform()) return;

    const refresh = () => {
      getBackgroundStatus()
        .then((s) => setStatus(s ?? 'outdated'))
        .catch(() => setStatus('outdated'));
    };
    refresh();

    // Re-check on return from the phone's settings screens
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function handleAllow() {
    setBusy(true);
    try {
      const next = await requestIgnoreBatteryOptimizations();
      if (next) setStatus(next);
    } catch {
      // Dialog unavailable — the vendor settings button below still works
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const outdated = status === 'outdated';
  const ok = !outdated && isBackgroundReliable(status);

  const desc = outdated
    ? 'بۆ پشکنینی ئەمە، وەشانی نوێی ئەپەکە دابمەزرێنە'
    : ok
      ? 'ئەپەکە دەتوانێت لە پاشبنەمادا کار بکات — ئاگادارکردنەوەکان ڕاستەوخۆ دەگەن، تەنانەت کە ئەپەکە داخراوە'
      : 'پاشەکەوتکردنی باتری لەوانەیە ئاگادارکردنەوەکان ڕابگرێت تا ئەپەکە دەکەیتەوە';

  const badge = outdated
    ? <StatusBadge text="نوێکردنەوە پێویستە" tone="neutral" />
    : ok
      ? <StatusBadge text="ڕێگەپێدراوە" tone="success" />
      : <StatusBadge text="سنووردارکراوە" tone="error" />;

  return (
    <div className="rounded-md-lg p-5 bg-md-surface-container border border-md-outline-variant shadow-md-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md-md flex items-center justify-center flex-shrink-0 bg-md-surface-container-high">
          <BatteryCharging className="w-5 h-5 text-md-on-surface-variant" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-md-on-surface">کارکردن لە پاشبنەمادا</p>
          <p className="text-md-on-surface-variant text-xs mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">{badge}</div>

      {!outdated && !status.ignoringBatteryOptimizations && (
        <Button variant="tonal" onClick={handleAllow} disabled={busy} className="mt-4">
          <BatteryCharging className="w-4 h-4" />
          ڕێگەدان بە کارکردن لە پاشبنەمادا
        </Button>
      )}

      {!outdated && status.backgroundRestricted && (
        <>
          <p className="mt-4 text-xs text-md-error leading-snug">
            بەکارهێنانی باتری ئەم ئەپە لەسەر Restricted دانراوە — لە زانیاری ئەپ، بیگۆڕە بۆ Unrestricted
          </p>
          <Button variant="outlined" onClick={() => openAppSettings().catch(() => {})} className="mt-3">
            کردنەوەی زانیاری ئەپ
          </Button>
        </>
      )}

      {!outdated && status.aggressiveOem && (
        <>
          <p className="mt-4 text-xs text-md-on-surface-variant leading-snug">{oemHint(status.manufacturer)}</p>
          <Button variant="outlined" onClick={() => openAutostartSettings().catch(() => {})} className="mt-3">
            کردنەوەی ڕێکخستنەکە
          </Button>
        </>
      )}
    </div>
  );
}
