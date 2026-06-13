'use client';

import type { Customer } from '@/lib/types';
import { Calendar, ChevronRight, Clock, Loader2, User } from 'lucide-react';
import { formatTimeFull } from './DateTimePicker';

const MONTH_LONG = ['کانونی دووەم','شوبات','ئازار','نیسان','ئایار','حوزەیران',
                    'تەممووز','ئاب','ئەیلوول','تشرینی یەکەم','تشرینی دووەم','کانونی یەکەم'];
const DAY_LONG   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];

function formatDate(d: Date) {
  return `${DAY_LONG[d.getDay()]}، ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  customer: Customer | null;
  date: Date;
  time: string;
  confirming: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function BookingSummary({ customer, date, time, confirming, onBack, onConfirm }: Props) {
  const rows = [
    ...(customer ? [{ icon: User,     label: 'کڕیار', value: customer.full_name }] : []),
    {              icon: Calendar,    label: 'ڕۆژ',   value: formatDate(date)    },
    {              icon: Clock,       label: 'کات',   value: formatTimeFull(time) },
  ] as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="flex flex-col min-h-[calc(100vh-2px)] bg-neutral-950 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-64 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-10 pb-6 relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/35 text-sm mb-6 active:text-white/70 transition-colors touch-manipulation"
        >
          <ChevronRight className="w-4 h-4" />
          گۆڕینی کات
        </button>
        <p className="text-amber-500/60 text-xs tracking-[0.35em] mb-1 text-right">هەنگاوی ٢ لە ٢</p>
        <h2 className="text-[1.75rem] font-bold text-white leading-tight text-right">
          پشکنین و <span className="text-amber-500">دڵنیاکردنەوە</span>
        </h2>
      </div>

      <div className="flex-1 px-4 pb-48 space-y-4 relative z-10">
        {/* Summary card */}
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
          <div className="divide-y divide-white/5">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white/30 text-[0.65rem] tracking-wider">{label}</p>
                  <p className="text-white text-sm font-semibold mt-0.5 truncate">{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs text-center px-4 leading-relaxed">
          تکایە ٥ خولەک زووتر ئامادەبە
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-14 pb-6 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pointer-events-none z-20">
        <button
          disabled={confirming}
          onClick={onConfirm}
          className={[
            'relative w-full py-[18px] rounded-2xl font-bold text-base overflow-hidden pointer-events-auto touch-manipulation transition-all duration-200 select-none',
            confirming
              ? 'bg-amber-500/30 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_40px_rgba(245,158,11,0.3),0_4px_20px_rgba(245,158,11,0.2)] active:scale-[0.98]',
          ].join(' ')}
        >
          {!confirming && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />}
          <span className="relative z-10 flex items-center justify-center gap-2.5">
            {confirming
              ? <><Loader2 className="w-5 h-5 animate-spin" /> دڵنیاکردنەوە...</>
              : 'کاتی سەردانیکردن دڵنیا بکەرەوە'
            }
          </span>
        </button>
      </div>
    </div>
  );
}
