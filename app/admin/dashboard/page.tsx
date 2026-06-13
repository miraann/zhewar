'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Clock, ImageIcon, User, LayoutDashboard, LogOut, Scissors, Share2,
} from 'lucide-react';
import ScheduleEditor     from '@/components/admin/ScheduleEditor';
import AppointmentsView   from '@/components/admin/AppointmentsView';
import ProfileEditor      from '@/components/admin/ProfileEditor';
import GalleryEditor      from '@/components/admin/GalleryEditor';
import SocialEditor      from '@/components/admin/SocialEditor';

type Tab = 'appointments' | 'schedule' | 'profile' | 'gallery' | 'social';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'appointments', label: 'کاتەکانی سەردانیکردن', icon: LayoutDashboard },
  { id: 'schedule',     label: 'خشتەی کار',            icon: Clock           },
  { id: 'profile',      label: 'پرۆفایل',               icon: User            },
  { id: 'gallery',      label: 'گەلەری',                icon: ImageIcon       },
  { id: 'social',       label: 'پۆستەکانی سۆشیاڵ میدیا', icon: Share2          },
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

  function setTab(t: Tab) {
    router.push(`/admin/dashboard?tab=${t}`, { scroll: false });
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-white/8">
        <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-amber-500/30 bg-amber-500/8 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-display text-sm font-bold text-white tracking-wide">
              پانێڵی ئەدمین
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/30 text-xs font-medium active:text-white/70 transition-colors touch-manipulation"
          >
            <LogOut className="w-3.5 h-3.5" />
            دەرچوون
          </button>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto scrollbar-hide border-t border-white/8">
          <div className="flex max-w-lg mx-auto px-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-all touch-manipulation',
                tab === id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-white/30 active:text-white/60',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          </div>
        </div>
      </header>

      {/* ── Tab Content ── */}
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
