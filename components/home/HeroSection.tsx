import Link from 'next/link';
import { CalendarPlus, Search } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

export default function HeroSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden pb-44">

      <style>{`
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Content ── */}
      <div className="relative z-[3] flex flex-col items-center text-center gap-5 max-w-xs mx-auto w-full pt-24">

        {/* Avatar with rotating red/blue conic ring */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">

          {/* Spinning border only — image is NOT a child of this element */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(#ef4444 0deg, #ef4444 110deg, #f8fafc 135deg, #3b82f6 160deg, #3b82f6 290deg, #f8fafc 315deg, #ef4444 360deg)',
              animation: 'ringRotate 3.5s linear infinite',
            }}
          />

          {/* White gap ring — static */}
          <div className="absolute inset-[3px] rounded-full bg-white">
            {/* Image — static, centered, always upright */}
            <div className="absolute inset-[2px] rounded-full overflow-hidden bg-neutral-100">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
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
          <div
            className="flex-1 max-w-[80px] h-[2px] rounded-full"
            style={{ background: 'linear-gradient(to right, transparent, #ef4444)' }}
          />
          <span className="text-neutral-400 text-xs">✦</span>
          <div
            className="flex-1 max-w-[80px] h-[2px] rounded-full"
            style={{ background: 'linear-gradient(to left, transparent, #3b82f6)' }}
          />
        </div>

        {/* Tagline */}
        <p className="text-neutral-500 font-medium text-[0.9rem] leading-relaxed text-balance px-2">
          {profile.tagline}
        </p>

        {/* Primary CTA */}
        <Link
          href="/book"
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-base text-white bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation shadow-md shadow-blue-200/70"
        >
          <CalendarPlus className="w-5 h-5" />
          <span>ناو تۆمار کردن</span>
        </Link>

        {/* Address */}
        {profile.address && (
          <p className="flex items-center gap-1.5 text-neutral-400 text-sm font-medium">
            <span>📍</span>
            {profile.address}
          </p>
        )}
      </div>

      {/* ── Bottom: check bookings ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[3] flex flex-col items-center gap-2 w-full px-5">
        <p className="text-neutral-400 text-[0.65rem] tracking-wide text-center">
          کلیک بکە بۆ بیبنی کاتی سەردانیکردن
        </p>
        <Link
          href="/my-bookings"
          className="flex items-center justify-center gap-2 w-full max-w-[300px] py-3.5 rounded-2xl font-bold text-base text-red-600 bg-red-50 border-2 border-red-400 active:bg-red-100 touch-manipulation transition-colors"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span>کاتەکانی سەردانیکردن</span>
        </Link>
        <div className="flex flex-col items-center gap-1">
          <span className="text-neutral-400 text-[0.6rem] tracking-[0.25em]">سەرەتا</span>
          <div className="w-px h-4 bg-gradient-to-b from-neutral-300 to-transparent" />
        </div>
      </div>
    </div>
  );
}
