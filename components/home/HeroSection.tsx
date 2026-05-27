import Link from 'next/link';
import { Scissors, CalendarPlus, MapPin } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

export default function HeroSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden grain text-neutral-900">
      {/* Background */}
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_40%,rgba(245,158,11,0.28)_0%,rgba(251,191,36,0.10)_45%,transparent_70%)]" />
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border-2 border-amber-400/30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border-2 border-amber-500/40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-amber-400/25 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-7 max-w-sm mx-auto">

        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-amber-500/70 bg-amber-400/[0.12] flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.45),0_0_120px_rgba(245,158,11,0.15)]">
            <Scissors className="w-10 h-10 text-amber-600" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/50 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute -inset-3 rounded-full border border-amber-300/20 animate-pulse" />
        </div>

        {/* Eyebrow */}
        <p className="text-amber-600 text-[0.7rem] tracking-[0.35em] font-medium">
          دامەزراوە ٢٠٢٠ &nbsp;·&nbsp; چاکسازی بەرز
        </p>

        {/* Main heading */}
        <h1 className="font-display text-[4.5rem] leading-[0.9] font-bold text-neutral-900 tracking-tight drop-shadow-sm">
          {profile.name}
        </h1>

        {/* Ornament */}
        <div className="flex items-center gap-4 w-full justify-center">
          <div className="flex-1 max-w-[100px] h-[2px] bg-gradient-to-l from-amber-500/80 to-transparent rounded-full" />
          <Scissors className="w-4 h-4 text-amber-500 rotate-45" />
          <div className="flex-1 max-w-[100px] h-[2px] bg-gradient-to-r from-amber-500/80 to-transparent rounded-full" />
        </div>

        {/* Tagline */}
        <p className="text-neutral-600 text-base leading-relaxed text-balance">
          {profile.tagline}
        </p>

        {/* CTA */}
        <Link
          href="/book"
          className="relative group flex items-center justify-center gap-2.5 w-full max-w-[280px] py-4 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-base tracking-wide shadow-[0_0_50px_rgba(245,158,11,0.55),0_4px_20px_rgba(245,158,11,0.4)] overflow-hidden touch-manipulation active:scale-[0.97] transition-transform"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
          <CalendarPlus className="relative w-5 h-5" />
          <span className="relative">کاتی سەردانیکردن وەربگرە</span>
        </Link>

        {/* Address */}
        {profile.address && (
          <p className="flex items-center gap-1.5 text-neutral-500 text-sm font-medium">
            <MapPin className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0" />
            {profile.address}
          </p>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <span className="text-neutral-400 text-[0.65rem] tracking-[0.25em]">گازبدە</span>
        <div className="w-[2px] h-8 bg-gradient-to-b from-amber-500/60 to-transparent rounded-full" />
      </div>
    </div>
  );
}
