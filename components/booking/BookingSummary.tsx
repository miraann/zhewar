'use client';

import type { Customer } from '@/lib/types';
import { Calendar, ChevronRight, Clock, Facebook, Loader2, Phone, Scissors } from 'lucide-react';
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
  const fbUrl = normalizeFbUrl(customer?.facebook_id ?? null);
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    supabase.from('barber_profile').select('name').single()
      .then(({ data }) => { if (data?.name) setShopName(data.name); });
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3px)] bg-transparent relative">

      <style>{`@keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

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

      <div className="flex-1 px-4 pb-48 space-y-4">

        {/* ── Boarding Pass Ticket ── */}
        {/* Outer wrapper holds the notch circles so they sit outside overflow-hidden ticket */}
        <div className="relative w-full max-w-sm mx-auto">

          {/* Perforated notches — positioned at the info-grid divider (~55% down) */}
          <div className="absolute -left-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '52%', transform: 'translateY(-50%)' }} />
          <div className="absolute -right-3 z-10 w-6 h-6 rounded-full bg-slate-100 border border-slate-200/60" style={{ top: '52%', transform: 'translateY(-50%)' }} />

          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">

            {/* Top barber-pole strip */}
            <div
              className="h-2.5 w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, #ef4444, #ef4444 10px, #ffffff 10px, #ffffff 20px, #3b82f6 20px, #3b82f6 30px, #ffffff 30px, #ffffff 40px)',
                backgroundSize: '57px 100%',
              }}
            />

            {/* Identity section */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-3" dir="rtl">

              {/* Spinning conic avatar */}
              <div className="relative w-[58px] h-[58px] flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
                    animation: 'ringRotate 4s linear infinite',
                  }}
                />
                <div className="absolute inset-[2.5px] rounded-full bg-white">
                  <div className="absolute inset-[2px] rounded-full overflow-hidden bg-slate-100">
                    {customer?.photo_url ? (
                      <img src={customer.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-xl">
                        {customer?.full_name.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name + phone + Facebook */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold text-[0.95rem] leading-tight truncate">
                  {customer?.full_name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                  <p className="text-slate-400 text-xs" dir="ltr">{customer?.phone_number}</p>
                </div>
                {fbUrl && (
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[0.68rem] font-semibold text-[#1877F2] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg active:bg-blue-100 transition-colors touch-manipulation"
                  >
                    <Facebook className="w-3 h-3 flex-shrink-0" />
                    بینینی پرۆفایلی فەیسبووک
                  </a>
                )}
              </div>
            </div>

            {/* Perforated divider line */}
            <div className="border-t-2 border-dashed border-slate-100 mx-4 my-1" />

            {/* 2×2 Info Grid */}
            <div className="px-5 py-5 grid grid-cols-2 gap-x-4 gap-y-5" dir="rtl">

              {/* بەروار */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-[15px] h-[15px] text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 tracking-wider">بەروار</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{formatDate(date)}</p>
                </div>
              </div>

              {/* کات */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-[15px] h-[15px] text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 tracking-wider">کات</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{formatTimeFull(time)}</p>
                </div>
              </div>

              {/* ناوی کڕیار */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-500 text-base font-bold leading-none">✂</span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 tracking-wider">کڕیار</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5 truncate max-w-[90px]">
                    {customer?.full_name ?? '—'}
                  </p>
                </div>
              </div>

              {/* بارودۆخ */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 tracking-wider">دۆخی داواکاری</p>
                  <p className="text-sm font-bold text-amber-600 leading-tight mt-0.5">چاوەڕوان</p>
                </div>
              </div>

            </div>

            {/* Perforated divider */}
            <div className="border-t-2 border-dashed border-slate-100 mx-4 my-1" />

            {/* Barcode + label */}
            <div className="px-5 pt-4 pb-2 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-px">
                {[3,1,4,1,5,2,3,1,4,2,1,3,2,4,1,3,2,1,4,3,1,2,3,1,4,2,3,1,2,4,1,3,2].map((w, i) => (
                  <div
                    key={i}
                    className={i % 5 === 0 ? 'bg-slate-700' : i % 3 === 0 ? 'bg-slate-500' : 'bg-slate-200'}
                    style={{ width: w, height: 32, borderRadius: 1 }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Scissors className="w-2.5 h-2.5 text-slate-300" />
                <p className="text-slate-400 text-sm tracking-[0.2em] font-bold">{shopName}</p>
                <Scissors className="w-2.5 h-2.5 text-slate-300 scale-x-[-1]" />
              </div>
            </div>

            {/* Bottom barber-pole strip */}
            <div
              className="h-2.5 w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #3b82f6, #3b82f6 10px, #ffffff 10px, #ffffff 20px, #ef4444 20px, #ef4444 30px, #ffffff 30px, #ffffff 40px)',
                backgroundSize: '57px 100%',
              }}
            />

          </div>
        </div>

        <p className="text-slate-400 text-xs text-center px-4 leading-relaxed">
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
