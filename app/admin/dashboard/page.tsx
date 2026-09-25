'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Clock, ImageIcon, User, LayoutDashboard, Share2, Settings, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminLogout } from '@/lib/adminAuth';
import AppointmentsView from '@/components/admin/AppointmentsView';
import PushNotificationInit    from '@/components/admin/PushNotificationInit';
import BottomNav from '@/components/admin/BottomNav';

// Only the default "appointments" tab loads eagerly — the rest are fetched
// on demand so switching tabs doesn't bloat the dashboard's initial bundle
// (this page is also what the Capacitor APK boots straight into).
const ScheduleEditor = dynamic(() => import('@/components/admin/ScheduleEditor'));
const ProfileEditor  = dynamic(() => import('@/components/admin/ProfileEditor'));
const GalleryEditor  = dynamic(() => import('@/components/admin/GalleryEditor'));
const SocialEditor   = dynamic(() => import('@/components/admin/SocialEditor'));
const SettingsEditor = dynamic(() => import('@/components/admin/SettingsEditor'));

type Tab = 'appointments' | 'schedule' | 'profile' | 'gallery' | 'social' | 'settings';
type AppFilter = 'upcoming' | 'today' | 'all' | 'pending';

const TABS: { id: Tab; short: string; icon: React.ElementType }[] = [
  { id: 'appointments', short: 'سەردان',   icon: LayoutDashboard },
  { id: 'schedule',     short: 'خشتە',     icon: Clock           },
  { id: 'profile',      short: 'پرۆفایل',  icon: User            },
  { id: 'gallery',      short: 'گەلەری',   icon: ImageIcon       },
  { id: 'social',       short: 'سۆشیاڵ',   icon: Share2          },
  { id: 'settings',     short: 'ڕێکخستن',  icon: Settings        },
];

const VALID_TABS    = new Set<Tab>(['appointments', 'schedule', 'profile', 'gallery', 'social', 'settings']);
const APP_FILTER_MAP: Record<string, AppFilter> = { upcoming: 'upcoming', today: 'today', all: 'all', pending: 'pending' };

export default function AdminDashboard() {
  return <Suspense><Dashboard /></Suspense>;
}

function Dashboard() {
  useWakeLock();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const raw          = searchParams.get('tab') ?? '';

  // Support deep-link sub-tabs: appointments-pending, appointments-today, etc.
  let tab: Tab;
  let appFilter: AppFilter = 'upcoming';
  if (raw.startsWith('appointments-')) {
    tab = 'appointments';
    appFilter = APP_FILTER_MAP[raw.slice('appointments-'.length)] ?? 'upcoming';
  } else {
    tab = (VALID_TABS.has(raw as Tab) ? raw : 'appointments') as Tab;
  }

  const [pendingCount, setPendingCount] = useState(0);
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);

  useEffect(() => {
    supabase.from('barber_profile').select('logo_url').single()
      .then(({ data }) => { if (data?.logo_url) setLogoUrl(data.logo_url); });
  }, []);

  // Warm the other tabs' code in the background once the browser is idle, so
  // the first tab switch doesn't pay for a chunk download — without this,
  // the initial load stays lean but every first tap on a new tab would.
  useEffect(() => {
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
    const cancel = (window as any).cancelIdleCallback ?? clearTimeout;
    const id = idle(() => {
      import('@/components/admin/ScheduleEditor');
      import('@/components/admin/ProfileEditor');
      import('@/components/admin/GalleryEditor');
      import('@/components/admin/SocialEditor');
      import('@/components/admin/SettingsEditor');
    });
    return () => cancel(id);
  }, []);

  // Used to query `appointments` directly with the anon key, which
  // required that table to be readable by anon — a data exposure hole now
  // closed by RLS (customers/appointments only readable via the
  // admin-authenticated API with the service-role key). Poll that route
  // and derive the count client-side instead of subscribing to Realtime.
  // On the appointments tab, AppointmentsView already polls this route and
  // reports the count via onPendingCount, so don't double the requests.
  const onAppointmentsTab = tab === 'appointments';
  useEffect(() => {
    if (onAppointmentsTab) return;
    function fetchPending() {
      if (document.hidden) return;
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const token = localStorage.getItem('admin_token') ?? '';
      fetch(
        isCapacitor ? 'https://zhewar.shop/api/admin/appointments' : '/api/admin/appointments',
        {
          ...(isCapacitor ? { credentials: 'include' } : {}),
          headers: token ? { 'X-Admin-Token': token } : {},
        },
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data: { status: string; appointment_time: string }[]) => {
          const now = Date.now();
          const count = data.filter(
            (a) => a.status === 'pending' && new Date(a.appointment_time).getTime() >= now,
          ).length;
          setPendingCount(count);
        })
        .catch(() => {});
    }
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    document.addEventListener('visibilitychange', fetchPending);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', fetchPending);
    };
  }, [onAppointmentsTab]);

  function setTab(t: Tab) {
    router.push(`/admin/dashboard?tab=${t}`, { scroll: false });
  }

  return (
    <div className="min-h-screen flex flex-col bg-md-surface">

      {/* Registers FCM token when running inside the Capacitor APK */}
      <PushNotificationInit />

      {/* ── Header (M3 small top app bar) ── */}
      <header className="sticky top-0 z-30 bg-md-surface/95 backdrop-blur-lg border-b border-md-outline-variant shadow-md-1">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center gap-3 h-16">

            {/* Shop logo with spinning ring */}
            <div className="relative w-11 h-11 flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(rgb(var(--md-tertiary)) 0deg,rgb(var(--md-tertiary)) 110deg,rgb(var(--md-surface)) 135deg,rgb(var(--md-primary)) 160deg,rgb(var(--md-primary)) 290deg,rgb(var(--md-surface)) 315deg,rgb(var(--md-tertiary)) 360deg)',
                  animation: 'ringRotate 3.5s linear infinite',
                }}
              />
              <div className="absolute inset-[2.5px] rounded-full bg-md-surface-container overflow-hidden flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="rgb(var(--md-primary))" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                    <path d="M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                    <path d="M8.59 8.59L15 15" />
                    <path d="M15 9l-6.41 6.41" />
                  </svg>
                )}
              </div>
            </div>

            <p className="flex-1 text-[0.9rem] font-bold text-md-on-surface leading-tight tracking-wide">
              پانێڵی ئەدمین
            </p>

            {/* Refresh + logout */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="w-9 h-9 rounded-full flex items-center justify-center text-md-on-surface-variant active:bg-md-surface-container-high active:text-md-on-surface touch-manipulation transition-colors"
              >
                <RefreshCw className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={adminLogout}
                className="w-9 h-9 rounded-full flex items-center justify-center text-md-error active:bg-md-error-container/60 touch-manipulation transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full admin-bottomnav-clearance">
        {tab === 'appointments' && <AppointmentsView initialFilter={appFilter} onPendingCount={setPendingCount} />}
        {tab === 'schedule'     && <ScheduleEditor />}
        {tab === 'profile'      && <ProfileEditor />}
        {tab === 'gallery'      && <GalleryEditor />}
        {tab === 'social'       && <SocialEditor />}
        {tab === 'settings'     && <SettingsEditor />}
      </main>

      <BottomNav
        tabs={TABS}
        active={tab}
        badges={{ appointments: pendingCount }}
        onSelect={setTab}
      />
    </div>
  );
}
