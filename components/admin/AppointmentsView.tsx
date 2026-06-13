'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentFull } from '@/lib/types';
import { Phone, Clock, CheckCircle2, XCircle, RefreshCw, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';

function getFbLinks(raw: string): { fbUrl: string; messengerUrl: string } | null {
  if (!raw) return null;
  const s = raw.trim();
  const mme = s.match(/m\.me\/([^/?&#\s]+)/);
  if (mme) return { fbUrl: `https://www.facebook.com/${mme[1]}`, messengerUrl: `https://m.me/${mme[1]}` };
  const fb = s.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&#\s]+)/);
  if (fb) return { fbUrl: `https://www.facebook.com/${fb[1]}`, messengerUrl: `https://m.me/${fb[1]}` };
  if (s.startsWith('http')) return { fbUrl: s, messengerUrl: s };
  return { fbUrl: `https://www.facebook.com/${s}`, messengerUrl: `https://m.me/${s}` };
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
  const timeStr = `${display}${m ? `:${String(m).padStart(2, '0')}` : ''} ${period}`;
  return {
    date: `${d.getDate()}/${d.getMonth() + 1}`,
    time: timeStr,
    isPast: d < new Date(),
  };
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'پەسەندکراوە',
  pending:   'چاوەڕوان',
  cancelled: 'هەڵوەشاوە',
};

type Filter = 'upcoming' | 'today' | 'all';
const FILTER_LABELS: Record<Filter, string> = {
  upcoming: 'داهاتوو',
  today:    'ئەمڕۆ',
  all:      'هەموو',
};

const WA_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FB_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const MSG_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.26-5.963 3.26L10.986 8.4l3.13 3.26L20.013 8.4l-6.82 6.563z" />
  </svg>
);

export default function AppointmentsView() {
  const [appointments, setAppointments] = useState<AppointmentFull[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Filter>('upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select(`id, appointment_time, status, created_at,
               customers(full_name, phone_number, photo_url, facebook_id),
               services(name, duration, price)`)
      .order('appointment_time', { ascending: true });
    if (data) setAppointments(data as unknown as AppointmentFull[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'pending') {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today.getTime() + 86400000);

  const filtered = appointments.filter((a) => {
    const dt = new Date(a.appointment_time);
    if (filter === 'today')    return dt >= today && dt < todayEnd;
    if (filter === 'upcoming') return dt >= now && a.status !== 'cancelled';
    return true;
  });

  const pendingCount   = appointments.filter(a => a.status === 'pending'   && new Date(a.appointment_time) >= now).length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed' && new Date(a.appointment_time) >= now).length;
  const todayCount     = appointments.filter(a => { const dt = new Date(a.appointment_time); return dt >= today && dt < todayEnd; }).length;

  return (
    <div className="pb-10">

      {/* ── Stats strip ── */}
      <div className="px-4 pt-5 pb-1 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-amber-500/8 border border-amber-500/15 p-3 flex flex-col items-center gap-0.5">
          <AlertCircle className="w-4 h-4 text-amber-400 mb-0.5" />
          <p className="text-2xl font-extrabold text-amber-400 leading-none">{pendingCount}</p>
          <p className="text-[0.6rem] text-amber-400/60 font-semibold tracking-wide mt-0.5">چاوەڕوان</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/15 p-3 flex flex-col items-center gap-0.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mb-0.5" />
          <p className="text-2xl font-extrabold text-emerald-400 leading-none">{confirmedCount}</p>
          <p className="text-[0.6rem] text-emerald-400/60 font-semibold tracking-wide mt-0.5">پەسەندکراوە</p>
        </div>
        <div className="rounded-2xl bg-blue-500/8 border border-blue-500/15 p-3 flex flex-col items-center gap-0.5">
          <Calendar className="w-4 h-4 text-blue-400 mb-0.5" />
          <p className="text-2xl font-extrabold text-blue-400 leading-none">{todayCount}</p>
          <p className="text-[0.6rem] text-blue-400/60 font-semibold tracking-wide mt-0.5">ئەمڕۆ</p>
        </div>
      </div>

      {/* ── Filter + refresh ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {(['upcoming', 'today', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-4 py-2 rounded-full text-xs font-semibold border transition-all touch-manipulation',
                filter === f
                  ? 'border-amber-500 bg-amber-500 text-neutral-950'
                  : 'border-white/10 bg-white/5 text-white/40 active:bg-white/10',
              ].join(' ')}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-white/25 active:text-white/60 touch-manipulation transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="px-4 text-white/25 text-xs mb-3">{filtered.length} دیارە</p>

      {/* ── Skeletons ── */}
      {loading && (
        <div className="px-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-white/5 border border-white/8 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/25 text-sm">هیچ کاتی سەردانیکردنێک نەدۆزرایەوە</p>
        </div>
      )}

      {/* ── Cards ── */}
      {!loading && (
        <div className="px-4 space-y-3">
          {filtered.map((appt) => {
            const { date, time, isPast } = formatDT(appt.appointment_time);
            const fbLinks = appt.customers.facebook_id ? getFbLinks(appt.customers.facebook_id) : null;
            const isPending   = appt.status === 'pending';
            const isConfirmed = appt.status === 'confirmed';
            const isCancelled = appt.status === 'cancelled';

            const accentClass = isConfirmed
              ? 'from-emerald-500 to-emerald-400'
              : isCancelled
              ? 'from-red-500 to-red-400'
              : 'from-amber-500 to-amber-400';

            return (
              <div
                key={appt.id}
                className={[
                  'rounded-3xl overflow-hidden border bg-white/5 backdrop-blur-sm transition-opacity',
                  isCancelled ? 'opacity-40 border-white/5' : 'border-white/10',
                ].join(' ')}
              >
                {/* Colored top accent */}
                <div className={`h-0.5 w-full bg-gradient-to-r ${accentClass}`} />

                <div className="p-4 space-y-3.5">

                  {/* ── Top: avatar + info + status ── */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={[
                        'w-14 h-14 rounded-2xl overflow-hidden border-2 bg-white/5',
                        isConfirmed ? 'border-emerald-500/30' : isCancelled ? 'border-red-500/20' : 'border-amber-500/30',
                      ].join(' ')}>
                        {appt.customers.photo_url
                          ? <img src={appt.customers.photo_url} alt={appt.customers.full_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-white/40 text-lg font-bold">
                              {appt.customers.full_name.charAt(0)}
                            </div>
                        }
                      </div>
                      {/* Status dot */}
                      <div className={[
                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-neutral-950',
                        isConfirmed ? 'bg-emerald-400' : isCancelled ? 'bg-red-400' : 'bg-amber-400',
                      ].join(' ')} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-white font-bold text-[1rem] leading-tight truncate">{appt.customers.full_name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-white/35">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                          <span className="font-medium text-white/50">{date}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                          <span className="font-medium text-white/50">{time}</span>
                        </span>
                      </div>
                    </div>

                    <span className={[
                      'flex-shrink-0 text-[0.6rem] font-bold tracking-wider px-2.5 py-1 rounded-full border mt-0.5',
                      isConfirmed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : isCancelled ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    ].join(' ')}>
                      {STATUS_LABEL[appt.status] ?? appt.status}
                    </span>
                  </div>

                  {/* ── Phone ── */}
                  <a
                    href={`tel:${appt.customers.phone_number}`}
                    className="flex items-center gap-2.5 py-2.5 px-3 rounded-2xl bg-white/5 border border-white/8 touch-manipulation active:bg-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <span className="text-sm font-semibold text-white/70 tracking-wide">{appt.customers.phone_number}</span>
                  </a>

                  {/* ── Contact buttons ── */}
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${appt.customers.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold touch-manipulation active:bg-emerald-500/15 transition-colors"
                    >
                      {WA_SVG}
                      <span>WhatsApp</span>
                    </a>
                    {fbLinks && (
                      <>
                        <a
                          href={fbLinks.fbUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold touch-manipulation active:bg-blue-500/15 transition-colors"
                        >
                          {FB_SVG}
                          <span>Facebook</span>
                        </a>
                        <a
                          href={fbLinks.messengerUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold touch-manipulation active:bg-purple-500/15 transition-colors"
                        >
                          {MSG_SVG}
                          <span>Messenger</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className={[
                    'rounded-2xl p-3',
                    isPending   ? 'bg-amber-500/8  border border-amber-500/15'  :
                    isConfirmed ? 'bg-emerald-500/8 border border-emerald-500/15' :
                                  'bg-white/3      border border-white/8',
                  ].join(' ')}>
                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(appt.id, 'confirmed')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-neutral-950 text-sm font-bold touch-manipulation active:bg-emerald-600 shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          پەسەندکردن
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="w-12 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 touch-manipulation active:bg-red-500/15 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold touch-manipulation active:bg-red-500/15 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          هەڵوەشاندنەوە
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'pending')}
                          className="w-12 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 touch-manipulation active:bg-amber-500/15 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isCancelled && (
                      <button
                        onClick={() => updateStatus(appt.id, 'pending')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold touch-manipulation active:bg-amber-500/15 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        گەڕاندنەوە بۆ چاوەڕوان
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
