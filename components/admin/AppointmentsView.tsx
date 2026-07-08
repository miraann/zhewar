'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppointmentFull } from '@/lib/types';
import {
  Phone, Clock, CheckCircle2, XCircle, RefreshCw,
  Calendar, ShieldCheck, AlertCircle, Search, X, Bell,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert Iraqi local number (07XX…) to WhatsApp international format (964 7XX…)
function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0'))   return '964' + digits.slice(1);
  return digits;
}

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

const WA_ICON_SM = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const FB_ICON_SM = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ── Countdown ──────────────────────────────────────────────────────────────────

function Countdown({ appointmentTime }: { appointmentTime: string }) {
  const [label,  setLabel]  = useState('');
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    function tick() {
      const diff = new Date(appointmentTime).getTime() - Date.now();
      if (diff <= 0) { setPassed(true); return; }
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

  if (passed) return null;

  const segments = label.split(':');

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-3 h-14 rounded-xl"
      style={{ background: '#10b981' }}
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
    await fetch(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(today.getTime() + 86_400_000);
  const yesterday  = new Date(today.getTime() - 86_400_000);

  const filtered = appointments.filter(a => {
    const dt = new Date(a.appointment_time);
    if (filter === 'today')    { if (!(dt >= today && dt < todayEnd) || a.status !== 'confirmed') return false; }
    if (filter === 'upcoming') { if (!(dt >= now) || a.status !== 'confirmed') return false; }
    if (filter === 'pending')  { if (a.status !== 'pending') return false; }
    if (filter === 'all')      { if (dt < yesterday) return false; }
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

        {/* Pending */}
        <div className="relative bg-white rounded-2xl border border-slate-100 p-3.5 flex flex-col items-start gap-2 overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[1.75rem] font-black text-slate-900 leading-none">{pendingCount}</span>
          <span className="text-[0.58rem] font-semibold text-slate-400 tracking-widest">چاوەڕوان</span>
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-amber-400 rounded-b-2xl" />
        </div>

        {/* Confirmed */}
        <div className="relative bg-white rounded-2xl border border-slate-100 p-3.5 flex flex-col items-start gap-2 overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[1.75rem] font-black text-slate-900 leading-none">{confirmedCount}</span>
          <span className="text-[0.58rem] font-semibold text-slate-400 tracking-widest">پەسەند</span>
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-emerald-400 rounded-b-2xl" />
        </div>

        {/* Today */}
        <div className="relative bg-white rounded-2xl border border-slate-100 p-3.5 flex flex-col items-start gap-2 overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-[1.75rem] font-black text-slate-900 leading-none">{todayCount}</span>
          <span className="text-[0.58rem] font-semibold text-slate-400 tracking-widest">ئەمڕۆ</span>
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-blue-400 rounded-b-2xl" />
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

      {/* ── Filter tabs + refresh ────────────────────────────────────────── */}
      <div className="px-4 pt-3 flex items-center gap-2">

        {/* Segmented control — داهاتوو / ئەمڕۆ / هەموو */}
        <div className="flex-1 bg-slate-100/80 p-1 rounded-2xl flex items-center gap-1">
          {(['upcoming', 'today', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'flex-1 py-[7px] rounded-xl text-[0.68rem] font-semibold touch-manipulation transition-all duration-200 leading-none',
                filter === f
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 active:text-slate-700',
              ].join(' ')}
              style={filter === f ? { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : undefined}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Pending bell capsule */}
        <button
          onClick={() => setFilter(filter === 'pending' ? 'upcoming' : 'pending')}
          className={[
            'relative flex items-center gap-1 px-3 py-[7px] rounded-xl text-[0.68rem] font-semibold touch-manipulation transition-all duration-200 leading-none flex-shrink-0',
            filter === 'pending'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-100/80 text-slate-500 active:text-slate-700',
          ].join(' ')}
          style={filter === 'pending' ? { boxShadow: '0 2px 8px rgba(245,158,11,0.25)' } : undefined}
        >
          <Bell className="w-3 h-3 flex-shrink-0" />
          <span>{FILTER_LABELS['pending']}</span>
          {allPendingCount > 0 && (
            <span
              className="absolute -top-[5px] -right-[5px] min-w-[15px] h-[15px] rounded-full bg-red-500 text-white flex items-center justify-center font-bold leading-none px-[2.5px]"
              style={{ fontSize: '8.5px' }}
            >
              {allPendingCount > 9 ? '9+' : allPendingCount}
            </span>
          )}
        </button>

        {/* Refresh */}
        <button onClick={load} className="p-1.5 text-slate-400 active:text-slate-700 touch-manipulation rounded-xl active:bg-slate-100 transition-colors">
          <RefreshCw className={`w-[15px] h-[15px] ${loading ? 'animate-spin' : ''}`} />
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
        <div className="flex flex-col items-center justify-center py-14 gap-3 px-8 text-center">
          <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="text-[0.82rem] font-semibold text-slate-400">
              {search ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'هیچ کاتی سەردانیکردنێک نییە'}
            </p>
            <p className="text-[0.7rem] text-slate-300">
              {search ? 'ناو یان ژمارەی دیکە تەماشا بکە' : 'کاتەکانی نوێ لێرە دەردەکەون'}
            </p>
          </div>
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
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  opacity: isCancelled ? 0.55 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Thin soft left accent */}
                <div
                  className="absolute inset-y-0 left-0 w-[2px]"
                  style={{ background: accentColor, opacity: 0.6 }}
                />

                <div className="p-4 pl-5 space-y-3">

                  {/* ── Header: Avatar + Name/Status + Date/Time + Phone/Icons ── */}
                  <div className="flex items-start gap-3">

                    {/* Avatar — w-16 */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'conic-gradient(#f59e0b 0deg,#fde68a 60deg,#fff 90deg,#fde68a 120deg,#f59e0b 180deg,#d97706 240deg,#fff 270deg,#d97706 300deg,#f59e0b 360deg)',
                          animation: 'ringRotate 3s linear infinite',
                        }}
                      />
                      {appt.customers.photo_url && !failedPhotos.has(appt.id) ? (
                        <button
                          type="button"
                          onClick={() => setPreview(appt.customers.photo_url)}
                          className="absolute inset-[2px] rounded-full overflow-hidden touch-manipulation active:opacity-70 transition-opacity"
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
                          className="absolute inset-[2px] rounded-full flex items-center justify-center font-bold text-sm select-none"
                          style={{ background: `${dotColor}18`, color: dotColor }}
                        >
                          {appt.customers.full_name.charAt(0)}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-[1.5px] border-white z-10"
                        style={{ background: dotColor }}
                      />
                    </div>

                    {/* Right column */}
                    <div className="flex-1 min-w-0">

                      {/* Name + status badge */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[0.95rem] text-slate-900 leading-tight truncate">
                          {appt.customers.full_name}
                        </p>
                        <span className={`flex-shrink-0 px-2 py-[3px] text-[10px] font-semibold rounded-full ${badgeCls}`}>
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </div>

                      {/* Date + Time — two structured chips */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-[11px] h-[11px] text-slate-400 flex-shrink-0" />
                          <span className="text-[0.78rem] text-slate-900 font-bold leading-none">{dayName} · {date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-[11px] h-[11px] text-slate-400 flex-shrink-0" />
                          <span className="text-[0.78rem] text-slate-900 font-bold leading-none">{time}</span>
                        </div>
                      </div>

                      {/* Phone + circular contact buttons */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-[0.67rem] text-slate-400 font-mono tracking-wide leading-none" dir="ltr">
                          {appt.customers.phone_number}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${appt.customers.phone_number}`}
                            className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100 touch-manipulation transition-colors"
                          >
                            <Phone className="w-[13px] h-[13px]" />
                          </a>
                          <a
                            href={`https://wa.me/${toWaNumber(appt.customers.phone_number)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white active:opacity-75 touch-manipulation"
                            style={{ background: '#25d366' }}
                          >
                            {WA_ICON_SM}
                          </a>
                          {fbLinks && (
                            <a
                              href={fbLinks.fbUrl}
                              target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white active:opacity-75 touch-manipulation"
                              style={{ background: '#1877f2' }}
                            >
                              {FB_ICON_SM}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Booked-at timestamp */}
                      <p className="text-[0.58rem] text-slate-300 mt-1.5 font-mono leading-none" dir="ltr">
                        ⏱ {formatCreatedAt(appt.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* ── Divider ─────────────────────────────────────────────── */}
                  <div className="h-px bg-slate-100 mx-0.5" />

                  {/* ── Action footer ────────────────────────────────────────── */}
                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(appt.id, 'confirmed')}
                        className="flex-1 h-9 rounded-xl font-semibold text-[0.8rem] text-white flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.98] bg-blue-600 active:bg-blue-700"
                      >
                        <CheckCircle2 className="w-[13px] h-[13px]" />
                        پەسەندکردن
                      </button>
                      <button
                        onClick={() => updateStatus(appt.id, 'cancelled')}
                        className="px-4 h-9 rounded-xl font-semibold text-[0.8rem] flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.98] bg-red-50 text-red-400 border border-red-100 active:bg-red-100"
                      >
                        <XCircle className="w-[13px] h-[13px]" />
                        هەڵوەشاندن
                      </button>
                    </div>
                  )}

                  {isConfirmed && (
                    (filter === 'upcoming' || filter === 'today')
                      ? <Countdown appointmentTime={appt.appointment_time} />
                      : filter === 'all'
                        ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(appt.id, 'cancelled')}
                              className="flex-1 h-9 rounded-xl font-semibold text-[0.8rem] flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.98] bg-red-50 text-red-400 border border-red-100 active:bg-red-100"
                            >
                              <XCircle className="w-[13px] h-[13px]" />
                              هەڵوەشاندنەوە
                            </button>
                            <button
                              onClick={() => updateStatus(appt.id, 'pending')}
                              className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation transition-all active:scale-95 bg-slate-50 border border-slate-200 text-slate-400 active:bg-slate-100"
                            >
                              <RefreshCw className="w-[13px] h-[13px]" />
                            </button>
                          </div>
                        )
                        : null
                  )}

                  {isCancelled && (
                    <button
                      onClick={() => updateStatus(appt.id, 'pending')}
                      className="w-full h-9 rounded-xl flex items-center justify-center gap-2 font-semibold text-[0.8rem] touch-manipulation transition-all active:scale-[0.99] bg-slate-50 border border-slate-100 text-slate-400 active:bg-slate-100"
                    >
                      <RefreshCw className="w-[13px] h-[13px]" />
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
