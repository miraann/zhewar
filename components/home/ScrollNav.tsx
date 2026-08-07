'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BarberProfile } from '@/lib/types';
import PWAInstallButton from '@/components/PWAInstallButton';

const SECTIONS = [
  { id: 'home',    label: 'سەرەتا'     },
  { id: 'gallery', label: 'گالری'      },
  { id: 'links',   label: 'بەستەرەکان' },
  { id: 'connect', label: 'پەیوەندی'   },
];

const POLE_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #ef4444, #ef4444 20px, #ffffff 20px, #ffffff 40px, #3b82f6 40px, #3b82f6 60px, #ffffff 60px, #ffffff 80px)',
  backgroundSize: '113px 100%',
  animation: 'poleSlide 2.4s linear infinite',
};

export default function ScrollNav({ profile }: { profile: BarberProfile }) {
  const [active, setActive] = useState('home');

  // Header is transparent only on the first section
  const scrolled = active !== 'home';

  useEffect(() => {
    // Use the snap container as the IntersectionObserver root so intersection
    // is computed relative to the scrollable viewport, not the document.
    const root = document.getElementById('snap-root');
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      {
        root,
        // A section is "active" when at least 50 % of it is in view.
        threshold: 0.5,
      },
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // scrollIntoView walks up to the nearest scrollable ancestor (snap-root),
  // so this works without any extra ref passing.
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-neutral-200 shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <style>{`@keyframes poleSlide { from { background-position: 0 0; } to { background-position: 113px 0; } }`}</style>

      {/* Barber pole strip — always visible at top of header */}
      <div className="h-2.5 w-full" style={POLE_STYLE} />

      <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">

        {/* Logo */}
        <button
          onClick={() => scrollTo('home')}
          className="flex items-center gap-2.5 touch-manipulation"
        >
          <div
            className="w-8 h-8 rounded-full p-[2px] flex-shrink-0"
            style={{
              background:
                'conic-gradient(#ef4444 0deg, #ef4444 120deg, #f8fafc 145deg, #3b82f6 170deg, #3b82f6 300deg, #f8fafc 325deg, #ef4444 360deg)',
            }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-blue-600 text-xs">✂</span>
            </div>
          </div>
          <span className="font-display text-base font-bold text-neutral-900 tracking-wide">
            {profile.name}
          </span>
        </button>

        {/* Section indicator dots */}
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
                    ? 'w-4 h-1.5 bg-blue-600'
                    : 'w-1.5 h-1.5 bg-neutral-300',
                ].join(' ')}
              />
            </button>
          ))}
        </nav>

        {/* Install CTA */}
        <PWAInstallButton
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white bg-blue-600 active:bg-blue-700 active:scale-[0.97] transition-all touch-manipulation shadow-sm"
          iconSize="w-4 h-4"
        />
      </div>
    </header>
  );
}
