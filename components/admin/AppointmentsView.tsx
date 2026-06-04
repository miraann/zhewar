'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentFull } from '@/lib/types';
import { Phone, Clock, CheckCircle2, XCircle, RefreshCw, Calendar, MessageCircle } from 'lucide-react';

const MONTH_SHORT = ['ک٢','شوب','ئاز','نیس','ئای','حوز','تەم','ئاب','ئەی','تش١','تش٢','ک١'];

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
  const timeStr = `${display}${m ? `:${String(m).padStart(2,'0')}` : ''} ${period}`;
  return {
    date: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
    time: timeStr,
    isPast: d < new Date(),
  };
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-50   text-amber-700   border-amber-200',
  cancelled: 'bg-red-50     text-red-600     border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'دڵنیاکراوە',
  pending:   'چاوەڕوانکردن',
  cancelled: 'هەڵوەشاوە',
};

type Filter = 'upcoming' | 'today' | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  upcoming: 'داهاتوو',
  today:    'ئەمڕۆ',
  all:      'هەموو',
};

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

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled') {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = appointments.filter((a) => {
    const dt = new Date(a.appointment_time);
    if (filter === 'today')    return dt >= today && dt < new Date(today.getTime() + 86400000);
    if (filter === 'upcoming') return dt >= now && a.status !== 'cancelled';
    return true;
  });

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900 font-semibold text-lg">کاتەکانی سەردانیکردن</h2>
          <p className="text-neutral-400 text-sm">{filtered.length} دیارە</p>
        </div>
        <button onClick={load} className="p-2 text-neutral-400 active:text-neutral-700 touch-manipulation transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['upcoming', 'today', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-2 rounded-full text-xs font-medium border transition-all touch-manipulation',
              filter === f
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-neutral-200 bg-white text-neutral-500 active:bg-neutral-50',
            ].join(' ')}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="w-10 h-10 text-neutral-300" />
          <p className="text-neutral-400 text-sm">هیچ کاتی سەردانیکردنێک نەدۆزرایەوە</p>
        </div>
      )}

      {!loading && filtered.map((appt) => {
        const { date, time, isPast } = formatDT(appt.appointment_time);
        return (
          <div
            key={appt.id}
            className={[
              'rounded-2xl border p-4 space-y-3 bg-white',
              isPast ? 'border-neutral-100 opacity-55' : 'border-neutral-200 shadow-sm',
            ].join(' ')}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
                  {appt.customers.photo_url
                    ? <img src={appt.customers.photo_url} alt={appt.customers.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm font-bold">
                        {appt.customers.full_name.charAt(0)}
                      </div>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-900 font-semibold text-sm truncate">{appt.customers.full_name}</p>
                  <p className="text-neutral-400 text-xs mt-0.5">{appt.services.name}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[0.6rem] font-semibold tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLE[appt.status]}`}>
                {STATUS_LABEL[appt.status] ?? appt.status}
              </span>
            </div>

            {/* Details */}
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                {date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {time}
              </span>
              <a href={`tel:${appt.customers.phone_number}`} className="flex items-center gap-1.5 active:text-neutral-700 mr-auto">
                <Phone className="w-3.5 h-3.5" />
                {appt.customers.phone_number}
              </a>
              <a
                href={`https://wa.me/${appt.customers.phone_number.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-600 text-[0.65rem] font-semibold active:bg-green-100 touch-manipulation transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              {appt.customers.facebook_id && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-400 text-[0.65rem] font-semibold select-none">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  FB
                </span>
              )}
            </div>

            {/* Actions */}
            {appt.status === 'pending' && !isPast && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => updateStatus(appt.id, 'confirmed')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold touch-manipulation active:bg-emerald-100"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> دڵنیاکردنەوە
                </button>
                <button
                  onClick={() => updateStatus(appt.id, 'cancelled')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold touch-manipulation active:bg-red-100"
                >
                  <XCircle className="w-3.5 h-3.5" /> هەڵوەشاندنەوە
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
