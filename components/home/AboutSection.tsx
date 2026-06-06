import Link from 'next/link';
import { Scissors, Star, Award, Users } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

const STATS = [
  { icon: Award, label: 'ساڵ',         value: '٦+',  color: 'text-red-600'  },
  { icon: Users, label: 'کڕیار',        value: '٢ه+', color: 'text-blue-600' },
  { icon: Star,  label: 'هەڵسەنگاندن', value: '٤.٩', color: 'text-red-600'  },
];

export default function AboutSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-hidden text-neutral-900 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(220,38,38,0.07)_0%,rgba(37,99,235,0.04)_60%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/5 blur-3xl rounded-full pointer-events-none" />

      {/* Barber stripe divider */}
      <div
        className="absolute top-0 inset-x-0 h-1"
        style={{ background: 'repeating-linear-gradient(-45deg,#DC2626 0px,#DC2626 4px,#FFFFFF 4px,#FFFFFF 8px,#2563EB 8px,#2563EB 12px,#FFFFFF 12px,#FFFFFF 16px)' }}
      />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-10">

        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-[2px] bg-gradient-to-l from-red-600 to-transparent rounded-full" />
          <span className="text-red-600 text-[0.65rem] tracking-[0.4em] font-medium">ئەمارە</span>
          <div className="w-10 h-[2px] bg-gradient-to-r from-blue-600 to-transparent rounded-full" />
        </div>

        {/* Avatar — chrome frame */}
        <div className="relative">
          <div className="w-48 h-48 rounded-full border-2 border-gray-300 bg-gradient-to-b from-gray-200/30 to-white/10 flex items-center justify-center shadow-[0_0_0_6px_rgba(156,163,175,0.12),0_8px_40px_rgba(0,0,0,0.10)]">
            <div className="w-[150px] h-[150px] rounded-full border-2 border-red-600/30 flex items-center justify-center bg-white shadow-[0_0_30px_rgba(220,38,38,0.10)] p-4">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={profile.name} className="w-28 h-28 rounded-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Scissors className="w-11 h-11 text-red-600" />
                  <span className="font-display text-xl font-bold text-blue-600">ب·ل</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -inset-5 rounded-full border-2 border-dashed border-red-600/15 animate-spin-slow" />
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_12px_rgba(220,38,38,0.9),0_0_24px_rgba(220,38,38,0.4)]" />
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none drop-shadow-sm">
            {profile.name}
          </h2>
          <p className="text-blue-600 text-xs tracking-[0.3em] font-medium">بەربەری مۆستا</p>
          {profile.tagline && (
            <p className="text-neutral-600 text-sm leading-relaxed mt-4 px-2">
              {profile.tagline}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {STATS.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 py-5 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-[0_4px_20px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)]"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`font-display text-2xl font-bold ${color} leading-none`}>{value}</span>
              <span className="text-neutral-500 text-[0.65rem] tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/book"
          className="w-full py-4 rounded-2xl border-2 border-red-600/40 text-red-600 font-bold text-sm tracking-wide text-center touch-manipulation active:bg-red-50 transition-colors bg-red-50/50 shadow-[0_0_20px_rgba(220,38,38,0.10)]"
        >
          شوێنەکەت پارێزبگرە
        </Link>
      </div>
    </div>
  );
}
