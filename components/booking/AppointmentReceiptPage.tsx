'use client';

import type { AppointmentFull } from '@/lib/types';
import { Calendar, CheckCircle2, Clock, Download, Home, RotateCcw, Scissors, XCircle } from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { formatTimeFull } from './DateTimePicker';
import html2canvas from 'html2canvas';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'دڵنیاکراوە',
  pending:   'چاوەڕوانکردن',
  cancelled: 'هەڵوەشاوە',
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-500 text-white',
  pending:   'bg-amber-400 text-white',
  cancelled: 'bg-red-500 text-white',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return formatTimeFull(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const time = `${h12}:${String(d.getMinutes()).padStart(2,'0')} ${ampm}`;
  return `${date} — ${time}`;
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

  const apptUrl    = `${origin}/appointment/${appointment.id}`;
  const sid        = shortId(appointment.id);
  const isCancelled = appointment.status === 'cancelled';

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

    // Pre-load Kurdish font
    try {
      const kFont = new FontFace('UniSalar', 'url(/font/kurdish.ttf)');
      await kFont.load();
      document.fonts.add(kFont);
    } catch { /* already loaded or unavailable */ }

    // Fetch all cross-origin images as data URLs BEFORE html2canvas runs.
    // This is the only reliable way to bypass CORS taint in html2canvas —
    // data URLs are same-origin so the canvas is never tainted.
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
      } catch {
        return url; // fallback — image may still be blank but won't crash
      }
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

    // Pause spinning animations so the ring is crisp in the snapshot
    const animated = cardRef.current.querySelectorAll<HTMLElement>('[style*="animation"]');
    animated.forEach(el => { el.style.animationPlayState = 'paused'; });

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: false,      // not needed — all images are now data URLs
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        onclone: (clonedDoc, clonedEl) => {
          // Inject font + fix RTL text shaping
          const style = clonedDoc.createElement('style');
          style.textContent = `
            @font-face {
              font-family: 'UniSalar';
              src: url('/font/kurdish.ttf') format('truetype');
              font-display: block;
            }
            * {
              letter-spacing: normal !important;
              font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "clig" 1 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
          clonedDoc.body.style.direction = 'rtl';

          // Swap every image src for its pre-fetched data URL
          clonedEl.querySelectorAll<HTMLImageElement>('img').forEach(img => {
            const dataUrl = urlMap.get(img.src);
            if (dataUrl) img.src = dataUrl;
            if (!img.style.width)  img.style.width  = `${img.offsetWidth  || img.naturalWidth  || 64}px`;
            if (!img.style.height) img.style.height = `${img.offsetHeight || img.naturalHeight || 64}px`;
          });

          // Pause animations in the clone too
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

      <style>{`@keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

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
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
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
              <p className="text-slate-500 text-sm font-medium px-4 leading-relaxed text-center">
                چاوەڕوان بە تا پەسەند دەکرێت
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Premium Boarding Pass ── */}
      <div className={`w-full max-w-sm ${fadeClass}`} style={{ transitionDelay: '150ms' }}>

        {/* Outer wrapper — holds notch circles outside overflow:hidden */}
        <div className="relative">

          {/* Perforated notches at price divider (~73% down) */}
          <div className="absolute -left-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '72%', transform: 'translateY(-50%)' }} />
          <div className="absolute -right-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '72%', transform: 'translateY(-50%)' }} />

          <div id="visitor-pass-card" ref={cardRef} className={`bg-white rounded-3xl border shadow-[0_15px_40px_rgba(0,0,0,0.06)] overflow-hidden ${isCancelled ? 'border-red-200' : 'border-slate-100'}`}>

            {/* Top barber-pole strip */}
            <div
              className="h-2.5 w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg,#ef4444,#ef4444 10px,#ffffff 10px,#ffffff 20px,#3b82f6 20px,#3b82f6 30px,#ffffff 30px,#ffffff 40px)',
                backgroundSize: '57px 100%',
              }}
            />

            {/* Shop identity */}
            <div className="flex flex-col items-center gap-2 pt-5 pb-4">
              <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
                {/* Spinning ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
                    animation: 'ringRotate 4s linear infinite',
                  }}
                />
                {/* White gap ring */}
                <div
                  className="absolute rounded-full bg-white"
                  style={{ inset: '2.5px' }}
                />
                {/* Logo image — plain <img> with explicit px size for html2canvas */}
                <div
                  className="absolute rounded-full bg-slate-100"
                  style={{ inset: '4.5px', overflow: 'hidden' }}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={shopName}
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                      <Scissors className="w-5 h-5 text-blue-500" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-slate-800 font-bold text-sm tracking-wide">{shopName}</p>
            </div>

            {/* Tear line — before customer */}
            <div className="border-t-2 border-dashed border-slate-900 mx-4 my-0" />

            {/* Customer identity — centered, avatar top */}
            <div className="flex flex-col items-center gap-2 px-5 pt-5 pb-4">

              {/* Customer avatar — centered, larger */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-sm">
                {appointment.customers.photo_url ? (
                  <img src={appointment.customers.photo_url} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-2xl">
                    {appointment.customers.full_name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-slate-900 font-bold text-base leading-tight">{appointment.customers.full_name}</p>
                <p className="text-slate-400 text-xs" dir="ltr">{appointment.customers.phone_number}</p>
                {fbUrl && (
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 text-[0.65rem] font-semibold text-[#1877F2] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg touch-manipulation"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 flex-shrink-0"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    پرۆفایلی فەیسبووک
                  </a>
                )}
              </div>
            </div>

            {/* Booking code + status row */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[appointment.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[appointment.status] ?? appointment.status}
              </span>
              <span className="text-blue-600 font-mono text-sm font-bold tracking-wider">{sid}</span>
            </div>

            {/* Submitted at */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-slate-50/60" dir="rtl">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider">کاتی تۆمارکردن</p>
              <p className="text-[11px] font-semibold text-slate-500 font-mono" dir="ltr">{formatCreatedAt(appointment.created_at)}</p>
            </div>

            {/* Date + Time cards */}
            <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-slate-100" dir="rtl">
              {/* Date */}
              <div className="flex flex-col items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl py-4 px-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[10px] font-bold text-blue-400 tracking-wider">بەروار</p>
                <p className="text-base font-extrabold text-slate-800 leading-tight">{formattedDate}</p>
              </div>
              {/* Time */}
              <div className="flex flex-col items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl py-4 px-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold text-emerald-400 tracking-wider">کات</p>
                <p className="text-base font-extrabold text-slate-800 leading-tight">{formattedTime}</p>
              </div>
            </div>

            {/* QR code */}
            {origin && !isCancelled && (
              <div className="flex flex-col items-center gap-2 px-5 pb-4">
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 shadow-inner">
                  <QRCodeCanvas value={apptUrl} size={148} bgColor="#f8fafc" fgColor="#0f172a" level="M" />
                </div>
                <p className="text-slate-400 text-[0.58rem] tracking-wider text-center">کۆدی تایبەت بە کاتی سەردانیکردن</p>
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
      <div className={`w-full max-w-sm mt-4 space-y-3 ${fadeClass}`} style={{ transitionDelay: '300ms' }}>
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
