'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Clock, ImageIcon, User, LayoutDashboard, LogOut, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ScheduleEditor   from '@/components/admin/ScheduleEditor';
import AppointmentsView from '@/components/admin/AppointmentsView';
import ProfileEditor    from '@/components/admin/ProfileEditor';
import GalleryEditor    from '@/components/admin/GalleryEditor';
import SocialEditor     from '@/components/admin/SocialEditor';

type Tab = 'appointments' | 'schedule' | 'profile' | 'gallery' | 'social';

const TABS: { id: Tab; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'appointments', label: 'کاتەکانی سەردانیکردن', short: 'سەردان',  icon: LayoutDashboard },
  { id: 'schedule',     label: 'خشتەی کار',            short: 'خشتە',   icon: Clock           },
  { id: 'profile',      label: 'پرۆفایل',               short: 'پرۆفایل', icon: User           },
  { id: 'gallery',      label: 'گەلەری',                short: 'گەلەری', icon: ImageIcon       },
  { id: 'social',       label: 'پۆستەکانی سۆشیاڵ',     short: 'سۆشیاڵ', icon: Share2          },
];

const VALID_TABS = new Set<Tab>(['appointments', 'schedule', 'profile', 'gallery', 'social']);

export default function AdminDashboard() {
  return <Suspense><Dashboard /></Suspense>;
}

function Dashboard() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const raw          = searchParams.get('tab') as Tab | null;
  const tab: Tab     = raw && VALID_TABS.has(raw) ? raw : 'appointments';

  const [pendingCount, setPendingCount] = useState(0);
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);

  useEffect(() => {
    supabase.from('barber_profile').select('logo_url').single()
      .then(({ data }) => { if (data?.logo_url) setLogoUrl(data.logo_url); });
  }, []);

  useEffect(() => {
    function fetchPending() {
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('appointment_time', new Date().toISOString())
        .then(({ count }) => setPendingCount(count ?? 0));
    }
    fetchPending();
    const channel = supabase
      .channel('realtime:appointments:pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function setTab(t: Tab) {
    router.push(`/admin/dashboard?tab=${t}`, { scroll: false });
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  }

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/92 backdrop-blur-lg border-b border-slate-100/80"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}
      >
        <div className="max-w-lg mx-auto px-4">

          {/* ── Title row ── */}
          <div className="flex items-center justify-between h-14 mt-5">
            <div className="flex items-center gap-3">

              {/* Shop logo with spinning ring */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
                    animation: 'ringRotate 3.5s linear infinite',
                  }}
                />
                <div className="absolute inset-[2.5px] rounded-full bg-white overflow-hidden flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#3b82f6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                      <path d="M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                      <path d="M8.59 8.59L15 15" />
                      <path d="M15 9l-6.41 6.41" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Title + live section subtitle */}
              <div>
                <p className="text-[0.82rem] font-bold text-slate-900 leading-tight tracking-wide">
                  پانێڵی ئەدمین
                </p>
                <p className="text-[0.62rem] text-slate-400 font-medium leading-tight mt-px">
                  {activeTab.label}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 text-xs font-medium active:text-slate-700 active:bg-slate-50 transition-all touch-manipulation border border-transparent active:border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              دەرچوون
            </button>
          </div>

          {/* ── Segmented pill nav ── */}
          <div className="pb-3">
            <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/50">
              {TABS.map(({ id, short, icon: Icon }) => {
                const isActive = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={[
                      'flex-1 relative flex flex-col items-center justify-center gap-[3px] py-[9px] rounded-xl transition-all duration-200 touch-manipulation select-none',
                      isActive
                        ? 'bg-white text-blue-600 scale-[1.02]'
                        : 'text-slate-500 active:text-slate-800 active:bg-white/50',
                    ].join(' ')}
                    style={isActive ? {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(226,232,240,0.8)',
                    } : undefined}
                  >
                    {/* Icon + pending badge */}
                    <div className="relative">
                      <Icon
                        className={`w-[15px] h-[15px] transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                      />
                      {id === 'appointments' && pendingCount > 0 && (
                        <span
                          className="absolute -top-[5px] -right-[6px] min-w-[13px] h-[13px] rounded-full bg-red-500 text-white flex items-center justify-center leading-none font-bold px-[2.5px]"
                          style={{ fontSize: '8px' }}
                        >
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                    </div>

                    {/* Short label */}
                    <span
                      className="leading-none transition-colors duration-200"
                      style={{
                        fontSize: '9.5px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#2563eb' : '#94a3b8',
                      }}
                    >
                      {short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full">
        {tab === 'appointments' && <AppointmentsView />}
        {tab === 'schedule'     && <ScheduleEditor />}
        {tab === 'profile'      && <ProfileEditor />}
        {tab === 'gallery'      && <GalleryEditor />}
        {tab === 'social'       && <SocialEditor />}
      </main>
    </div>
  );
}
