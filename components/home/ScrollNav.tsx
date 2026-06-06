'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, CalendarPlus } from 'lucide-react';
import type { BarberProfile } from '@/lib/types';

const SECTIONS = [
  { id: 'home',    label: 'سەرەتا'   },
  { id: 'about',   label: 'دەربارە'  },
  { id: 'gallery', label: 'گالری'    },
  { id: 'links',   label: 'بەستەرەکان' },
  { id: 'connect', label: 'پەیوەندی' },
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
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">

        {/* Logo — chrome circle */}
        <button onClick={() => scrollTo('home')} className="flex items-center gap-2.5 touch-manipulation">
          <div className="w-8 h-8 rounded-full border border-gray-300 bg-gradient-to-b from-gray-100 to-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
            <Scissors className="w-3.5 h-3.5 text-red-600" />
          </div>
          <span className="font-display text-base font-bold text-neutral-900 tracking-wide">
            {profile.name}
          </span>
        </button>

        {/* Dots — red active */}
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
                  active === id ? 'w-4 h-1.5 bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.7)]' : 'w-1.5 h-1.5 bg-neutral-400/40',
                ].join(' ')}
              />
            </button>
          ))}
        </nav>

        {/* Book CTA */}
        <Link
          href="/book"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-600/50 bg-red-50 text-red-600 text-xs font-semibold tracking-wide touch-manipulation active:bg-red-100 transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          ناو تۆمار کردن
        </Link>
      </div>
    </header>
  );
}
