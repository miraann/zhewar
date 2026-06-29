'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Phone, Calendar, Clock, Search, ChevronRight } from 'lucide-react';

const DAY_SHORT = ['یەکشەمە','دووشەمە','سێشەمە','چوارشەمە','پێنجشەمە','هەینی','شەمە'];

function toAr(n: number) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function normalizeDigits(s: string): string {
  return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function formatDT(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  let period: string;
  if (h < 12)        period = 'بەیانی';
  else if (h === 12) period = 'نیوەڕۆ';
  else if (h <= 16)  period = 'دوا نیوەڕۆ';
  else if (h <= 18)  period = 'ئێوارە';
  else               period = 'شەو';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return {
    date: `${DAY_SHORT[d.getDay()]} /${toAr(d.getMonth() + 1)}/${toAr(d.getDate())}`,
    time: `${display}${m ? `:${String(m).padStart(2,'0')}` : ''} ${period}`,
    isPast: d < new Date(),
  };
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending:   'bg-amber-50   text-amber-800   border-amber-200',
  cancelled: 'bg-red-50     text-red-700     border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'پەسەندکراوە',
  pending:   'چاوەڕوانکردن',
  cancelled: 'هەڵوەشاوە',
};

interface Customer {
  full_name: string;
  phone_number: string;
  photo_url: string | null;
}

interface Booking {
  id: string;
  appointment_time: string;
  status: string;
  customers: Customer;
}

export default function MyBookingsPage() {
  const [phone, setPhone]       = useState('');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!bookings?.length) return;
    const ids = bookings.map(b => b.id);
    const channel = supabase
      .channel('realtime:appointments:customer')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload) => {
        const updated = payload.new as { id: string; status: string };
        if (ids.includes(updated.id)) {
          setBookings(prev => prev?.map(b => b.id === updated.id ? { ...b, status: updated.status } : b) ?? prev);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookings]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!p) { setError('تکایە ژمارە تەلەفۆنەکەت بنووسە'); return; }
    setError('');
    setLoading(true);
    setSearched(false);

    const { data, error: dbErr } = await supabase
      .from('appointments')
      .select(`id, appointment_time, status, customers!inner(full_name, phone_number, photo_url)`)
      .eq('customers.phone_number', p)
      .gte('appointment_time', new Date().toISOString())
      .order('appointment_time', { ascending: true });

    setLoading(false);
    setSearched(true);

    if (dbErr) { setError('کێشەیەک ڕوویدا، تکایە دووبارە هەوڵبدە'); return; }
    setBookings((data ?? []) as unknown as Booking[]);
  }

  const customer = bookings?.[0]?.customers ?? null;

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 relative overflow-hidden">

      <div className="w-full max-w-sm space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-12 rounded-2xl p-[2.5px]"
              style={{
                background:
                  'conic-gradient(#ef4444 0deg,#ef4444 120deg,#f8fafc 145deg,#3b82f6 170deg,#3b82f6 300deg,#f8fafc 325deg,#ef4444 360deg)',
              }}
            >
              <div className="w-full h-full rounded-[13px] bg-white flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">کاتەکانی سەردانیکردن</h1>
          <p className="text-slate-500 text-sm">ژمارە تەلەفۆنەکەت بنووسە</p>
        </div>

        {/* Search form */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                placeholder="٠٧٧٠١٢٣٤٥٦٧"
                dir="ltr"
                className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl py-3.5 pr-10 pl-4 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500/60 focus:bg-white transition-colors text-right"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50 bg-blue-600 text-white shadow-md shadow-blue-200/60 active:bg-blue-700"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'گەڕان...' : 'گەڕان'}</span>
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && bookings !== null && (
          bookings.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-lg p-6">
              <p className="text-slate-500 text-sm">هیچ کاتی سەردانیکردنێکی داهاتوو نەدۆزرایەوە</p>
              <Link href="/book" className="text-blue-600 text-sm font-medium">تۆمارکردن ←</Link>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Customer card */}
              {customer && (
                <div className="bg-white border border-slate-100 shadow-md rounded-3xl p-5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {customer.photo_url ? (
                      <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-400">
                        {customer.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-900 font-bold text-base truncate">{customer.full_name}</p>
                    <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5" dir="ltr">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {customer.phone_number}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">{bookings.length} کاتی سەردانیکردن</p>
                  </div>
                </div>
              )}

              {/* Booking cards */}
              <div className="space-y-3">
                {bookings.map((b) => {
                  const { date, time, isPast } = formatDT(b.appointment_time);
                  const sid = '#' + b.id.replace(/-/g, '').slice(0, 8).toUpperCase();
                  return (
                    <Link
                      key={b.id}
                      href={`/appointment/${b.id}`}
                      className={[
                        'flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 active:bg-slate-50 transition-colors touch-manipulation',
                      ].join(' ')}
                    >
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.65rem] font-mono font-semibold text-blue-600">{sid}</span>
                          <span className={`text-[0.6rem] font-semibold tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[b.status] ?? ''}`}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />{date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />{time}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-slate-400 text-xs">← گەڕانەوە بۆ سەرەتا</Link>
        </div>
      </div>
    </div>
  );
}
