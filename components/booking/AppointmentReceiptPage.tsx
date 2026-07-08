'use client';

import type { AppointmentFull } from '@/lib/types';
import { Calendar, CheckCircle, Clock, Download, ExternalLink, Home, RotateCcw, Scissors, XCircle } from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { formatTimeFull } from './DateTimePicker';
import html2canvas from 'html2canvas';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'دڵنیاکراوە',
  pending:   'چاوەڕوان',
  cancelled: 'هەڵوەشاوە',
};

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  confirmed: { bg: 'bg-emerald-50',    text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-500/10' },
  pending:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   border: 'border-amber-100',   iconBg: 'bg-amber-500/10'   },
  cancelled: { bg: 'bg-red-50',        text: 'text-red-500',     border: 'border-red-100',     iconBg: 'bg-red-500/10'     },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return formatTimeFull(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
}

function shortId(id: string) {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface Props {
  appointment: AppointmentFull;
  shopName: string;
  logoUrl: string | null;
  confirmUrl: string;
  cancelUrl: string;
}

export default function AppointmentReceiptPage({ appointment, shopName, logoUrl }: Props) {
  const [mounted, setMounted]             = useState(false);
  const [origin, setOrigin]               = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormattedDate(formatDate(appointment.appointment_time));
    setFormattedTime(formatTime(appointment.appointment_time));
    setOrigin(window.location.origin);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [appointment.appointment_time]);

  const apptUrl     = `${origin}/appointment/${appointment.id}`;
  const sid         = shortId(appointment.id);
  const isCancelled = appointment.status === 'cancelled';
  const statusStyle = STATUS_COLOR[appointment.status] ?? STATUS_COLOR.pending;

  const rawFb = (appointment.customers as any).facebook_id as string | null;
  const fbUrl = (() => {
    if (!rawFb?.trim()) return null;
    const s = rawFb.trim();
    const mme = s.match(/m\.me\/([^/?&#\s]+)/);
    if (mme) return `https://m.me/${mme[1]}`;
    const fb = s.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&#\s]+)/);
    if (fb) return `https://www.facebook.com/${fb[1]}`;
    if (s.startsWith('http')) return s;
    if (/^\d+$/.test(s)) return `https://www.facebook.com/profile.php?id=${s}`;
    return null;
  })();

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const kFont = new FontFace('UniSalar', 'url(/font/kurdish.ttf)');
      await kFont.load();
      document.fonts.add(kFont);
    } catch { }

    async function toDataUrl(url: string): Promise<string> {
      try {
        const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { return url; }
    }

    const imgEls = Array.from(cardRef.current.querySelectorAll<HTMLImageElement>('img'));
    const urlMap = new Map<string, string>();
    await Promise.all(
      imgEls
        .filter(img => img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:'))
        .map(async img => {
          const dataUrl = await toDataUrl(img.src);
          urlMap.set(img.src, dataUrl);
        })
    );

    const animated = cardRef.current.querySelectorAll<HTMLElement>('[style*="animation"]');
    animated.forEach(el => { el.style.animationPlayState = 'paused'; });

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        onclone: (clonedDoc, clonedEl) => {
          const style = clonedDoc.createElement('style');
          style.textContent = `
            @font-face { font-family: 'UniSalar'; src: url('/font/kurdish.ttf') format('truetype'); font-display: block; }
            * { letter-spacing: normal !important; font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "clig" 1 !important; }
          `;
          clonedDoc.head.appendChild(style);
          clonedDoc.body.style.direction = 'rtl';
          clonedEl.querySelectorAll<HTMLImageElement>('img').forEach(img => {
            const dataUrl = urlMap.get(img.src);
            if (dataUrl) img.src = dataUrl;
            if (!img.style.width)  img.style.width  = `${img.offsetWidth  || img.naturalWidth  || 64}px`;
            if (!img.style.height) img.style.height = `${img.offsetHeight || img.naturalHeight || 64}px`;
          });
          clonedEl.querySelectorAll<HTMLElement>('[style*="animation"]').forEach(el => {
            el.style.animationPlayState = 'paused';
          });
        },
      });
      const a = document.createElement('a');
      a.download = `بۆخت-${sid.replace('#', '')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      animated.forEach(el => { el.style.animationPlayState = ''; });
    }
  }

  const fadeClass = `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 relative overflow-hidden">
      <style>{`
        @keyframes poleSlide { from { background-position: 0 0; } to { background-position: 113px 0; } }
      `}</style>

      {/* Status heading */}
      <div className={`flex flex-col items-center gap-3 mt-6 mb-7 ${fadeClass}`} style={{ transitionDelay: '0ms' }}>
        <div className="relative">
          {isCancelled ? (
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-md">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-md">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-emerald-300/30 animate-ping" style={{ animationDuration: '2.5s' }} />
            </>
          )}
        </div>
        <div className="text-center space-y-1.5">
          {isCancelled ? (
            <>
              <h2 className="text-xl font-bold text-slate-900">کاتەکە هەڵوەشاوەتەوە</h2>
              <p className="text-slate-500 text-sm">ئەم کاتی سەردانیکردنە هەڵوەشاندراوەتەوە.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">داواکارییەکەت تۆمار کرا</h2>
              <p className="text-slate-500 text-sm font-medium px-4 leading-relaxed text-center">چاوەڕوان بە تا پەسەند دەکرێت</p>
            </>
          )}
        </div>
      </div>

      {/* ── Ticket Card ── */}
      <div className={`w-full max-w-md ${fadeClass}`} style={{ transitionDelay: '150ms' }}>
        {/* Outer wrapper: holds notch circles outside overflow:hidden */}
        <div className="relative">
          <div className="absolute -left-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '44%', transform: 'translateY(-50%)' }} />
          <div className="absolute -right-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '44%', transform: 'translateY(-50%)' }} />

          <div ref={cardRef} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

            {/* Barber-pole strip — matches homepage ScrollNav */}
            <div
              className="h-2.5 w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, #ef4444, #ef4444 20px, #ffffff 20px, #ffffff 40px, #3b82f6 40px, #3b82f6 60px, #ffffff 60px, #ffffff 80px)',
                backgroundSize: '113px 100%',
                animation: 'poleSlide 2.4s linear infinite',
              }}
            />

            {/* Customer profile */}
            <div className="flex flex-col items-center pt-6 pb-5 px-6 gap-1.5">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full ring-4 ring-blue-500/10 p-1 bg-white shadow-md overflow-hidden">
                {appointment.customers.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appointment.customers.photo_url}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-3xl">
                    {appointment.customers.full_name.charAt(0)}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mt-2">{appointment.customers.full_name}</h3>
              <p className="text-sm text-gray-500 font-medium" dir="ltr">{appointment.customers.phone_number}</p>

              {fbUrl && (
                <a
                  href={fbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold border border-blue-100/50 touch-manipulation active:bg-blue-100 transition-colors"
                >
                  <span>بینینی پرۆفایلی فەیسبووک</span>
                  <ExternalLink size={12} />
                </a>
              )}

              {/* Booking ID + status badge */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-blue-600 font-mono text-xs font-bold tracking-wider">{sid}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                  {STATUS_LABEL[appointment.status] ?? appointment.status}
                </span>
              </div>
            </div>

            {/* Tear line */}
            <div className="border-t-2 border-dashed border-gray-200 mx-4" />

            {/* 2×2 Details grid */}
            <div className="grid grid-cols-2 gap-3 p-4" dir="rtl">

              {/* Date */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl flex-shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">بەروار</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight">{formattedDate}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">کات</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight">{formattedTime}</p>
                </div>
              </div>

              {/* Barber / shop */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl flex-shrink-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt=""
                      crossOrigin="anonymous"
                      className="w-[18px] h-[18px] object-cover rounded-md"
                    />
                  ) : (
                    <Scissors size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">سەرتاش</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight truncate">{shopName}</p>
                </div>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${statusStyle.bg} ${statusStyle.border}`}>
                <div className={`p-2 rounded-xl flex-shrink-0 ${statusStyle.iconBg}`}>
                  <CheckCircle size={18} className={statusStyle.text} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-medium opacity-70 ${statusStyle.text}`}>دۆخ</p>
                  <p className={`text-sm font-bold mt-0.5 leading-tight ${statusStyle.text}`}>
                    {STATUS_LABEL[appointment.status] ?? appointment.status}
                  </p>
                </div>
              </div>

            </div>

            {/* Tear line 2 */}
            <div className="border-t-2 border-dashed border-gray-200 mx-4" />

            {/* QR + barcode footer */}
            {!isCancelled && origin && (
              <div className="flex flex-col items-center gap-3 py-5 px-6">
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-inner">
                  <QRCodeCanvas value={apptUrl} size={120} bgColor="#f8fafc" fgColor="#0f172a" level="M" />
                </div>
                {/* Decorative barcode */}
                <div
                  className="w-48 h-8 opacity-60 rounded-sm"
                  style={{
                    background: 'repeating-linear-gradient(90deg,#1e293b 0px,#1e293b 2px,transparent 2px,transparent 4px,#1e293b 4px,#1e293b 5px,transparent 5px,transparent 8px,#1e293b 8px,#1e293b 9px,transparent 9px,transparent 12px)',
                  }}
                />
                <p className="text-xs font-mono text-gray-400 tracking-[0.25em]">{shopName}</p>
              </div>
            )}

            {/* Reminder / cancellation note */}
            <div className="px-5 pb-4">
              {!isCancelled ? (
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-2.5">
                  <p className="text-blue-700 font-bold text-xs text-center">تکایە ٥ خولەک زووتر ئامادەبە</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-2.5">
                  <p className="text-red-600 font-bold text-xs text-center">بۆ تۆمارکردنی کاتێکی نوێ دەتوانیت دووبارە هەوڵبدەیت.</p>
                </div>
              )}
            </div>

            {/* Download */}
            {!isCancelled && (
              <div className="px-5 pb-5">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-sm font-bold active:bg-slate-50 transition-colors touch-manipulation"
                >
                  <Download className="w-4 h-4" />
                  داگرتنی کیوئار
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`w-full max-w-md mt-4 space-y-3 ${fadeClass}`} style={{ transitionDelay: '300ms' }}>
        <Link
          href="/my-bookings"
          className="flex items-center justify-center gap-2.5 w-full h-14 rounded-2xl bg-red-500 text-white font-bold text-base active:bg-red-600 active:scale-[0.98] transition-all touch-manipulation select-none shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          بینین و دڵنیاکردنەوەی کاتی سەردانیکردن
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 w-full h-14 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-base active:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation select-none shadow-sm"
        >
          <Home className="w-4 h-4" />
          سەرەتا
        </Link>
      </div>
    </div>
  );
}
