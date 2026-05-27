'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Clock, ImageIcon, User, LayoutDashboard, LogOut, Scissors,
} from 'lucide-react';
import ScheduleEditor     from '@/components/admin/ScheduleEditor';
import AppointmentsView   from '@/components/admin/AppointmentsView';
import BlockedDatesEditor from '@/components/admin/BlockedDatesEditor';
import ProfileEditor      from '@/components/admin/ProfileEditor';
import GalleryEditor      from '@/components/admin/GalleryEditor';

type Tab = 'appointments' | 'schedule' | 'blocked' | 'profile' | 'gallery';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'appointments', label: 'کاتەکانی سەردانیکردن', icon: LayoutDashboard },
  { id: 'schedule',     label: 'خشتەی کار',  icon: Clock           },
  { id: 'blocked',      label: 'رووژی داخراو', icon: Calendar       },
  { id: 'profile',      label: 'پرۆفایل',    icon: User            },
  { id: 'gallery',      label: 'گالری',      icon: ImageIcon       },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('appointments');

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="font-display text-sm font-semibold italic text-white tracking-wider">
              پانێڵی ئەدمین
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-neutral-500 text-xs active:text-white transition-colors touch-manipulation"
          >
            <LogOut className="w-4 h-4" />
            دەرچوون
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-white/[0.04] px-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-all touch-manipulation',
                tab === id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-neutral-500 active:text-neutral-300',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab Content ── */}
      <main className="flex-1 max-w-lg mx-auto w-full">
        {tab === 'appointments' && <AppointmentsView />}
        {tab === 'schedule'     && <ScheduleEditor />}
        {tab === 'blocked'      && <BlockedDatesEditor />}
        {tab === 'profile'      && <ProfileEditor />}
        {tab === 'gallery'      && <GalleryEditor />}
      </main>
    </div>
  );
}
