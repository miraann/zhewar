'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

const SECTIONS = [
  { id: 'home',    label: 'سەرەتا'    },
  { id: 'gallery', label: 'گالری'     },
  { id: 'links',   label: 'بەستەرەکان' },
  { id: 'connect', label: 'پەیوەندی'  },
];

export default function ScrollNav({ profile }: { profile: BarberProfile }) {
  const [active, setActive]     = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const threshold = window.innerHeight * 0.4;
      for (const { id } of [...SECTIONS].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          setActive(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-neutral-950/90 backdrop-blur-md border-b border-white/8 shadow-[0_1px_20px_rgba(0,0,0,0.4)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">

        {/* Logo */}
        <button onClick={() => scrollTo('home')} className="flex items-center gap-2.5 touch-manipulation">
          <div className="w-8 h-8 rounded-full border border-amber-500/30 bg-amber-500/8 flex items-center justify-center">
            <span className="text-amber-400 text-sm">✂</span>
          </div>
          <span className="font-display text-base font-bold text-white tracking-wide">
            {profile.name}
          </span>
        </button>

        {/* Dots */}
        <nav className="hidden sm:flex items-center gap-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              title={label}
              className="px-3 py-1.5 rounded-full touch-manipulation"
            >
              <span
                className={[
                  'block rounded-full transition-all duration-300',
                  active === id
                    ? 'w-4 h-1.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'w-1.5 h-1.5 bg-white/20',
                ].join(' ')}
              />
            </button>
          ))}
        </nav>

        {/* Book CTA */}
        <Link
          href="/book"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/8 text-amber-400 text-xs font-semibold tracking-wide touch-manipulation active:bg-amber-500/15 transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          ناو تۆمار کردن
        </Link>
      </div>
    </header>
  );
}
