import Link from 'next/link';
import { Scissors, CalendarPlus, MapPin } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

export default function HeroSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden grain text-neutral-900 bg-white">

      {/* Red+blue ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(220,38,38,0.09)_0%,rgba(37,99,235,0.04)_55%,transparent_70%)]" />

      {/* Barber pole stripe — top */}
      <div
        className="absolute top-0 inset-x-0 h-2 z-10"
        style={{ background: 'repeating-linear-gradient(-45deg,#DC2626 0px,#DC2626 6px,#FFFFFF 6px,#FFFFFF 12px,#2563EB 12px,#2563EB 18px,#FFFFFF 18px,#FFFFFF 24px)' }}
      />
      <div className="absolute top-2 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-300/60 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />

      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border-2 border-red-600/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border-2 border-blue-600/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border-2 border-red-500/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-7 max-w-sm mx-auto">

        {/* Logo / icon */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-2 border-gray-300 bg-gradient-to-b from-gray-100 to-white flex items-center justify-center shadow-[0_0_0_6px_rgba(156,163,175,0.15),0_8px_40px_rgba(0,0,0,0.14),0_0_60px_rgba(220,38,38,0.15)] overflow-hidden">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <Scissors className="w-12 h-12 text-red-600" />
            )}
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-red-500/25 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute -inset-3 rounded-full border border-blue-600/10 animate-pulse" />
        </div>

        {/* Eyebrow */}
        <p className="text-red-600 text-[0.7rem] tracking-[0.35em] font-medium">
          دامەزراوە ٢٠٢٠ &nbsp;·&nbsp; چاکسازی بەرز
        </p>

        {/* Main heading */}
        <h1 className="font-display text-[4.5rem] leading-[0.9] font-bold text-neutral-900 tracking-tight drop-shadow-sm">
          {profile.name}
        </h1>

        {/* Ornament — red / scissors / blue */}
        <div className="flex items-center gap-4 w-full justify-center">
          <div className="flex-1 max-w-[100px] h-[2px] bg-gradient-to-l from-red-600/70 to-transparent rounded-full" />
          <Scissors className="w-4 h-4 text-blue-600/60 rotate-45" />
          <div className="flex-1 max-w-[100px] h-[2px] bg-gradient-to-r from-blue-600/70 to-transparent rounded-full" />
        </div>

        {/* Tagline */}
        <p className="text-neutral-600 text-base leading-relaxed text-balance">
          {profile.tagline}
        </p>

        {/* CTA — red button */}
        <Link
          href="/book"
          className="relative group flex items-center justify-center gap-2.5 w-full max-w-[280px] py-4 rounded-2xl bg-gradient-to-b from-red-500 to-red-700 text-white font-bold text-base tracking-wide shadow-[0_0_50px_rgba(220,38,38,0.45),0_4px_20px_rgba(220,38,38,0.35)] overflow-hidden touch-manipulation active:scale-[0.97] transition-transform"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
          <CalendarPlus className="relative w-5 h-5" />
          <span className="relative">ناو تۆمار کردن</span>
        </Link>

        {/* Address */}
        {profile.address && (
          <p className="flex items-center gap-1.5 text-neutral-500 text-sm font-medium">
            <MapPin className="w-3.5 h-3.5 text-red-500/70 flex-shrink-0" />
            {profile.address}
          </p>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <span className="text-neutral-400 text-[0.65rem] tracking-[0.25em]">گازبدە</span>
        <div className="w-[2px] h-8 bg-gradient-to-b from-red-500/50 to-transparent rounded-full" />
      </div>
    </div>
  );
}
