import type { BarberProfile } from '@/lib/types';
import { ExternalLink, Instagram, Facebook, MessageCircle, Music2, CalendarPlus, MapPin } from 'lucide-react';
import Link from 'next/link';

interface SocialCard {
  key: keyof BarberProfile;
  platform: string;
  icon: React.ElementType;
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  glow: string;
}

const CARDS: SocialCard[] = [
  {
    key: 'instagram_url',
    platform: 'ئینستاگرام',
    icon: Instagram,
    gradient: 'from-pink-50 via-purple-50/70 to-orange-50/70',
    border: 'border-pink-300/60',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    glow: 'shadow-[0_4px_20px_rgba(236,72,153,0.15)]',
  },
  {
    key: 'facebook_url',
    platform: 'فەیسبووک',
    icon: Facebook,
    gradient: 'from-blue-50 to-blue-50/70',
    border: 'border-blue-300/60',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    glow: 'shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
  },
  {
    key: 'whatsapp_number',
    platform: 'واتسئاپ',
    icon: MessageCircle,
    gradient: 'from-green-50 to-emerald-50/70',
    border: 'border-green-300/60',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    glow: 'shadow-[0_4px_20px_rgba(34,197,94,0.15)]',
  },
  {
    key: 'tiktok_url',
    platform: 'تیکتۆک',
    icon: Music2,
    gradient: 'from-neutral-100 to-stone-50',
    border: 'border-neutral-300/60',
    iconBg: 'bg-neutral-200',
    iconColor: 'text-neutral-700',
    glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
  },
  {
    key: 'maps_url',
    platform: 'شوێنی ئێمە',
    icon: MapPin,
    gradient: 'from-red-50 to-orange-50/70',
    border: 'border-red-300/60',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    glow: 'shadow-[0_4px_20px_rgba(239,68,68,0.15)]',
  },
];

export default function SocialSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center px-5 py-24 overflow-hidden text-neutral-900">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(245,158,11,0.18)_0%,transparent_68%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-[2px] bg-gradient-to-l from-amber-500 to-transparent rounded-full" />
          <span className="text-amber-600 text-[0.65rem] tracking-[0.4em] font-medium">تۆڕی کۆمەڵایەتی</span>
        </div>

        {/* Social cards */}
        <div className="space-y-3">
          {CARDS.map(({ key, platform, icon: Icon, gradient, border, iconBg, iconColor, glow }) => {
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
                  'flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 touch-manipulation',
                  `bg-gradient-to-l ${gradient}`,
                  border,
                  isActive ? `active:scale-[0.98] cursor-pointer ${glow}` : 'opacity-35 cursor-default',
                ].join(' ')}
              >
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-900 font-bold text-base">{platform}</p>
                  <p className="text-neutral-500 text-xs mt-0.5 truncate">
                    {isActive
                      ? key === 'maps_url'
                        ? 'گوگڵ مەپس — کرتە بکە بۆ نەقشە'
                        : (value!.startsWith('http') ? value!.replace(/https?:\/\/(www\.)?/, '') : value)
                      : 'دانەنراوە'}
                  </p>
                </div>
                {isActive && <ExternalLink className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
              </a>
            );
          })}
        </div>

        {/* Final CTA */}
        <div className="pt-4">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mb-8 rounded-full" />
          <Link
            href="/book"
            className="relative flex items-center justify-center gap-2.5 w-full py-5 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-base tracking-wide shadow-[0_0_50px_rgba(245,158,11,0.55),0_4px_20px_rgba(245,158,11,0.4)] overflow-hidden touch-manipulation active:scale-[0.98] transition-transform"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            <CalendarPlus className="relative w-5 h-5" />
            <span className="relative">دیاریکردنی کاتی سەردانیکردن</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
