import type { BarberProfile } from '@/lib/types';
import { CalendarPlus, ExternalLink, Facebook, Instagram, MapPin, MessageCircle, Music2 } from 'lucide-react';
import Link from 'next/link';

interface SocialItem {
  key: keyof BarberProfile;
  label: string;
  icon: React.ElementType;
  accent: string;
  glowColor: string;
}

const ITEMS: SocialItem[] = [
  {
    key: 'instagram_url',
    label: 'ئینستاگرام',
    icon: Instagram,
    accent: 'from-pink-500/20 to-purple-500/20 border-pink-500/20 text-pink-400',
    glowColor: 'rgba(236,72,153,0.15)',
  },
  {
    key: 'facebook_url',
    label: 'فەیسبووک',
    icon: Facebook,
    accent: 'from-blue-500/20 to-blue-600/20 border-blue-500/20 text-blue-400',
    glowColor: 'rgba(59,130,246,0.15)',
  },
  {
    key: 'whatsapp_number',
    label: 'واتسئاپ',
    icon: MessageCircle,
    accent: 'from-emerald-500/20 to-green-500/20 border-emerald-500/20 text-emerald-400',
    glowColor: 'rgba(34,197,94,0.15)',
  },
  {
    key: 'tiktok_url',
    label: 'تیکتۆک',
    icon: Music2,
    accent: 'from-white/10 to-white/5 border-white/10 text-white/60',
    glowColor: 'rgba(255,255,255,0.05)',
  },
  {
    key: 'maps_url',
    label: 'شوێنی ئێمە',
    icon: MapPin,
    accent: 'from-red-500/20 to-orange-500/20 border-red-500/20 text-red-400',
    glowColor: 'rgba(239,68,68,0.15)',
  },
];

export default function SocialSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center px-5 py-24 overflow-hidden bg-neutral-950">
      {/* Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(245,158,11,0.06),transparent_70%)] pointer-events-none" />

      {/* Subtle top stripe */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3 justify-end">
            <div className="w-8 h-px bg-amber-500/40" />
            <span className="text-amber-500/60 text-[0.6rem] tracking-[0.4em] font-medium">تۆڕی کۆمەڵایەتی</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-white text-right leading-tight">
            پەیوەندی
            <span className="text-amber-500"> بکە</span>
          </h2>
        </div>

        {/* Social rows */}
        <div className="space-y-3">
          {ITEMS.map(({ key, label, icon: Icon, accent, glowColor }) => {
            const value    = profile[key] as string | null;
            const isActive = Boolean(value);
            const url      = value
              ? key === 'whatsapp_number'
                ? `https://wa.me/${value.replace(/\D/g, '')}`
                : value
              : '#';

            return (
              <a
                key={key}
                href={isActive ? url : undefined}
                target={isActive ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={[
                  'flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-l backdrop-blur-sm transition-all duration-200 touch-manipulation',
                  accent,
                  isActive
                    ? 'active:scale-[0.98] cursor-pointer'
                    : 'opacity-25 cursor-default',
                ].join(' ')}
                style={isActive ? { boxShadow: `0 4px 24px ${glowColor}` } : undefined}
              >
                <div className="w-11 h-11 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-bold text-base">{label}</p>
                  <p className="text-white/35 text-xs mt-0.5 truncate">
                    {isActive
                      ? key === 'maps_url'
                        ? 'گوگڵ مەپس — گرتە بکە بۆ نەخشە'
                        : (value!.startsWith('http') ? value!.replace(/https?:\/\/(www\.)?/, '') : value)
                      : 'دانەنراوە'}
                  </p>
                </div>
                {isActive && <ExternalLink className="w-4 h-4 text-white/25 flex-shrink-0" />}
              </a>
            );
          })}
        </div>

        {/* Final CTA */}
        <div className="pt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent mb-8" />
          <Link
            href="/book"
            className="relative flex items-center justify-center gap-2.5 w-full py-5 rounded-2xl font-bold text-base tracking-wide overflow-hidden touch-manipulation active:scale-[0.98] transition-transform bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_50px_rgba(245,158,11,0.25),0_4px_20px_rgba(245,158,11,0.15)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            <CalendarPlus className="relative w-5 h-5" />
            <span className="relative">ناو تۆمار کردن</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
