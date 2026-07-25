'use client';

import type { Appointment, Customer } from '@/lib/types';
import { Calendar, CheckCircle2, Clock, MessageCircle, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatTimeFull } from './DateTimePicker';

const MONTH_LONG = ['کانونی دووەم','شوبات','ئازار','نیسان','ئایار','حوزەیران',
                    'تەممووز','ئاب','ئەیلوول','تشرینی یەکەم','تشرینی دووەم','کانونی یەکەم'];
const DAY_LONG   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];

function formatDate(d: Date) {
  return `${DAY_LONG[d.getDay()]}، ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

function shortId(id: string) {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface Props {
  customer: Customer | null;
  date: Date;
  time: string;
  appointment: Appointment;
  onBookAgain: () => void;
}

export default function SuccessReceipt({ customer, date, time, appointment, onBookAgain }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const formattedDate = formatDate(date);
  const formattedTime = formatTimeFull(time);
  const firstName     = customer?.full_name.split(' ')[0];

  const wa = encodeURIComponent(
    `✂️ژێوار محمد – کاتی سەردانیکردن بەسەندکراوە!*\n\n` +
    `📅 *رووژ:* ${formattedDate}\n` +
    `⏰ *کات:* ${formattedTime}\n\n` +
    `ژمارەی کاتی سەردانیکردن: ${shortId(appointment.id)}`
  );
  const waUrl = `https://wa.me/?text=${wa}`;

  return (
    <div className="flex flex-col items-center min-h-screen px-5 py-12 bg-white relative overflow-hidden">
      {/* Soft glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-100/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />

      {/* Success icon */}
      <div className={`relative flex flex-col items-center gap-4 mt-10 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-300/30 animate-ping" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900">
            داواکارییەکەت بەسەرکەوتووی تۆمار کرا
          </h2>
          <p className="text-amber-600 text-sm font-medium px-4 leading-relaxed">
            تکایە چاوەڕوان بە تا بەربەر داواکارییەکەت پەسەند بکات
          </p>
        </div>
      </div>

      {/* Receipt card */}
      <div className={`w-full max-w-sm transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-md overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <span className="text-amber-600 font-mono text-sm font-bold tracking-wider">
              {shortId(appointment.id)}
            </span>
            <span className="text-neutral-400 text-[0.65rem] tracking-widest">ژمارەی کاتی سەردانیکردن</span>
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

          <div className="mx-4 my-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-amber-700 text-xs text-center leading-relaxed">
              تکایە ٥ خولەک زووتر ئامادەبە
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`w-full max-w-sm mt-5 space-y-3 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-[18px] rounded-2xl bg-[#25D366] text-white font-bold text-base shadow-[0_4px_20px_rgba(37,211,102,0.35)] active:scale-[0.98] transition-transform touch-manipulation select-none"
        >
          <MessageCircle className="w-5 h-5" />
          لە واتسئاپ بەشبکە
        </a>
        <button
          onClick={onBookAgain}
          className="flex items-center justify-center gap-2.5 w-full py-[18px] rounded-2xl border-2 border-neutral-200 bg-white text-neutral-700 font-semibold text-base active:bg-neutral-50 active:scale-[0.98] transition-all touch-manipulation select-none shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          کاتی سەردانیکردنێکی دیکە وەربگرە
        </button>
      </div>
    </div>
  );
}
