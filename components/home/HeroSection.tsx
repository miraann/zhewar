import Link from 'next/link';
import { CalendarPlus, Search } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

export default function HeroSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-neutral-950">

      {/* Deep ambient glow layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(245,158,11,0.12),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_110%,rgba(245,158,11,0.06),transparent_70%)]" />

      {/* Cinematic rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-amber-500/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-amber-500/8 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-amber-500/10 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-7 max-w-sm mx-auto">

        {/* Logo */}
        <div className="relative">
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-2 border-amber-500/20 shadow-[0_0_60px_rgba(245,158,11,0.12),0_8px_32px_rgba(0,0,0,0.5)]">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-amber-500/5 flex items-center justify-center">
                <span className="text-amber-400/60 text-6xl">✂</span>
              </div>
            )}
          </div>
          {/* Glow rings around avatar */}
          <div className="absolute inset-0 rounded-full border border-amber-400/15 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-3 rounded-full border border-amber-500/5 animate-pulse" />
        </div>

        {/* Name */}
        <h1 className="font-display text-[3rem] md:text-[4.5rem] leading-[0.9] font-bold text-white tracking-tight">
          {profile.name}
        </h1>

        {/* Ornament */}
        <div className="flex items-center gap-4 w-full justify-center">
          <div className="flex-1 max-w-[100px] h-px bg-gradient-to-l from-amber-500/40 to-transparent" />
          <span className="text-amber-500/60 text-lg">✦</span>
          <div className="flex-1 max-w-[100px] h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </div>

        {/* Tagline */}
        <p className="text-white/45 text-base leading-relaxed text-balance">
          {profile.tagline}
        </p>

        {/* CTA */}
        <Link
          href="/book"
          className="relative group flex items-center justify-center gap-2.5 w-full max-w-[300px] py-4 rounded-2xl font-bold text-base tracking-wide overflow-hidden touch-manipulation active:scale-[0.97] transition-transform bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_50px_rgba(245,158,11,0.3),0_4px_20px_rgba(245,158,11,0.2)]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
          <CalendarPlus className="relative w-5 h-5" />
          <span className="relative">ناو تۆمار کردن</span>
        </Link>

        {/* Address */}
        {profile.address && (
          <p className="flex items-center gap-1.5 text-white/30 text-sm font-medium">
            <span className="text-amber-500/50">📍</span>
            {profile.address}
          </p>
        )}
      </div>

      {/* Scroll indicator + check booking */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-full px-6">
        <p className="text-white/20 text-[0.65rem] tracking-wide text-center whitespace-nowrap">
          کلیک بکە بۆ بیبنی کاتی سەردانیکردن
        </p>
        <div className="relative p-[1.5px] rounded-2xl overflow-hidden w-full max-w-[300px]">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/40 via-amber-400/60 to-amber-600/40 rounded-2xl" />
          <Link
            href="/my-bookings"
            className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-[14px] bg-neutral-950 text-white/50 font-semibold text-base active:bg-neutral-900 touch-manipulation transition-colors whitespace-nowrap w-full"
          >
            <Search className="w-4 h-4 text-amber-500/50 flex-shrink-0" />
            <span>کاتەکانی سەردانیکردن</span>
          </Link>
        </div>
        <span className="text-white/15 text-[0.6rem] tracking-[0.25em]">سەرەکی</span>
        <div className="w-[1px] h-4 bg-gradient-to-b from-amber-500/30 to-transparent rounded-full" />
      </div>
    </div>
  );
}
