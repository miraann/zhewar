'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppointmentFull, WhatsAppTemplate, WhatsAppTemplateKind } from '@/lib/types';
import {
  Phone, Clock, CheckCircle2, XCircle, RefreshCw,
  Calendar, ShieldCheck, AlertCircle, Search, X, Bell, User, History,
} from 'lucide-react';
import Skeleton from './ui/Skeleton';
import WhatsAppSendSheet from './WhatsAppSendSheet';
import BookingConfirmSheet from './BookingConfirmSheet';
import { adminFetch } from '@/lib/adminFetch';
import { waLink, type WaMessageValues } from '@/lib/whatsapp';
import { facebookProfileUrl } from '@/lib/facebook';

// ── Helpers ───────────────────────────────────────────────────────────────────

// facebook_id is whatever the customer typed, so links are only ever built
// from facebookProfileUrl's parsed https facebook.com / m.me URL — never the
// raw string, which could be a "javascript:" link that runs in this page.
function getFbLinks(raw: string): { fbUrl: string; messengerUrl: string } | null {
  const url = facebookProfileUrl(raw);
  if (!url) return null;
  const u = new URL(url);

  // m.me/username → direct messenger link
  if (u.hostname === 'm.me') {
    return { fbUrl: `https://www.facebook.com${u.pathname}`, messengerUrl: url };
  }

  // profile.php?id=NUMERIC → numeric ID works for m.me too
  const numId = u.pathname === '/profile.php' ? u.searchParams.get('id') : null;
  if (numId && /^\d+$/.test(numId)) return { fbUrl: url, messengerUrl: `https://m.me/${numId}` };

  // facebook.com/USERNAME (regular profile)
  const user = u.pathname.match(/^\/([\w.]+)\/?$/)?.[1];
  if (user) return { fbUrl: `https://www.facebook.com/${user}`, messengerUrl: `https://m.me/${user}` };

  // facebook.com/share/... and other links — no username available
  return { fbUrl: url, messengerUrl: url };
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

// Fills a WhatsApp template's placeholders — see lib/whatsapp.ts.
function waValues(appt: AppointmentFull): WaMessageValues {
  const { dayName, date, time } = formatDT(appt.appointment_time);
  const origin = window.location.origin;
  return {
    name: appt.customers.full_name,
    date: `${dayName} ${date}`,
    time,
    link: `${origin}/appointment/${appt.id}`,
    book: `${origin}/book`,
  };
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'پەسەندکراوە',
  pending:   'چاوەڕوان',
  cancelled: 'هەڵوەشاوە',
};

type Filter = 'upcoming' | 'today' | 'all' | 'pending';
const FILTER_LABELS: Record<Filter, string> = { upcoming: 'داهاتوو', today: 'ئەمڕۆ', all: 'هەموو', pending: 'چاوەڕوان' };

export type AppFilter = Filter;

// ── Style tokens ──────────────────────────────────────────────────────────────

// White floating surface on the #FAFAFC canvas
const SURFACE     = 'rounded-3xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]';
const PILL        = 'inline-flex items-center gap-1.5 bg-slate-100/70 text-slate-700 rounded-full px-3 py-1 text-xs font-semibold leading-5';
const ACTION_BTN  = 'min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-all duration-200';
const CONTACT_BTN = 'w-11 h-11 rounded-2xl flex items-center justify-center touch-manipulation active:scale-95 transition-all duration-200';

const STATUS_TONE = {
  confirmed: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/25', avatar: 'bg-emerald-50 text-emerald-500' },
  pending:   { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700',     ring: 'ring-indigo-500/20',  avatar: 'bg-indigo-50 text-indigo-400' },
  cancelled: { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-600',       ring: 'ring-rose-500/25',    avatar: 'bg-rose-50 text-rose-400' },
};

// ── Brand icon SVGs (18 px, inline-only, no className so they inherit color) ──

const WA_ICON_SM = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const FB_ICON_SM = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
      dir="ltr"
      className="flex items-center justify-center gap-2 px-4 h-14 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 shadow-[0_10px_24px_-8px_rgb(79,70,229,0.55)]"
    >
      {['D','H','M','S'].map((unit, i) => (
        <div key={unit} className="flex items-center gap-2">
          <div className="flex flex-col items-center min-w-[1.75rem]">
            <span className="font-black text-lg leading-none tabular-nums text-white">
              {segments[i] ?? '00'}
            </span>
            <span className="text-[0.55rem] font-bold mt-1 text-white/70">
              {unit}
            </span>
          </div>
          {i < 3 && <span className="font-black text-lg leading-none pb-3 text-white/40">:</span>}
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppointmentsView({
  initialFilter = 'upcoming',
  onPendingCount,
}: {
  initialFilter?: Filter;
  onPendingCount?: (count: number) => void;
}) {
  const [appointments, setAppointments] = useState<AppointmentFull[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Filter>(initialFilter);
  const [search, setSearch]             = useState('');

  // Sync when the URL changes (e.g. tapping a second notification)
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  const [preview, setPreview]           = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const [waTemplates, setWaTemplates]   = useState<WhatsAppTemplate[]>([]);
  const [waSheet, setWaSheet]           = useState<{ appt: AppointmentFull; kind: WhatsAppTemplateKind; afterAction: boolean } | null>(null);
  const [decision, setDecision]         = useState<{ appt: AppointmentFull; kind: WhatsAppTemplateKind } | null>(null);

  // Messages from the واتساپ tab, already in send order. If this fails
  // (or there are none) the WhatsApp button just opens a plain chat.
  useEffect(() => {
    adminFetch('/api/admin/whatsapp-templates')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: WhatsAppTemplate[]) => setWaTemplates(data))
      .catch(() => {});
  }, []);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const token = localStorage.getItem('admin_token') ?? '';
      const res = await fetch(
        '/api/admin/appointments',
        {
          ...(isCapacitor ? { credentials: 'include' } : {}),
          headers: token ? { 'X-Admin-Token': token } : {},
        },
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data as AppointmentFull[]);
      }
    } catch {}
    if (!opts.silent) setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Background sync: refetch quietly so a DB change (including our own PATCH)
  // never swaps the list for loading skeletons or resets scroll position.
  // Used to be driven by a Supabase Realtime subscription with the anon
  // key, which required `appointments` to be readable by anon — a data
  // exposure hole now closed by RLS, so we poll the authenticated admin
  // API instead.
  // Skipped while the app is backgrounded; catches up as soon as it's visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 15000);
    function onVisible() { if (!document.hidden) load({ silent: true }); }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'pending'): Promise<boolean> {
    try {
      const res = await adminFetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return false;
    } catch {
      return false;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    return true;
  }

  // Accept/decline go through BookingConfirmSheet; once saved, offer to
  // tell the customer on WhatsApp right away.
  const finishDecision = useCallback(() => {
    if (!decision) return;
    const { appt, kind } = decision;
    setDecision(null);
    if (waTemplates.some(t => t.kind === kind)) setWaSheet({ appt, kind, afterAction: true });
  }, [decision, waTemplates]);

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

  // Pending and All list the newest bookings first, by when they were
  // booked; Upcoming/Today stay in appointment-time order (a schedule).
  if (filter === 'pending' || filter === 'all') {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const pendingCount     = appointments.filter(a => a.status === 'pending'   && new Date(a.appointment_time) >= now).length;

  // Feeds the bottom-nav badge so the dashboard doesn't poll the same route.
  useEffect(() => {
    if (!loading) onPendingCount?.(pendingCount);
  }, [pendingCount, loading, onPendingCount]);
  const allPendingCount  = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed' && new Date(a.appointment_time) >= now).length;
  const todayCount     = appointments.filter(a => { const dt = new Date(a.appointment_time); return dt >= today && dt < todayEnd; }).length;

  // Counts shown on the segmented-control tabs — mirror each tab's own filter exactly.
  const todayConfirmedCount = appointments.filter(a => { const dt = new Date(a.appointment_time); return dt >= today && dt < todayEnd && a.status === 'confirmed'; }).length;
  const allTabCount         = appointments.filter(a => new Date(a.appointment_time) >= yesterday).length;
  const tabCounts: Record<Filter, number> = {
    upcoming: confirmedCount,
    today:    todayConfirmedCount,
    all:      allTabCount,
    pending:  allPendingCount,
  };

  // Bucket consecutive same-day appointments under one sticky date header,
  // so the day/date no longer needs repeating on every single card.
  type DateGroup = { key: string; dayName: string; date: string; items: AppointmentFull[] };
  const groups: DateGroup[] = [];
  for (const appt of filtered) {
    const d   = new Date(appt.appointment_time);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(appt);
    } else {
      const { dayName, date } = formatDT(appt.appointment_time);
      groups.push({ key, dayName, date, items: [appt] });
    }
  }

  // Summary tiles — same three counts as before, restyled as floating tiles.
  const metrics = [
    { label: 'چاوەڕوان', value: pendingCount,   icon: AlertCircle, iconCls: 'text-amber-500',   accent: 'from-amber-400 to-orange-500' },
    { label: 'پەسەند',   value: confirmedCount, icon: ShieldCheck, iconCls: 'text-emerald-500', accent: 'from-emerald-400 to-teal-500' },
    { label: 'ئەمڕۆ',    value: todayCount,     icon: Calendar,    iconCls: 'text-indigo-500',  accent: 'from-indigo-500 to-violet-500' },
  ];

  return (
    <div className="relative pb-16">

      {/* ── Metric tiles ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 grid grid-cols-3 gap-3">
        {metrics.map(({ label, value, icon: Icon, iconCls, accent }) => (
          <div key={label} className={`relative overflow-hidden p-3.5 ${SURFACE}`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${accent}`} />
            <div className={`absolute -top-10 -end-10 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl pointer-events-none`} />
            <div className="relative">
              <div className="inline-flex bg-slate-100/80 rounded-2xl p-3">
                <Icon className={`w-[18px] h-[18px] ${iconCls}`} />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 leading-none tabular-nums">{value}</p>
              <p className="mt-2 text-[0.7rem] font-bold text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + refresh ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-3 px-4 h-[52px] rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-200">
          <Search className="w-[18px] h-[18px] text-slate-400 flex-shrink-0 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="گەڕان — ناو یان ژمارەی مۆبایل..."
            dir="rtl"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="w-8 h-8 -me-2 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 active:scale-90 transition-all duration-200 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => load()}
          className="w-[52px] h-[52px] flex-shrink-0 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center text-slate-500 active:scale-95 transition-all duration-200 touch-manipulation"
        >
          <RefreshCw className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Filter segmented control + pending ───────────────────────────── */}
      <div className="px-4 pt-3 flex items-center gap-2">

        {/* داهاتوو / ئەمڕۆ / هەموو */}
        <div className="flex-1 min-w-0 flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {(['upcoming', 'today', 'all'] as Filter[]).map(f => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  'flex-1 min-w-0 h-10 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 touch-manipulation transition-all duration-200 active:scale-95',
                  on ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 font-semibold',
                ].join(' ')}
              >
                {FILTER_LABELS[f]}
                <span className={[
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums transition-colors duration-200',
                  on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {tabCounts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pending bell capsule */}
        <button
          onClick={() => setFilter(filter === 'pending' ? 'upcoming' : 'pending')}
          className={[
            'relative h-12 px-3.5 flex-shrink-0 rounded-2xl flex items-center gap-1.5 text-xs font-bold touch-manipulation transition-all duration-200 active:scale-95',
            filter === 'pending'
              ? 'bg-gradient-to-l from-amber-400 to-orange-500 text-white shadow-[0_10px_24px_-8px_rgb(245,158,11,0.6)]'
              : 'bg-white border border-slate-100/80 text-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
          ].join(' ')}
        >
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>{FILTER_LABELS['pending']}</span>
          {allPendingCount > 0 && (
            <span className="absolute -top-1.5 -start-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-md-surface">
              {allPendingCount > 9 ? '9+' : allPendingCount}
            </span>
          )}
        </button>
      </div>

      <p className="px-5 pt-4 pb-1 text-xs text-slate-400 font-bold">{filtered.length} کاتی سەردان</p>

      {/* ── Skeletons ────────────────────────────────────────────────────── */}
      {loading && (
        <div className="px-4 pt-1">
          <Skeleton variant="card" count={3} className="h-44" />
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-8 text-center">
          <div className={`w-16 h-16 flex items-center justify-center ${SURFACE}`}>
            <Calendar className="w-7 h-7 text-indigo-300" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-slate-700">
              {search ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'هیچ کاتی سەردانیکردنێک نییە'}
            </p>
            <p className="text-xs text-slate-400">
              {search ? 'ناو یان ژمارەی دیکە تەماشا بکە' : 'کاتەکانی نوێ لێرە دەردەکەون'}
            </p>
          </div>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="px-4 pt-1 space-y-6">
          {groups.map(group => (
            <section key={group.key} className="w-full max-w-md mx-auto">

              {/* Sticky date section header */}
              <div className="sticky top-16 z-10 -mx-1 px-1 py-2.5 bg-md-surface/95 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-base font-black text-slate-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {group.dayName} · {group.date}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {group.items.map(appt => {
                  const { time }    = formatDT(appt.appointment_time);
                  const fbLinks     = appt.customers.facebook_id ? getFbLinks(appt.customers.facebook_id) : null;
                  // The face scanned for this booking; older bookings predate it
                  const photo       = appt.photo_url ?? appt.customers.photo_url;
                  const isPending   = appt.status === 'pending';
                  const isConfirmed = appt.status === 'confirmed';
                  const isCancelled = appt.status === 'cancelled';
                  // Pending bookings open on the accept messages; the sheet can switch kinds.
                  const waKind: WhatsAppTemplateKind = isCancelled ? 'decline' : 'accept';
                  const hasWaTemplates = waTemplates.length > 0;
                  const tone = STATUS_TONE[isConfirmed ? 'confirmed' : isCancelled ? 'cancelled' : 'pending'];

                  return (
                    <article
                      key={appt.id}
                      className={`relative p-4 transition-opacity duration-200 ${SURFACE} ${isCancelled ? 'opacity-60' : ''}`}
                    >

                      {/* ── Avatar + name/status + time & phone pills ── */}
                      <div className="flex items-start gap-3.5">

                        <div className="relative w-16 h-16 flex-shrink-0">
                          {photo && !failedPhotos.has(appt.id) ? (
                            <button
                              type="button"
                              onClick={() => setPreview(photo)}
                              className={`absolute inset-0 rounded-full overflow-hidden ring-2 ring-offset-2 ${tone.ring} touch-manipulation active:scale-95 transition-transform duration-200`}
                            >
                              <img
                                src={photo}
                                alt={appt.customers.full_name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={() => setFailedPhotos(prev => new Set(prev).add(appt.id))}
                              />
                            </button>
                          ) : (
                            <div className={`absolute inset-0 rounded-full flex items-center justify-center select-none ring-2 ring-offset-2 ${tone.ring} ${tone.avatar}`}>
                              <User className="w-7 h-7" />
                            </div>
                          )}
                          <span className={`absolute bottom-0 end-0 w-3.5 h-3.5 rounded-full border-2 border-white z-10 ${tone.dot}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-black text-base text-slate-900 leading-snug truncate">
                              {appt.customers.full_name}
                            </p>
                            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${tone.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                              {STATUS_LABEL[appt.status]}
                            </span>
                          </div>

                          {/* The date is shown once in the section header */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <span className={PILL}>
                              <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              {time}
                            </span>
                            <span className={PILL} dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="tabular-nums tracking-wide">{appt.customers.phone_number}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Booked-at pill + contact buttons ── */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5">
                        <span className={`${PILL} text-slate-500`} dir="ltr">
                          <History className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="tabular-nums">{formatCreatedAt(appt.created_at)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${appt.customers.phone_number}`}
                            className={`${CONTACT_BTN} bg-slate-100/80 text-slate-600 active:bg-slate-200/80`}
                          >
                            <Phone className="w-[18px] h-[18px]" />
                          </a>
                          {hasWaTemplates ? (
                            <button
                              type="button"
                              onClick={() => setWaSheet({ appt, kind: waKind, afterAction: false })}
                              className={`${CONTACT_BTN} bg-[#25d366] text-white shadow-[0_8px_18px_-8px_rgba(37,211,102,0.8)]`}
                            >
                              {WA_ICON_SM}
                            </button>
                          ) : (
                            <a
                              href={waLink(appt.customers.phone_number)}
                              target="_blank" rel="noopener noreferrer"
                              className={`${CONTACT_BTN} bg-[#25d366] text-white shadow-[0_8px_18px_-8px_rgba(37,211,102,0.8)]`}
                            >
                              {WA_ICON_SM}
                            </a>
                          )}
                          {fbLinks && (
                            <a
                              href={fbLinks.fbUrl}
                              target="_blank" rel="noopener noreferrer"
                              className={`${CONTACT_BTN} bg-[#1877f2] text-white shadow-[0_8px_18px_-8px_rgba(24,119,242,0.8)]`}
                            >
                              {FB_ICON_SM}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Customer notes */}
                      {appt.customers.notes && (
                        <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-100 leading-relaxed" dir="rtl">
                          📝 {appt.customers.notes}
                        </p>
                      )}

                      <div className="h-px bg-slate-100 my-4" />

                      {/* ── Actions ── */}
                      {isPending && (
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => setDecision({ appt, kind: 'accept' })}
                            className={`flex-1 ${ACTION_BTN} bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-[0_10px_24px_-8px_rgb(79,70,229,0.6)]`}
                          >
                            <CheckCircle2 className="w-[18px] h-[18px]" />
                            پەسەندکردن
                          </button>
                          <button
                            onClick={() => setDecision({ appt, kind: 'decline' })}
                            className={`px-5 ${ACTION_BTN} bg-rose-50 text-rose-600 active:bg-rose-100`}
                          >
                            <XCircle className="w-[18px] h-[18px]" />
                            هەڵوەشاندن
                          </button>
                        </div>
                      )}

                      {isConfirmed && (
                        (filter === 'upcoming' || filter === 'today')
                          ? <Countdown appointmentTime={appt.appointment_time} />
                          : filter === 'all'
                            ? (
                              <div className="flex gap-2.5">
                                <button
                                  onClick={() => setDecision({ appt, kind: 'decline' })}
                                  className={`flex-1 ${ACTION_BTN} bg-rose-50 text-rose-600 active:bg-rose-100`}
                                >
                                  <XCircle className="w-[18px] h-[18px]" />
                                  هەڵوەشاندنەوە
                                </button>
                                <button
                                  onClick={() => updateStatus(appt.id, 'pending')}
                                  className={`w-12 ${ACTION_BTN} bg-slate-100/80 text-slate-500 active:bg-slate-200/80`}
                                >
                                  <RefreshCw className="w-[18px] h-[18px]" />
                                </button>
                              </div>
                            )
                            : null
                      )}

                      {isCancelled && (
                        <button
                          onClick={() => updateStatus(appt.id, 'pending')}
                          className={`w-full ${ACTION_BTN} bg-slate-100/80 text-slate-600 active:bg-slate-200/80`}
                        >
                          <RefreshCw className="w-[18px] h-[18px]" />
                          گەڕاندنەوە بۆ چاوەڕوان
                        </button>
                      )}

                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Accept / decline confirmation ────────────────────────────────── */}
      {decision && (() => {
        const { dayName, date, time } = formatDT(decision.appt.appointment_time);
        return (
          <BookingConfirmSheet
            key={decision.appt.id}
            decision={decision.kind}
            name={decision.appt.customers.full_name}
            when={`${dayName} ${date} · ${time}`}
            onConfirm={() => updateStatus(decision.appt.id, decision.kind === 'accept' ? 'confirmed' : 'cancelled')}
            onCancel={() => setDecision(null)}
            onDone={finishDecision}
          />
        );
      })()}

      {/* ── WhatsApp message sheet ───────────────────────────────────────── */}
      {waSheet && (
        <WhatsAppSendSheet
          phone={waSheet.appt.customers.phone_number}
          kind={waSheet.kind}
          templates={waTemplates}
          values={waValues(waSheet.appt)}
          afterAction={waSheet.afterAction}
          onClose={() => setWaSheet(null)}
        />
      )}

      {/* ── Image lightbox ───────────────────────────────────────────────── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)' }}
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="" className="w-full rounded-3xl object-contain shadow-[0_12px_40px_rgb(0,0,0,0.25)]" />
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl flex items-center justify-center touch-manipulation bg-white text-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
