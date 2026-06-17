import type { BarberProfile } from '@/lib/types';
import { CalendarPlus, ExternalLink, Facebook, Instagram, MapPin, MessageCircle, Music2 } from 'lucide-react';
import Link from 'next/link';

interface SocialItem {
  key: keyof BarberProfile;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  activeShadow: string;
}

const ITEMS: SocialItem[] = [
  {
    key: 'instagram_url',
    label: 'ئینستاگرام',
    icon: Instagram,
    iconBg: 'linear-gradient(135deg, #f472b6, #a855f7)',
    iconColor: '#ffffff',
    borderColor: '#f9a8d4',
    activeShadow: '0 4px 20px rgba(244,114,182,0.18)',
  },
  {
    key: 'facebook_url',
    label: 'فەیسبووک',
    icon: Facebook,
    iconBg: '#1877f2',
    iconColor: '#ffffff',
    borderColor: '#bfdbfe',
    activeShadow: '0 4px 20px rgba(24,119,242,0.15)',
  },
  {
    key: 'whatsapp_number',
    label: 'واتسئاپ',
    icon: MessageCircle,
    iconBg: '#25d366',
    iconColor: '#ffffff',
    borderColor: '#bbf7d0',
    activeShadow: '0 4px 20px rgba(37,211,102,0.15)',
  },
  {
    key: 'tiktok_url',
    label: 'تیکتۆک',
    icon: Music2,
    iconBg: '#111827',
    iconColor: '#ffffff',
    borderColor: '#e5e7eb',
    activeShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  {
    key: 'maps_url',
    label: 'شوێنی ئێمە',
    icon: MapPin,
    iconBg: '#ef4444',
    iconColor: '#ffffff',
    borderColor: '#fecaca',
    activeShadow: '0 4px 20px rgba(239,68,68,0.15)',
  },
];

export default function SocialSection({ profile }: { profile: BarberProfile }) {
  return (
    <div className="relative pt-20 pb-8 px-5 overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-8">

        {/* Header */}
        <div className="text-right">
          <div className="flex items-center gap-3 mb-3 justify-end">
            <div className="w-8 h-px bg-neutral-300" />
            <span className="text-neutral-400 text-[0.6rem] tracking-[0.4em] font-medium">تۆڕی کۆمەڵایەتی</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-neutral-900 leading-tight">
            پەیوەندی{' '}
            <span className="text-blue-600">بکە</span>
          </h2>
        </div>

        {/* Brand-colored social link cards */}
        <div className="space-y-3">
          {ITEMS.map(({ key, label, icon: Icon, iconBg, iconColor, borderColor, activeShadow }) => {
            const value    = profile[key] as string | null;
            if (!value) return null;
            const url = key === 'whatsapp_number'
              ? `https://wa.me/${value.replace(/\D/g, '')}`
              : value;

            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border transition-all duration-200 touch-manipulation active:scale-[0.98] cursor-pointer"
                style={{ borderColor, boxShadow: activeShadow }}
              >
                {/* Brand icon box */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: iconBg }}
                >
                  <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-neutral-900 font-bold text-base">{label}</p>
                  <p className="text-neutral-400 text-xs mt-0.5 truncate">
                    {key === 'maps_url'
                      ? 'گوگڵ مەپس — گرتە بکە بۆ نەخشە'
                      : (value.startsWith('http') ? value.replace(/https?:\/\/(www\.)?/, '') : value)}
                  </p>
                </div>

                <ExternalLink className="w-4 h-4 text-neutral-300 flex-shrink-0" />
              </a>
            );
          })}
        </div>

        {/* Final CTA */}
        <div className="pt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-4" />
          <Link
            href="/book"
            className="flex items-center justify-center gap-2.5 w-full py-5 rounded-2xl font-bold text-base text-white bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation shadow-md shadow-blue-200/70"
          >
            <CalendarPlus className="w-5 h-5" />
            <span>ناو تۆمار کردن</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
