'use client';

import { useRef, useState, useEffect } from 'react';
import { CheckCircle2, Calendar, Clock, MessageCircle, Download, Scissors, RotateCcw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Link from 'next/link';
import Image from 'next/image';
import type { AppointmentFull } from '@/lib/types';
import { formatTimeFull } from './DateTimePicker';

const MONTH_LONG = ['کانونی دووەم','شوبات','ئازار','نیسان','ئایار','حوزەیران',
                    'تەممووز','ئاب','ئەیلوول','تشرینی یەکەم','تشرینی دووەم','کانونی یەکەم'];
const DAY_LONG   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'دڵنیاکراوە',
  pending:   'چاوەڕوانکردن',
  cancelled: 'هەڵوەشاوە',
};
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${DAY_LONG[d.getDay()]}، ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
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
}

export default function AppointmentReceiptPage({ appointment, shopName, logoUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin]   = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    setOrigin(window.location.origin);
    return () => clearTimeout(t);
  }, []);

  const apptUrl       = `${origin}/appointment/${appointment.id}`;
  const formattedDate = formatDate(appointment.appointment_time);
  const formattedTime = formatTime(appointment.appointment_time);
  const firstName     = appointment.customers.full_name.split(' ')[0];
  const sid           = shortId(appointment.id);

  const wa = encodeURIComponent(
    `✂️ *بەربەری لوکس – نەوبەت دڵنیاکراوە!*\n\n` +
    `📅 *رووژ:* ${formattedDate}\n` +
    `⏰ *کات:* ${formattedTime}\n\n` +
    `ژمارەی نەوبەت: ${sid}`
  );

  function handleDownload() {
    const canvas = qrRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `نەوبەت-${sid.replace('#', '')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  const fadeClass = `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;

  return (
    <div className="flex flex-col items-center min-h-screen px-5 py-12 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-100/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />

      {/* Success icon */}
      <div className={`flex flex-col items-center gap-4 mt-10 mb-8 ${fadeClass}`} style={{ transitionDelay: '0ms' }}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-300/30 animate-ping" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-bold text-neutral-900">بەزووی دیاری دەبین، {firstName}!</h2>
          <p className="text-neutral-500 text-sm">نەوبەتەکەت بەسەرکەوتویی تۆمارکرا.</p>
        </div>
      </div>

      {/* Receipt card */}
      <div className={`w-full max-w-sm ${fadeClass}`} style={{ transitionDelay: '150ms' }}>
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-md overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <span className="text-amber-600 font-mono text-sm font-bold tracking-wider">{sid}</span>
            <span className="text-neutral-400 text-[0.65rem] tracking-widest">ژمارەی نەوبەت</span>
          </div>

          {[
            { icon: Calendar, label: 'رووژ', value: formattedDate },
            { icon: Clock,    label: 'کات',  value: formattedTime },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <span className="text-neutral-900 text-sm font-semibold text-right max-w-[55%] truncate">{value}</span>
              <span className="flex items-center gap-2.5 text-neutral-400 text-sm">
                {label}
                <Icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLOR[appointment.status] ?? 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
            <span className="text-neutral-400 text-sm">حاڵەت</span>
          </div>

          <div className="mx-4 my-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-amber-700 text-xs text-center leading-relaxed">
              دراو لە بەربەرخانە وەردەگیرێت.<br />تکایە ٥ خولەک زووتر بگەیتە.
            </p>
          </div>
        </div>

        {/* QR code card */}
        {origin && (
          <div className={`mt-4 rounded-3xl border border-neutral-200 bg-white shadow-md overflow-hidden ${fadeClass}`} style={{ transitionDelay: '300ms' }}>
            <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

            {/* Shop identity header */}
            <div className="flex flex-col items-center gap-2 pt-5 pb-4 border-b border-neutral-100 bg-gradient-to-b from-amber-50/60 to-white">
              {logoUrl ? (
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-200 shadow-sm flex-shrink-0">
                  <Image src={logoUrl} alt={shopName} width={56} height={56} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-sm">
                  <Scissors className="w-6 h-6 text-amber-500" />
                </div>
              )}
              <div className="text-center">
                <p className="text-neutral-900 font-bold text-sm">{shopName}</p>
                <p className="text-amber-600 font-semibold text-xs mt-0.5">{appointment.customers.full_name}</p>
              </div>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center gap-3 px-5 py-5">
              <div ref={qrRef} className="p-3 rounded-2xl border-2 border-neutral-100 bg-white shadow-inner">
                <QRCodeCanvas
                  value={apptUrl}
                  size={168}
                  bgColor="#ffffff"
                  fgColor="#171717"
                  level="M"
                />
              </div>
              <p className="text-neutral-400 text-[0.6rem] text-center leading-relaxed">
                بەربەرخانەکەت دەتوانێت ئەم کیوئارە بخوێنێتەوە بۆ پشکنینی نەوبەت
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold active:bg-amber-100 transition-colors touch-manipulation"
              >
                <Download className="w-4 h-4" />
                داگرتنی کیوئار
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={`w-full max-w-sm mt-5 space-y-3 ${fadeClass}`} style={{ transitionDelay: '450ms' }}>
        <a
          href={`https://wa.me/?text=${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-[18px] rounded-2xl bg-[#25D366] text-white font-bold text-base shadow-[0_4px_20px_rgba(37,211,102,0.35)] active:scale-[0.98] transition-transform touch-manipulation select-none"
        >
          <MessageCircle className="w-5 h-5" />
          لە واتسئاپ بەشبکە
        </a>
        <Link
          href="/book"
          className="flex items-center justify-center gap-2.5 w-full py-[18px] rounded-2xl border-2 border-neutral-200 bg-white text-neutral-700 font-semibold text-base active:bg-neutral-50 active:scale-[0.98] transition-all touch-manipulation select-none shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          نەوبەتێکی دیکە وەربگرە
        </Link>
      </div>
    </div>
  );
}
