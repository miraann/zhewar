'use client';

import type { AppointmentFull } from '@/lib/types';
import { Calendar, CheckCircle2, Clock, Download, MessageCircle, RotateCcw, Scissors, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { formatTimeFull } from './DateTimePicker';

const DAY_SHORT = ['یەکشەمە','دووشەمە','سێشەمە','چوارشەمە','پێنجشەمە','هەینی','شەمە'];

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'دڵنیاکراوە',
  pending:   'چاوەڕوانکردن',
  cancelled: 'هەڵوەشاوە',
};

function toAr(n: number) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${DAY_SHORT[d.getDay()]} /${toAr(d.getMonth() + 1)}/${toAr(d.getDate())}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return formatTimeFull(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
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

export default function AppointmentReceiptPage({ appointment, shopName, logoUrl, whatsappNumber, confirmUrl, cancelUrl }: Props) {
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

  const apptUrl   = `${origin}/appointment/${appointment.id}`;
  const sid       = shortId(appointment.id);
  const isCancelled = appointment.status === 'cancelled';

  const wa = encodeURIComponent(
    `📋 *داواکاری نوێی کاتی سەردانیکردن — ${shopName}*\n\n` +
    `👤 *ناو:* ${appointment.customers.full_name}\n` +
    `📅 *ڕۆژ:* ${formattedDate}\n` +
    `⏰ *کات:* ${formattedTime}\n` +
    `📱 *تەلەفۆن:* ${appointment.customers.phone_number}\n` +
    `🔢 *ژمارە:* ${sid}\n\n` +
    `─────────────────\n` +
    `✅ *پەسەندکردن:*\n${confirmUrl}\n\n` +
    `❌ *هەڵوەشاندنەوە:*\n${cancelUrl}`
  );

  async function handleDownload() {
    const qrCanvas = qrRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (!qrCanvas) return;

    const kFont = new FontFace('KurdishFont', 'url(/font/kurdish.ttf)');
    await kFont.load();
    document.fonts.add(kFont);
    const F = (size: number, weight = 400) => `${weight === 700 ? 'bold ' : weight === 600 ? '600 ' : ''}${size}px KurdishFont, system-ui, Arial`;

    const fbId = appointment.customers.facebook_id;
    const rows: [string, string][] = [
      ['ڕۆژ',    formattedDate],
      ['کات',     formattedTime],
      ['تەلەفۆن', appointment.customers.phone_number],
      ...(fbId ? [['Facebook', fbId.replace(/^https?:\/\/(www\.)?/, '').slice(0, 38)] as [string, string]] : []),
    ];

    const W = 520;
    const cardY = 360, rowH = 48, cardH = rows.length * rowH + 20;
    const qrY   = cardY + cardH + 32;
    const qrSz  = 200;
    const H     = qrY + qrSz + 52 + 40 + 3;

    const cv  = document.createElement('canvas');
    cv.width  = W; cv.height = H;
    const ctx = cv.getContext('2d')!;

    const loadImg = (src: string) => new Promise<HTMLImageElement | null>(res => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    };

    const circ = (cx: number, cy: number, r: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    };

    const stripe = (yy: number, hh: number) => {
      const seg  = 14;
      const cols = ['#DC2626', '#FFFFFF', '#2563EB', '#FFFFFF'];
      const span = seg * cols.length;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, yy, W, hh); ctx.clip();
      for (let x = -hh; x < W + span; x += span)
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x + i*seg,       yy);
          ctx.lineTo(x + i*seg + seg,  yy);
          ctx.lineTo(x + i*seg + seg + hh, yy + hh);
          ctx.lineTo(x + i*seg + hh,   yy + hh);
          ctx.closePath(); ctx.fill();
        });
      ctx.restore();
    };

    const [logoImg, photoImg] = await Promise.all([
      logoUrl                              ? loadImg(logoUrl)                              : Promise.resolve(null),
      appointment.customers.photo_url      ? loadImg(appointment.customers.photo_url)      : Promise.resolve(null),
    ]);

    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, 0, W, H);

    const topGlow = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 380);
    topGlow.addColorStop(0, 'rgba(220,38,38,0.06)');
    topGlow.addColorStop(1, 'rgba(249,250,251,0)');
    ctx.fillStyle = topGlow; ctx.fillRect(0, 0, W, 380);

    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, 190);

    const lx = W/2, ly = 66, lr = 46;
    ctx.save();
    circ(lx, ly, lr);
    ctx.fillStyle = '#FEF3C7'; ctx.fill();
    ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.clip();
    if (logoImg) {
      ctx.drawImage(logoImg, lx - lr, ly - lr, lr * 2, lr * 2);
    } else {
      ctx.fillStyle = '#D97706'; ctx.font = F(34, 700);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✂', lx, ly);
    }
    ctx.restore();

    ctx.fillStyle = '#111827'; ctx.font = F(27, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.direction = 'ltr';
    ctx.fillText(shopName, W/2, 126);

    const bY = 190, bH = 34;
    stripe(bY, bH);

    ctx.font = F(13, 700); ctx.textBaseline = 'middle';

    const bandText = (text: string, x: number, align: CanvasTextAlign, dir: CanvasDirection) => {
      ctx.textAlign = align; ctx.direction = dir;
      const tw = ctx.measureText(text).width;
      const pad = 8, ph = 20, pr2 = 5;
      const bx = align === 'left' ? x - pad : x - tw - pad;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.beginPath(); ctx.roundRect(bx, bY + (bH - ph) / 2, tw + pad * 2, ph, pr2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, x, bY + bH / 2);
    };

    bandText(sid, 14, 'left', 'ltr');
    bandText('ژمارەی کاتی سەردانیکردن', W - 14, 'right', 'rtl');

    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 224, W, 132);

    const px = W/2, py = 274, pr = 38;
    ctx.save();
    circ(px, py, pr);
    ctx.fillStyle = '#E5E7EB'; ctx.fill();
    ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    if (photoImg) {
      ctx.drawImage(photoImg, px - pr, py - pr, pr * 2, pr * 2);
    } else {
      ctx.fillStyle = '#6B7280'; ctx.font = F(pr, 700);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(appointment.customers.full_name.charAt(0).toUpperCase(), px, py);
    }
    ctx.restore();

    ctx.fillStyle = '#111827'; ctx.font = F(22, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText(appointment.customers.full_name, W/2, 328);

    const cardX = 40, cW = W - 80;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.07)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5;
    rr(cardX, cardY, cW, cardH, 18); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1.5;
    rr(cardX, cardY, cW, cardH, 18); ctx.stroke();

    rows.forEach(([label, value], i) => {
      const ry  = cardY + i * rowH + 10;
      const my  = ry + rowH / 2;
      if (i > 0) {
        ctx.strokeStyle = '#F3F4F6'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cardX + 24, ry); ctx.lineTo(cardX + cW - 24, ry); ctx.stroke();
      }
      ctx.fillStyle = '#9CA3AF'; ctx.font = F(13);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      ctx.fillText(label, cardX + cW - 22, my);
      ctx.fillStyle = '#1F2937'; ctx.font = F(14, 600);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
      ctx.fillText(value, cardX + 22, my);
    });

    const qrCX   = W / 2;
    const qrCard = { x: qrCX - qrSz/2 - 28, y: qrY, w: qrSz + 56, h: qrSz + 52 };

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.07)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5;
    rr(qrCard.x, qrCard.y, qrCard.w, qrCard.h, 18); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1.5;
    rr(qrCard.x, qrCard.y, qrCard.w, qrCard.h, 18); ctx.stroke();

    ctx.save();
    rr(qrCard.x, qrCard.y, qrCard.w, 4, 18); ctx.clip();
    const qrAccent = ctx.createLinearGradient(qrCard.x, 0, qrCard.x + qrCard.w, 0);
    qrAccent.addColorStop(0, '#F59E0B'); qrAccent.addColorStop(1, '#D97706');
    ctx.fillStyle = qrAccent; ctx.fillRect(qrCard.x, qrCard.y, qrCard.w, 4);
    ctx.restore();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, qrCX - qrSz/2, qrY + 16, qrSz, qrSz);
    ctx.imageSmoothingEnabled = true;

    ctx.fillStyle = '#9CA3AF'; ctx.font = F(12);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText('کۆدی تایبەت بە کاتی سەردانیکردن', W/2, qrY + qrSz + 36);

    ctx.fillStyle = '#B45309'; ctx.fillRect(0, H - 3, W, 3);

    const a = document.createElement('a');
    a.download = `بۆخت-${sid.replace('#', '')}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  const fadeClass = `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 bg-neutral-950 relative overflow-hidden">

      {/* Ambient glows */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${isCancelled ? 'bg-red-500/8' : 'bg-amber-500/10'}`} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Status heading */}
      <div className={`flex flex-col items-center gap-3 mt-6 mb-7 ${fadeClass}`} style={{ transitionDelay: '0ms' }}>
        <div className="relative">
          {isCancelled ? (
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.15)]">
              <XCircle className="w-9 h-9 text-red-400" />
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <CheckCircle2 className="w-9 h-9 text-amber-400" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-amber-400/15 animate-ping" style={{ animationDuration: '2.5s' }} />
            </>
          )}
        </div>
        <div className="text-center space-y-1.5">
          {isCancelled ? (
            <>
              <h2 className="text-xl font-bold text-white">کاتەکە هەڵوەشاوەتەوە</h2>
              <p className="text-white/35 text-sm">ئەم کاتی سەردانیکردنە هەڵوەشاندراوەتەوە.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">داواکارییەکەت تۆمار کرا</h2>
              <p className="text-amber-400/70 text-sm font-medium px-4 leading-relaxed text-center">
                چاوەڕوان بە تا بەربەر پەسەند بکات
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Single unified ticket card ── */}
      <div className={`w-full max-w-sm ${fadeClass}`} style={{ transitionDelay: '150ms' }}>
        <div className={`rounded-3xl border overflow-hidden backdrop-blur-md shadow-[0_0_60px_rgba(245,158,11,0.06)] ${
          isCancelled ? 'border-red-500/15 bg-red-500/5' : 'border-amber-500/15 bg-white/[0.04]'
        }`}>

          {/* ─── Top gold stripe ─── */}
          <div className={`h-[2px] ${isCancelled
            ? 'bg-gradient-to-r from-red-500/0 via-red-400 to-red-500/0'
            : 'bg-gradient-to-r from-amber-600/0 via-amber-400 to-amber-600/0'}`}
          />

          {/* ─── Shop identity header ─── */}
          <div className="flex flex-col items-center gap-2 pt-5 pb-4 border-b border-white/5">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.2)] flex-shrink-0">
                <Image src={logoUrl} alt={shopName} width={48} height={48} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/25 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-amber-400" />
              </div>
            )}
            <p className="text-white/70 font-semibold text-sm tracking-wide">{shopName}</p>
          </div>

          {/* ─── Ticket ID row ─── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <span className="text-amber-400 font-mono text-sm font-bold tracking-wider">{sid}</span>
            <span className="text-white/20 text-[0.6rem] tracking-widest">ژمارەی کاتی سەردانیکردن</span>
          </div>

          {/* ─── Date + Time ─── */}
          {[
            { icon: Calendar, label: 'ڕۆژ', value: formattedDate },
            { icon: Clock,    label: 'کات',  value: formattedTime },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <span className="text-white text-sm font-semibold max-w-[55%] truncate">{value}</span>
              <span className="flex items-center gap-2 text-white/35 text-sm">
                {label}
                <Icon className="w-3.5 h-3.5 text-amber-500/50 flex-shrink-0" />
              </span>
            </div>
          ))}

          {/* ─── Status ─── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              appointment.status === 'confirmed'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : appointment.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
            <span className="text-white/35 text-sm">حاڵەت</span>
          </div>

          {/* ─── Tear-off stub divider ─── */}
          <div className="relative flex items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-950 border border-amber-500/10 -ml-3 flex-shrink-0" />
            <div className="flex-1 border-t border-dashed border-white/8 mx-1" />
            <div className="w-6 h-6 rounded-full bg-neutral-950 border border-amber-500/10 -mr-3 flex-shrink-0" />
          </div>

          {/* ─── Customer + QR stub ─── */}
          <div className="flex flex-col items-center gap-4 px-5 py-5">

            {/* Customer chip */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/25 flex-shrink-0 bg-amber-500/10">
                {appointment.customers.photo_url ? (
                  <img src={appointment.customers.photo_url} alt={appointment.customers.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold text-base">
                    {appointment.customers.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-sm leading-tight">{appointment.customers.full_name}</p>
                <p className="text-white/30 text-xs mt-0.5">{appointment.customers.phone_number}</p>
              </div>
            </div>

            {/* QR code — only when not cancelled and origin loaded */}
            {origin && !isCancelled ? (
              <>
                <div ref={qrRef} className="p-3 rounded-2xl border border-amber-500/30 bg-white shadow-[0_0_30px_rgba(245,158,11,0.18)]">
                  <QRCodeCanvas
                    value={apptUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#0a0a0a"
                    level="M"
                  />
                </div>
                <p className="text-white/20 text-[0.6rem] text-center tracking-wider">
                  کۆدی تایبەت بە کاتی سەردانیکردن
                </p>
              </>
            ) : (
              !isCancelled && (
                <div className="w-40 h-40 rounded-2xl bg-white/5 border border-white/8 animate-pulse" />
              )
            )}

            {/* Note */}
            {!isCancelled ? (
              <div className="w-full rounded-2xl bg-amber-500/8 border border-amber-500/15 px-4 py-2.5">
                <p className="text-amber-400/60 text-xs text-center">تکایە ٥ خولەک زووتر ئامادەبە</p>
              </div>
            ) : (
              <div className="w-full rounded-2xl bg-red-500/8 border border-red-500/15 px-4 py-2.5">
                <p className="text-red-400/60 text-xs text-center">بۆ تۆمارکردنی کاتێکی نوێ دەتوانیت دووبارە هەوڵبدەیت.</p>
              </div>
            )}

            {/* Download button — inside card */}
            {!isCancelled && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 text-amber-400 text-sm font-semibold active:bg-amber-500/15 transition-colors touch-manipulation"
              >
                <Download className="w-4 h-4" />
                داگرتنی کیوئار
              </button>
            )}
          </div>

          {/* ─── Bottom gold stripe ─── */}
          <div className={`h-[2px] ${isCancelled
            ? 'bg-gradient-to-r from-red-500/0 via-red-400/50 to-red-500/0'
            : 'bg-gradient-to-r from-amber-600/0 via-amber-500/50 to-amber-600/0'}`}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className={`w-full max-w-sm mt-4 space-y-3 ${fadeClass}`} style={{ transitionDelay: '300ms' }}>
        {!isCancelled && (
          <a
            href={whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${wa}` : `https://wa.me/?text=${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-[18px] rounded-2xl font-bold text-base touch-manipulation active:scale-[0.98] transition-transform select-none"
            style={{ background: 'linear-gradient(135deg,#25D366,#1da851)', boxShadow: '0 4px 24px rgba(37,211,102,0.25)' }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white">لە واتسئاپ بەشبکە</span>
          </a>
        )}
        <Link
          href="/book"
          className="flex items-center justify-center gap-2.5 w-full py-[18px] rounded-2xl border border-white/10 bg-white/5 text-white/50 font-semibold text-base active:bg-white/8 active:scale-[0.98] transition-all touch-manipulation select-none backdrop-blur-sm"
        >
          <RotateCcw className="w-4 h-4" />
          کاتی سەردانیکردنێکی دیکە وەربگرە
        </Link>
      </div>
    </div>
  );
}
