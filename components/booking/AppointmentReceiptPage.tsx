'use client';

import type { AppointmentFull } from '@/lib/types';
import { Calendar, CheckCircle2, Clock, Download, MessageCircle, RotateCcw, Scissors, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { formatTimeFull } from './DateTimePicker';

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

function shortId(id: string) {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface Props {
  appointment: AppointmentFull;
  shopName: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
  confirmUrl: string;
  cancelUrl: string;
}

export default function AppointmentReceiptPage({ appointment, shopName, logoUrl, whatsappNumber }: Props) {
  const [mounted, setMounted]             = useState(false);
  const [origin, setOrigin]               = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

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

  const adminUrl = `${origin}/admin/dashboard?tab=appointments`;

  const wa = encodeURIComponent(
    `داواکاری نوێی\n` +
    `ناو: ${appointment.customers.full_name}\n` +
    `ڕۆژ: ${formattedDate}\n` +
    `کات: ${formattedTime}\n` +
    `تەلەفۆن: ${appointment.customers.phone_number}\n` +
    `ژمارە: ${sid}\n` +
    (fbUrl ? `فەیس بووک: ${fbUrl}\n` : '') +
    `\n>>>> ئادمین پانێڵ\n` +
    adminUrl
  );

  async function handleDownload() {
    const qrCanvas = qrRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (!qrCanvas) return;

    const kFont = new FontFace('KurdishFont', 'url(/font/kurdish.ttf)');
    await kFont.load();
    document.fonts.add(kFont);
    const F = (size: number, weight = 400) =>
      `${weight === 700 ? 'bold ' : weight === 600 ? '600 ' : ''}${size}px KurdishFont, system-ui, Arial`;

    const loadImg = (src: string) => new Promise<HTMLImageElement | null>(res => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });

    const [logoImg, photoImg] = await Promise.all([
      logoUrl                         ? loadImg(logoUrl)                         : Promise.resolve(null),
      appointment.customers.photo_url ? loadImg(appointment.customers.photo_url) : Promise.resolve(null),
    ]);

    const W = 520, PAD = 36;
    const QR_SZ = 180, QR_PAD = 14;
    const QR_FRAME_H = QR_SZ + QR_PAD * 2;

    // Pre-compute total height to match card sections
    const H =
      10                              // stripe
      + 20 + 56 + 8 + 22 + 16        // shop identity
      + 16                            // gap after tear1
      + 20 + 80 + 10 + 24 + 6 + 18 + 8  // customer (avatar + name + phone)
      + (fbUrl ? 26 + 16 : 16)       // FB button or pb-4
      + 12 + 28 + 12                  // status + code row
      + 14 + 20 + 14                  // date row
      + 14 + 20 + 14                  // time row
      + 4 + 16                        // tear2
      + (!isCancelled ? 16 + QR_FRAME_H + 8 + 18 + 16 + 42 + 20 : 0)
      + 20;                           // bottom padding

    const cv  = document.createElement('canvas');
    cv.width  = W; cv.height = H;
    const ctx = cv.getContext('2d')!;

    // ── Helpers ──
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    };
    const circ = (cx: number, cy: number, r: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    };
    const drawStripe = (sy: number, sh: number) => {
      const seg = 14, cols = ['#ef4444', '#ffffff', '#3b82f6', '#ffffff'], span = seg * cols.length;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, sy, W, sh); ctx.clip();
      for (let x = -sh; x < W + span; x += span)
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x + i*seg, sy); ctx.lineTo(x + i*seg + seg, sy);
          ctx.lineTo(x + i*seg + seg + sh, sy + sh); ctx.lineTo(x + i*seg + sh, sy + sh);
          ctx.closePath(); ctx.fill();
        });
      ctx.restore();
    };
    const drawDash = (dy: number) => {
      ctx.save();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    };
    const drawHLine = (ly: number) => {
      ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    };

    // ── Background ──
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let y = 0;

    // 1. Barber-pole stripe
    drawStripe(y, 10);
    y += 10;

    // 2. Shop identity: spinning conic ring + logo + name
    y += 20;
    const logoR = 28, logoCX = W / 2, logoCY = y + logoR;
    // Ring segments: red, white, blue, white
    [['#ef4444', -Math.PI * 0.5, Math.PI * 0.6], ['#f8fafc', Math.PI * 0.6, Math.PI * 1.0],
     ['#3b82f6', Math.PI * 1.0, Math.PI * 1.6],  ['#f8fafc', Math.PI * 1.6, Math.PI * 1.9]
    ].forEach(([color, start, end]) => {
      ctx.beginPath();
      ctx.arc(logoCX, logoCY, logoR + 4, start as number, end as number);
      ctx.strokeStyle = color as string; ctx.lineWidth = 7; ctx.stroke();
    });
    circ(logoCX, logoCY, logoR + 1); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.save();
    circ(logoCX, logoCY, logoR); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.clip();
    if (logoImg) {
      ctx.drawImage(logoImg, logoCX - logoR, logoCY - logoR, logoR * 2, logoR * 2);
    } else {
      ctx.fillStyle = '#3b82f6'; ctx.font = F(logoR * 0.8, 700);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✂', logoCX, logoCY);
    }
    ctx.restore();
    y += logoR * 2 + 8;
    ctx.fillStyle = '#1e293b'; ctx.font = F(18, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
    ctx.fillText(shopName, W / 2, y + 11);
    y += 22 + 16;

    // 3. Dashed tear line
    drawDash(y);
    y += 16;

    // 4. Customer identity: centered avatar + name + phone + FB
    y += 20;
    const avR = 40, avCX = W / 2, avCY = y + avR;
    ctx.save();
    circ(avCX, avCY, avR + 2); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
    circ(avCX, avCY, avR); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.clip();
    if (photoImg) {
      ctx.drawImage(photoImg, avCX - avR, avCY - avR, avR * 2, avR * 2);
    } else {
      ctx.fillStyle = '#3b82f6'; ctx.font = F(avR, 700);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(appointment.customers.full_name.charAt(0).toUpperCase(), avCX, avCY);
    }
    ctx.restore();
    y += avR * 2 + 10;
    ctx.fillStyle = '#0f172a'; ctx.font = F(20, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText(appointment.customers.full_name, W / 2, y + 12);
    y += 24 + 6;
    ctx.fillStyle = '#94a3b8'; ctx.font = F(14);
    ctx.textAlign = 'center'; ctx.direction = 'ltr';
    ctx.fillText(appointment.customers.phone_number, W / 2, y + 9);
    y += 18 + 8;
    if (fbUrl) {
      const fbLabel = 'پرۆفایلی فەیسبووک';
      ctx.font = F(13, 600);
      const fbTw = ctx.measureText(fbLabel).width;
      const bW = fbTw + 40, bH = 26, bX = W / 2 - bW / 2;
      rr(bX, y, bW, bH, 8);
      ctx.fillStyle = '#eff6ff'; ctx.fill();
      ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1877F2';
      ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
      ctx.fillText(fbLabel, W / 2 + 4, y + bH / 2);
      y += bH + 16;
    } else {
      y += 16;
    }

    // 5. Status pill + booking code
    drawHLine(y);
    y += 12;
    const statusBg: Record<string, string> = { confirmed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444' };
    const sBg = statusBg[appointment.status] ?? '#94a3b8';
    const sTxt = STATUS_LABEL[appointment.status] ?? appointment.status;
    ctx.font = F(13, 700);
    const sTw = ctx.measureText(sTxt).width;
    const sPW = sTw + 24, sPH = 28;
    rr(PAD, y, sPW, sPH, 100); ctx.fillStyle = sBg; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText(sTxt, PAD + 12, y + sPH / 2);
    ctx.fillStyle = '#2563eb'; ctx.font = F(16, 700);
    ctx.textAlign = 'right'; ctx.direction = 'ltr';
    ctx.fillText(sid, W - PAD, y + sPH / 2);
    y += sPH + 12;

    // 6. Date row
    drawHLine(y); y += 14;
    ctx.fillStyle = '#1e293b'; ctx.font = F(16, 700);
    ctx.textAlign = 'right'; ctx.direction = 'ltr'; ctx.textBaseline = 'middle';
    ctx.fillText(formattedDate, W - PAD, y + 10);
    ctx.fillStyle = '#94a3b8'; ctx.font = F(12, 700);
    ctx.textAlign = 'left'; ctx.direction = 'rtl';
    ctx.fillText('بەروار', PAD, y + 10);
    y += 20 + 14;

    // 7. Time row
    drawHLine(y); y += 14;
    ctx.fillStyle = '#1e293b'; ctx.font = F(16, 700);
    ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
    ctx.fillText(formattedTime, W - PAD, y + 10);
    ctx.fillStyle = '#94a3b8'; ctx.font = F(12, 700);
    ctx.textAlign = 'left'; ctx.direction = 'rtl';
    ctx.fillText('کات', PAD, y + 10);
    y += 20 + 14;

    // 8. Second dashed tear line
    y += 4; drawDash(y); y += 16;

    // 9. QR + caption + reminder
    if (!isCancelled) {
      y += 16;
      const qrFX = W / 2 - (QR_SZ + QR_PAD * 2) / 2;
      rr(qrFX, y, QR_SZ + QR_PAD * 2, QR_FRAME_H, 16);
      ctx.fillStyle = '#f8fafc'; ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrCanvas, qrFX + QR_PAD, y + QR_PAD, QR_SZ, QR_SZ);
      ctx.imageSmoothingEnabled = true;
      y += QR_FRAME_H + 8;
      ctx.fillStyle = '#94a3b8'; ctx.font = F(12);
      ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
      ctx.fillText('کۆدی تایبەت بە کاتی سەردانیکردن', W / 2, y + 9);
      y += 18 + 16;
      const noteH = 42;
      rr(PAD, y, W - PAD * 2, noteH, 16);
      ctx.fillStyle = '#eff6ff'; ctx.fill();
      ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1d4ed8'; ctx.font = F(14, 700);
      ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
      ctx.fillText('تکایە ٥ خولەک زووتر ئامادەبە', W / 2, y + noteH / 2);
    }

    const a = document.createElement('a');
    a.download = `بۆخت-${sid.replace('#', '')}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
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

          <div className={`bg-white rounded-3xl border shadow-[0_15px_40px_rgba(0,0,0,0.06)] overflow-hidden ${isCancelled ? 'border-red-200' : 'border-slate-100'}`}>

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
              <div className="relative w-14 h-14 flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
                    animation: 'ringRotate 4s linear infinite',
                  }}
                />
                <div className="absolute inset-[2.5px] rounded-full bg-white">
                  <div className="absolute inset-[2px] rounded-full overflow-hidden bg-slate-100">
                    {logoUrl ? (
                      <Image src={logoUrl} alt={shopName} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Scissors className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-slate-800 font-bold text-sm tracking-wide">{shopName}</p>
            </div>

            {/* Tear line — before customer */}
            <div className="border-t-2 border-dashed border-slate-100 mx-4 my-0" />

            {/* Customer identity — centered, avatar top */}
            <div className="flex flex-col items-center gap-2 px-5 pt-5 pb-4">

              {/* Customer avatar — centered, larger */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-sm">
                {appointment.customers.photo_url ? (
                  <img src={appointment.customers.photo_url} alt="" className="w-full h-full object-cover" />
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

            {/* Date + Time rows */}
            <div className="divide-y divide-slate-100 border-t border-slate-100" dir="rtl">
              {[
                { icon: Calendar, label: 'بەروار', value: formattedDate, color: 'text-blue-400' },
                { icon: Clock,    label: 'کات',    value: formattedTime, color: 'text-emerald-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-sm font-extrabold text-slate-800">{value}</p>
                  <div className="flex items-center gap-2 text-slate-400">
                    <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
                    <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
                  </div>
                </div>
              ))}
            </div>

            {/* QR code */}
            {origin && !isCancelled && (
              <div className="flex flex-col items-center gap-2 px-5 pb-4">
                <div ref={qrRef} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 shadow-inner">
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
        {!isCancelled && (
          <a
            href={whatsappNumber
              ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${wa}`
              : `https://wa.me/?text=${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl font-bold text-base text-white active:scale-[0.98] transition-all touch-manipulation select-none shadow-md"
            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>داواکاریەکەت بنێرە بۆ وەتسئاپ</span>
          </a>
        )}
        <Link
          href="/book"
          className="flex items-center justify-center gap-2.5 w-full h-14 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-base active:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation select-none shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          کاتی سەردانیکردنێکی دیکە وەربگرە
        </Link>
      </div>
    </div>
  );
}
