import Link from 'next/link';
import { Scissors, Star, Award, Users } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

const STATS = [
  { icon: Award, label: 'ساڵ',         value: '٦+' },
  { icon: Users, label: 'کڕیار',        value: '٢ه+' },
  { icon: Star,  label: 'هەڵسەنگاندن', value: '٤.٩' },
];

export default function AboutSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-hidden text-neutral-900">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(245,158,11,0.22)_0%,transparent_68%)]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-300/15 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-10">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-[2px] bg-gradient-to-l from-amber-500 to-transparent rounded-full" />
          <span className="text-amber-600 text-[0.65rem] tracking-[0.4em] font-medium">ئەمارە</span>
          <div className="w-10 h-[2px] bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
        </div>

        {/* Avatar frame */}
        <div className="relative">
          <div className="w-48 h-48 rounded-full border-2 border-amber-400/40 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.2)]">
            <div className="w-38 h-38 rounded-full border-2 border-amber-500/60 flex items-center justify-center bg-amber-50/70 shadow-[0_0_40px_rgba(245,158,11,0.25)] p-4">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.name}
                  className="w-28 h-28 rounded-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Scissors className="w-11 h-11 text-amber-500" />
                  <span className="font-display text-xl font-bold text-amber-600">
                    ب·ل
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -inset-5 rounded-full border-2 border-dashed border-amber-400/30 animate-spin-slow" />
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1),0_0_24px_rgba(245,158,11,0.5)]" />
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none drop-shadow-sm">
            {profile.name}
          </h2>
          <p className="text-amber-600 text-xs tracking-[0.3em] font-medium">بەربەری مۆستا</p>
          {profile.tagline && (
            <p className="text-neutral-600 text-sm leading-relaxed mt-4 px-2">
              {profile.tagline}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 py-5 rounded-2xl border-2 border-amber-300/50 bg-white shadow-[0_4px_20px_rgba(245,158,11,0.15),0_0_0_1px_rgba(245,158,11,0.08)]"
            >
              <Icon className="w-4 h-4 text-amber-500" />
              <span className="font-display text-2xl font-bold text-neutral-900 leading-none">{value}</span>
              <span className="text-neutral-500 text-[0.65rem] tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/book"
          className="w-full py-4 rounded-2xl border-2 border-amber-500/60 text-amber-700 font-bold text-sm tracking-wide text-center touch-manipulation active:bg-amber-500/10 transition-colors bg-amber-50/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          شوێنەکەت پارێزبگرە
        </Link>
      </div>
    </div>
  );
}
