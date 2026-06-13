'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Phone, Calendar, Clock, Search, ChevronRight } from 'lucide-react';

const DAY_SHORT = ['یەکشەمە','دووشەمە','سێشەمە','چوارشەمە','پێنجشەمە','هەینی','شەمە'];

function toAr(n: number) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
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
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending:   'bg-amber-500/10   text-amber-400   border-amber-500/20',
  cancelled: 'bg-red-500/10     text-red-400     border-red-500/20',
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
      .order('appointment_time', { ascending: false });

    setLoading(false);
    setSearched(true);

    if (dbErr) { setError('کێشەیەک ڕوویدا، تکایە دووبارە هەوڵبدە'); return; }
    setBookings((data ?? []) as unknown as Booking[]);
  }

  const customer = bookings?.[0]?.customers ?? null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-64 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">کاتەکانی سەردانیکردن</h1>
          <p className="text-white/35 text-sm">ژمارە تەلەفۆنەکەت بنووسە</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="٠٧٧٠١٢٣٤٥٦٧"
              dir="ltr"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-10 pl-4 text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm overflow-hidden touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_30px_rgba(245,158,11,0.25)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            <Search className="relative w-4 h-4" />
            <span className="relative">{loading ? 'گەڕان...' : 'گەڕان'}</span>
          </button>
        </form>

        {/* Results */}
        {searched && bookings !== null && (
          bookings.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-white/35 text-sm">هیچ کاتی سەردانیکردنێک نەدۆزرایەوە</p>
              <Link href="/book" className="text-amber-400 text-sm font-medium">تۆمارکردن ←</Link>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Customer card */}
              {customer && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden bg-amber-500/10 border-2 border-amber-500/20">
                    {customer.photo_url ? (
                      <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-amber-400/60">
                        {customer.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-base truncate">{customer.full_name}</p>
                    <p className="text-white/35 text-sm mt-0.5 flex items-center gap-1.5" dir="ltr">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {customer.phone_number}
                    </p>
                    <p className="text-white/25 text-xs mt-1">{bookings.length} کاتی سەردانیکردن</p>
                  </div>
                </div>
              )}

              {/* Booking cards */}
              <div className="space-y-3">
                {bookings.map((b) => {
                  const { date, time, isPast } = formatDT(b.appointment_time);
                  const shortId = '#' + b.id.replace(/-/g, '').slice(0, 8).toUpperCase();
                  return (
                    <Link
                      key={b.id}
                      href={`/appointment/${b.id}`}
                      className={[
                        'flex items-center gap-3 bg-white/5 border border-white/8 rounded-2xl p-4 backdrop-blur-sm active:bg-white/8 transition-colors touch-manipulation',
                        isPast ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.65rem] font-mono font-semibold text-amber-400/60">{shortId}</span>
                          <span className={`text-[0.6rem] font-semibold tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[b.status] ?? ''}`}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500/50" />{date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500/50" />{time}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-white/25 text-xs">← گەڕانەوە بۆ سەرەتا</Link>
        </div>
      </div>
    </div>
  );
}
