'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentFull } from '@/lib/types';
import {
  Phone, Clock, CheckCircle2, XCircle, RefreshCw,
  Calendar, ShieldCheck, AlertCircle, Search, X, Bell,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFbLinks(raw: string): { fbUrl: string; messengerUrl: string } | null {
  if (!raw) return null;
  const s = raw.trim();

  // m.me/username → direct messenger link
  const mme = s.match(/m\.me\/([^/?&#\s]+)/);
  if (mme) return { fbUrl: `https://www.facebook.com/${mme[1]}`, messengerUrl: `https://m.me/${mme[1]}` };

  // profile.php?id=NUMERIC → numeric ID works for m.me too
  const numId = s.match(/facebook\.com\/profile\.php\?id=(\d+)/);
  if (numId) return { fbUrl: s, messengerUrl: `https://m.me/${numId[1]}` };

  // facebook.com/share/... — obfuscated share link, no username available
  if (/facebook\.com\/share\//i.test(s)) return { fbUrl: s, messengerUrl: s };

  // facebook.com/USERNAME (regular profile)
  const fb = s.match(/facebook\.com\/([^/?&#\s]+)/);
  if (fb) return { fbUrl: `https://www.facebook.com/${fb[1]}`, messengerUrl: `https://m.me/${fb[1]}` };

  // bare numeric ID
  if (/^\d+$/.test(s)) return {
    fbUrl: `https://www.facebook.com/profile.php?id=${s}`,
    messengerUrl: `https://m.me/${s}`,
  };

  if (s.startsWith('http')) return { fbUrl: s, messengerUrl: s };
  return null;
}

function formatCreatedAt(iso: string) {
  const d  = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const min  = String(d.getMinutes()).padStart(2, '0');
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${dd}/${mm}/${yy} — ${h12}:${min} ${ampm}`;
}

const DAY_NAMES_KU = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];

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
    dayName: DAY_NAMES_KU[d.getDay()],
    date:    `${d.getDate()}/${d.getMonth() + 1}`,
    time:    `${display}${m ? `:${String(m).padStart(2, '0')}` : ''} ${period}`,
  };
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'پەسەندکراوە',
  pending:   'چاوەڕوان',
  cancelled: 'هەڵوەشاوە',
};

type Filter = 'upcoming' | 'today' | 'all' | 'pending';
const FILTER_LABELS: Record<Filter, string> = { upcoming: 'داهاتوو', today: 'ئەمڕۆ', all: 'هەموو', pending: 'چاوەڕوان' };

// ── Brand icon SVGs (18 px, inline-only, no className so they inherit color) ──

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const FB_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const MSG_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.26-5.963 3.26L10.986 8.4l3.13 3.26L20.013 8.4l-6.82 6.563z" />
  </svg>
);

// ── Countdown ──────────────────────────────────────────────────────────────────

function Countdown({ appointmentTime }: { appointmentTime: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function tick() {
      const diff = new Date(appointmentTime).getTime() - Date.now();
      if (diff <= 0) { setLabel('00:00:00:00'); return; }
      const d  = Math.floor(diff / 86_400_000);
      const h  = Math.floor((diff % 86_400_000) / 3_600_000);
      const m  = Math.floor((diff % 3_600_000)  / 60_000);
      const s  = Math.floor((diff % 60_000)      / 1_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setLabel(`${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [appointmentTime]);

  const passed   = new Date(appointmentTime).getTime() <= Date.now();
  const segments = label.split(':');

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-3 h-14 rounded-xl"
      style={{ background: passed ? '#94a3b8' : '#10b981' }}
    >
      {['D','H','M','S'].map((unit, i) => (
        <div key={unit} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <span className="font-black text-base leading-none tabular-nums text-white">
              {segments[i] ?? '00'}
            </span>
            <span className="text-[0.5rem] font-semibold mt-0.5 text-white/70">
              {unit}
            </span>
          </div>
          {i < 3 && <span className="font-black text-base leading-none pb-2 text-white/50">:</span>}
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppointmentsView() {
  const [appointments, setAppointments] = useState<AppointmentFull[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Filter>('upcoming');
  const [search, setSearch]             = useState('');
  const [preview, setPreview]           = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select(`id, appointment_time, status, created_at,
               customers(full_name, phone_number, photo_url, facebook_id)`)
      .order('appointment_time', { ascending: true });
    if (data) setAppointments(data as unknown as AppointmentFull[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime:appointments:admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'pending') {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today.getTime() + 86_400_000);

  const filtered = appointments.filter(a => {
    const dt = new Date(a.appointment_time);
    if (filter === 'today')    { if (!(dt >= today && dt < todayEnd) || a.status !== 'confirmed') return false; }
    if (filter === 'upcoming') { if (!(dt >= now) || a.status !== 'confirmed') return false; }
    if (filter === 'pending')  { if (a.status !== 'pending') return false; }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!a.customers.full_name.toLowerCase().includes(q) && !a.customers.phone_number.includes(q)) return false;
    }
    return true;
  });

  const pendingCount     = appointments.filter(a => a.status === 'pending'   && new Date(a.appointment_time) >= now).length;
  const allPendingCount  = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed' && new Date(a.appointment_time) >= now).length;
  const todayCount     = appointments.filter(a => { const dt = new Date(a.appointment_time); return dt >= today && dt < todayEnd; }).length;

  return (
    <div className="relative pb-16">

      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 grid grid-cols-3 gap-3">

        <div
          className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5 border-2 border-amber-400"
          style={{ background: '#f59e0b', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-white" />
          <span className="text-2xl font-black leading-none text-white">{pendingCount}</span>
          <span className="text-[0.58rem] font-medium tracking-widest text-white/90">چاوەڕوان</span>
        </div>

        <div
          className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5 border-2 border-emerald-500"
          style={{ background: '#10b981', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
        >
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-2xl font-black leading-none text-white">{confirmedCount}</span>
          <span className="text-[0.58rem] font-medium tracking-widest text-white/90">پەسەند</span>
        </div>

        <div
          className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5 border-2 border-blue-500"
          style={{ background: '#2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
        >
          <Calendar className="w-4 h-4 text-white" />
          <span className="text-2xl font-black text-white leading-none">{todayCount}</span>
          <span className="text-[0.58rem] text-white/80 font-medium tracking-widest">ئەمڕۆ</span>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="گەڕان — ناو یان ژمارەی مۆبایل..."
            dir="rtl"
            className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 active:text-slate-700 touch-manipulation">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips + refresh ────────────────────────────────────────── */}
      <div className="px-4 pt-3 flex items-center gap-2">

        {/* Time-range chips */}
        {(['upcoming', 'today', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-1.5 rounded-full text-xs font-semibold touch-manipulation transition-all duration-200 border',
              filter === f
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200',
            ].join(' ')}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}

        {/* Pending notifications chip */}
        <button
          onClick={() => setFilter(filter === 'pending' ? 'upcoming' : 'pending')}
          className={[
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold touch-manipulation transition-all duration-200 border',
            filter === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200/60'
              : 'bg-white text-slate-600 border-slate-200',
          ].join(' ')}
        >
          <Bell className="w-3 h-3 flex-shrink-0" />
          {FILTER_LABELS['pending']}
          {allPendingCount > 0 && (
            <span
              className="absolute -top-[5px] -right-[5px] min-w-[16px] h-[16px] rounded-full bg-red-500 text-white flex items-center justify-center font-bold leading-none px-1"
              style={{ fontSize: '9px' }}
            >
              {allPendingCount}
            </span>
          )}
        </button>

        <button onClick={load} className="ml-auto text-slate-400 active:text-slate-700 touch-manipulation">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="px-4 pt-2 pb-1 text-[0.65rem] text-slate-500 font-semibold">{filtered.length} کاتی سەردان</p>

      {/* ── Skeletons ────────────────────────────────────────────────────── */}
      {loading && (
        <div className="px-4 pt-1 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse bg-slate-100 border border-slate-200" />
          ))}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
            <Calendar className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">هیچ کاتی سەردانیکردنێک نەدۆزرایەوە</p>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="px-4 pt-1 space-y-2.5">
          {filtered.map(appt => {
            const { date, time, dayName } = formatDT(appt.appointment_time);
            const fbLinks     = appt.customers.facebook_id ? getFbLinks(appt.customers.facebook_id) : null;
            const isPending   = appt.status === 'pending';
            const isConfirmed = appt.status === 'confirmed';
            const isCancelled = appt.status === 'cancelled';

            const dotColor = isConfirmed ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b';

            const badgeCls = isConfirmed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
              : isCancelled
                ? 'bg-red-50 text-red-600 border border-red-200/50'
                : 'bg-amber-50 text-amber-700 border border-amber-200/50';

            // Left accent strip color
            const accentColor = isConfirmed ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b';

            return (
              <div
                key={appt.id}
                className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-100 overflow-hidden relative"
                style={{
                  boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)',
                  opacity: isCancelled ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Status accent strip — left edge */}
                <div
                  className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl"
                  style={{ background: accentColor }}
                />

                <div className="p-4 pl-5 space-y-3">

                  {/* ── Row 1: Avatar · Meta · Badge ──────────────────────── */}
                  <div className="flex items-center gap-3">

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {appt.customers.photo_url && !failedPhotos.has(appt.id) ? (
                        <button
                          type="button"
                          onClick={() => setPreview(appt.customers.photo_url)}
                          className="w-11 h-11 rounded-full overflow-hidden block touch-manipulation active:opacity-70 transition-opacity"
                          style={{ boxShadow: `0 0 0 2px ${dotColor}35` }}
                        >
                          <img
                            src={appt.customers.photo_url}
                            alt={appt.customers.full_name}
                            className="w-full h-full object-cover"
                            onError={() => setFailedPhotos(prev => new Set(prev).add(appt.id))}
                          />
                        </button>
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm select-none"
                          style={{
                            background: `${dotColor}12`,
                            color: dotColor,
                            boxShadow: `0 0 0 2px ${dotColor}28`,
                          }}
                        >
                          {appt.customers.full_name.charAt(0)}
                        </div>
                      )}
                      {/* Presence dot */}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-white"
                        style={{ background: dotColor }}
                      />
                    </div>

                    {/* Name + datetime + phone */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[0.88rem] text-slate-900 leading-snug truncate">
                        {appt.customers.full_name}
                      </p>
                      <div className="flex items-center gap-1 mt-[3px]">
                        <Calendar className="w-[11px] h-[11px] text-slate-400 flex-shrink-0" />
                        <span className="text-[0.7rem] text-slate-500 font-medium">{dayName} · {date}</span>
                        <span className="text-slate-300 mx-0.5 text-[0.6rem]">|</span>
                        <Clock className="w-[11px] h-[11px] text-slate-400 flex-shrink-0" />
                        <span className="text-[0.7rem] text-slate-500 font-medium">{time}</span>
                      </div>
                      <p className="text-[0.67rem] text-slate-400 mt-[3px] font-mono tracking-wide" dir="ltr">
                        {appt.customers.phone_number}
                      </p>
                      <p className="text-[0.62rem] text-slate-300 mt-[2px] font-mono" dir="ltr">
                        ⏱ {formatCreatedAt(appt.created_at)}
                      </p>
                    </div>

                    {/* Micro status pill */}
                    <span className={`flex-shrink-0 px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full ${badgeCls}`}>
                      {STATUS_LABEL[appt.status]}
                    </span>
                  </div>

                  {/* ── Row 2: Icon comms strip ────────────────────────────── */}
                  <div className="flex items-center gap-2">

                    {/* Phone */}
                    <a
                      href={`tel:${appt.customers.phone_number}`}
                      className="flex-1 h-11 rounded-xl flex items-center justify-center touch-manipulation transition-all duration-200 active:scale-95 bg-slate-50 border border-slate-200/80 text-slate-600 active:bg-slate-100"
                    >
                      <Phone className="w-[17px] h-[17px]" />
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${appt.customers.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 h-11 rounded-xl flex items-center justify-center touch-manipulation transition-all duration-200 active:scale-95 active:opacity-80"
                      style={{ background: '#25d366' }}
                    >
                      <span className="text-white">{WA_ICON}</span>
                    </a>

                    {fbLinks && (
                      <a
                        href={fbLinks.fbUrl}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 h-11 rounded-xl flex items-center justify-center touch-manipulation transition-all duration-200 active:scale-95 active:opacity-80"
                        style={{ background: '#1877f2' }}
                      >
                        <span className="text-white">{FB_ICON}</span>
                      </a>
                    )}
                  </div>

                  {/* ── Row 3: Action footer (conditional) ────────────────── */}
                  {isPending && (
                    <div className="flex gap-2 pt-0.5">
                      <button
                        onClick={() => updateStatus(appt.id, 'confirmed')}
                        className="flex-1 h-11 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2 touch-manipulation transition-all duration-200 active:scale-[0.98] shadow-md shadow-blue-500/10"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                      >
                        <CheckCircle2 className="w-[15px] h-[15px]" />
                        پەسەندکردن
                      </button>
                      {filter === 'all' && (
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="w-11 h-11 rounded-xl flex items-center justify-center touch-manipulation transition-all duration-200 active:scale-[0.98] text-white shadow-md shadow-red-500/20"
                          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                        >
                          <XCircle className="w-[17px] h-[17px]" />
                        </button>
                      )}
                    </div>
                  )}

                  {isConfirmed && (
                    (filter === 'upcoming' || filter === 'today')
                      ? <Countdown appointmentTime={appt.appointment_time} />
                      : filter === 'all'
                        ? (
                          <div className="flex gap-2 pt-0.5">
                            <button
                              onClick={() => updateStatus(appt.id, 'cancelled')}
                              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-medium text-sm touch-manipulation transition-all duration-200 active:scale-[0.98] text-white shadow-md shadow-red-500/20"
                              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                            >
                              <XCircle className="w-[15px] h-[15px]" />
                              هەڵوەشاندنەوە
                            </button>
                            <button
                              onClick={() => updateStatus(appt.id, 'pending')}
                              className="w-11 h-11 rounded-xl flex items-center justify-center touch-manipulation transition-all duration-200 active:scale-95 bg-slate-50 border border-slate-200/80 text-slate-400 active:bg-slate-100"
                            >
                              <RefreshCw className="w-[15px] h-[15px]" />
                            </button>
                          </div>
                        )
                        : null
                  )}

                  {isCancelled && (
                    <button
                      onClick={() => updateStatus(appt.id, 'pending')}
                      className="w-full h-10 rounded-xl flex items-center justify-center gap-2 font-medium text-sm touch-manipulation transition-all duration-200 active:scale-[0.99] bg-slate-50 border border-slate-200/80 text-slate-500 active:bg-slate-100"
                    >
                      <RefreshCw className="w-[14px] h-[14px]" />
                      گەڕاندنەوە بۆ چاوەڕوان
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Image lightbox ───────────────────────────────────────────────── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="" className="w-full rounded-3xl object-contain shadow-2xl" />
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center touch-manipulation bg-white border border-slate-200 text-slate-500 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
