import Link from 'next/link';
import { CalendarPlus, Search } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

export default function HeroSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative h-full flex flex-col items-center px-5 overflow-hidden">

      <style>{`
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Main content — grows to fill available space, centered ── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 sm:gap-5 max-w-xs mx-auto w-full pt-20 sm:pt-24">

        {/* Avatar with rotating red/blue conic ring */}
        <div className="relative w-52 h-52 sm:w-72 sm:h-72 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(#ef4444 0deg, #ef4444 110deg, #f8fafc 135deg, #3b82f6 160deg, #3b82f6 290deg, #f8fafc 315deg, #ef4444 360deg)',
              animation: 'ringRotate 3.5s linear infinite',
            }}
          />
          <div className="absolute inset-[3px] rounded-full bg-white">
            <div className="absolute inset-[2px] rounded-full overflow-hidden bg-neutral-100">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                  <span className="text-blue-500 text-5xl">✂</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <h1 className="font-display text-[2.5rem] sm:text-[3.5rem] leading-[1.05] font-bold text-neutral-900 tracking-tight">
          {profile.name}
        </h1>

        {/* Barber pole ornament divider */}
        <div className="flex items-center gap-3 w-full justify-center">
          <div className="flex-1 max-w-[80px] h-[2px] rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ef4444)' }} />
          <span className="text-neutral-400 text-xs">✦</span>
          <div className="flex-1 max-w-[80px] h-[2px] rounded-full" style={{ background: 'linear-gradient(to left, transparent, #3b82f6)' }} />
        </div>

        {/* Tagline */}
        <p className="text-neutral-500 font-medium text-[0.9rem] leading-relaxed text-balance px-2">
          {profile.tagline}
        </p>

        {/* Booking CTA */}
        <Link
          href="/book"
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-base text-white bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation shadow-md shadow-blue-200/70"
        >
          <CalendarPlus className="w-5 h-5" />
          <span>ناو تۆمار کردن</span>
        </Link>

        {/* Check bookings */}
        <p className="text-neutral-400 text-[0.65rem] tracking-wide text-center">
          کلیک بکە بۆ بیبنی کاتی سەردانیکردن
        </p>
        <Link
          href="/my-bookings"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-base text-white bg-red-500 active:bg-red-600 touch-manipulation transition-colors"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span>بینین و دڵنیاکردنەوەی کاتی سەردانیکردن</span>
        </Link>

        {/* Address */}
        {profile.address && (
          <p className="flex items-center gap-1.5 text-neutral-400 text-sm font-medium">
            <span>📍</span>
            {profile.address}
          </p>
        )}
      </div>

    </div>
  );
}
