'use client';

import type { Customer } from '@/lib/types';
import { Calendar, CheckCircle, ChevronRight, Clock, ExternalLink, Loader2, Scissors } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTimeFull } from './DateTimePicker';

function formatDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function normalizeFbUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  if (/^\d+$/.test(raw)) return `https://www.facebook.com/profile.php?id=${raw}`;
  return `https://www.facebook.com/${raw}`;
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
  const fbUrl   = normalizeFbUrl(customer?.facebook_id ?? null);
  const [shopName, setShopName]     = useState('');
  const [logoUrl,  setLogoUrl]      = useState<string | null>(null);

  useEffect(() => {
    supabase.from('barber_profile').select('name, logo_url').single()
      .then(({ data }) => {
        if (data?.name)     setShopName(data.name);
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3px)] bg-transparent relative">

      <style>{`
        @keyframes subtle-slide { from { background-position: 0 0; } to { background-position: 40px 0; } }
      `}</style>

      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 text-sm mb-6 active:text-slate-700 transition-colors touch-manipulation"
        >
          <ChevronRight className="w-4 h-4" />
          گۆڕینی کات
        </button>
        <p className="text-blue-600 text-xs tracking-[0.35em] mb-1 text-right font-medium">هەنگاوی ٢ لە ٢</p>
        <h2 className="text-[1.75rem] font-bold text-slate-900 leading-tight text-right">
          پشکنین و <span className="text-blue-600">دڵنیاکردنەوە</span>
        </h2>
      </div>

      <div className="flex-1 px-4 pb-36">

        {/* Outer wrapper: notch circles sit outside overflow-hidden */}
        <div className="relative w-full max-w-md mx-auto">

          <div className="absolute -left-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '46%', transform: 'translateY(-50%)' }} />
          <div className="absolute -right-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '46%', transform: 'translateY(-50%)' }} />

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

            {/* Animated barber-pole strip */}
            <div
              className="h-2 w-full"
              style={{
                background: 'linear-gradient(45deg,#3b82f6 25%,#ef4444 25%,#ef4444 50%,#fff 50%,#fff 75%,#3b82f6 75%)',
                backgroundSize: '40px 40px',
                animation: 'subtle-slide 2s linear infinite',
              }}
            />

            {/* Customer profile — centered */}
            <div className="flex flex-col items-center pt-6 pb-5 px-6 gap-1.5">

              {/* Avatar */}
              <div className="w-24 h-24 rounded-full ring-4 ring-blue-500/10 p-1 bg-white shadow-md overflow-hidden">
                {customer?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customer.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-3xl">
                    {customer?.full_name?.charAt(0) ?? '?'}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mt-2">{customer?.full_name}</h3>
              <p className="text-sm text-gray-500 font-medium" dir="ltr">{customer?.phone_number}</p>

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
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight">{formatDate(date)}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">کات</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight">{formatTimeFull(time)}</p>
                </div>
              </div>

              {/* Barber / shop */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl flex-shrink-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="w-[18px] h-[18px] object-cover rounded-md" />
                  ) : (
                    <Scissors size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">سەرتاش</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5 leading-tight truncate">{shopName || 'ژێوار محمد'}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                <div className="p-2 bg-amber-500/10 rounded-xl flex-shrink-0">
                  <CheckCircle size={18} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-amber-600/70 font-medium">دۆخ</p>
                  <p className="text-sm font-bold text-amber-600 mt-0.5 leading-tight">چاوەڕوان</p>
                </div>
              </div>

            </div>

            {/* Tear line 2 */}
            <div className="border-t-2 border-dashed border-gray-200 mx-4" />

            {/* Decorative barcode + shop name */}
            <div className="flex flex-col items-center gap-2 py-5 px-6">
              <div
                className="w-48 h-8 opacity-60 rounded-sm"
                style={{
                  background: 'repeating-linear-gradient(90deg,#1e293b 0px,#1e293b 2px,transparent 2px,transparent 4px,#1e293b 4px,#1e293b 5px,transparent 5px,transparent 8px,#1e293b 8px,#1e293b 9px,transparent 9px,transparent 12px)',
                }}
              />
              <div className="flex items-center gap-2">
                <Scissors className="w-2.5 h-2.5 text-slate-300" />
                <p className="text-slate-400 text-sm tracking-[0.2em] font-bold">{shopName}</p>
                <Scissors className="w-2.5 h-2.5 text-slate-300 scale-x-[-1]" />
              </div>
            </div>

          </div>
        </div>

        <p className="text-slate-400 text-xs text-center px-4 mt-4 leading-relaxed">
          تکایە ٥ خولەک زووتر ئامادەبە
        </p>
      </div>

      {/* Sticky confirm CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-14 pb-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20">
        <button
          disabled={confirming}
          onClick={onConfirm}
          className={[
            'w-full h-14 rounded-2xl font-bold text-base pointer-events-auto touch-manipulation transition-all duration-200 select-none',
            confirming
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white shadow-md shadow-blue-200/70 active:bg-blue-700 active:scale-[0.98]',
          ].join(' ')}
        >
          <span className="flex items-center justify-center gap-2.5">
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
