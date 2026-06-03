'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { SocialLink } from '@/lib/types';
import { Share2 } from 'lucide-react';

export default function LinksSection({ links }: { links: SocialLink[] }) {
  const trackRef     = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);

  function scrollTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const el = track.children[i] as HTMLElement | undefined;
    if (!el) return;
    track.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2, behavior: 'smooth' });
  }

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const visCenter = track.scrollLeft + track.clientWidth / 2;
    const items = Array.from(track.children) as HTMLElement[];
    let closest = 0, minDist = Infinity;
    items.forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - visCenter);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    activeIdxRef.current = closest;
    setActiveIdx(closest);
  }, []);

  /* ── Auto-advance every 5 s ── */
  useEffect(() => {
    if (links.length < 2) return;
    const timer = setInterval(() => {
      const next = (activeIdxRef.current + 1) % links.length;
      activeIdxRef.current = next;
      setActiveIdx(next);
      setTimeout(() => scrollTo(next), 50);
    }, 5000);
    return () => clearInterval(timer);
  }, [links.length]);

  if (links.length === 0) return null;

  return (
    <div className="relative py-20 overflow-hidden text-neutral-900">
      <div className="absolute inset-0 bg-neutral-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(245,158,11,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative z-10 px-6 mb-10 max-w-4xl mx-auto w-full text-center md:text-right">
        <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
          <span className="text-amber-500/80 text-[0.6rem] tracking-[0.4em]">پەیوەندیمان پێوە بکە</span>
          <div className="w-8 h-px bg-amber-500/50" />
        </div>
        <h2 className="font-display text-5xl font-bold text-white leading-none">
          سۆشیاڵ میدیا
        </h2>
      </div>

      {/* ── Desktop grid ── */}
      <div className="relative z-10 hidden md:grid md:grid-cols-3 gap-4 max-w-4xl mx-auto px-6">
        {links.map((link, i) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-shadow duration-300 group"
            style={{ aspectRatio: '3/4' }}
          >
            {link.image_url ? (
              <img
                src={link.image_url}
                alt={link.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading={i < 3 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                <Share2 className="w-14 h-14 text-neutral-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 rounded-3xl border border-white/5 group-hover:border-amber-400/40 transition-colors pointer-events-none" />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-white/70 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="absolute bottom-4 right-4 left-4 text-right">
              <p className="text-white text-sm font-medium">{link.title}</p>
              <div className="w-8 h-px bg-amber-400 mt-1.5 mr-auto" />
            </div>
          </a>
        ))}
      </div>

      {/* ── Mobile carousel ── */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          dir="ltr"
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pl-6 pr-6"
        >
          {links.map((link, i) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                'flex-shrink-0 snap-center rounded-3xl overflow-hidden relative transition-all duration-300 shadow-lg touch-manipulation',
                i === activeIdx
                  ? 'w-[78vw] max-w-[320px] opacity-100'
                  : 'w-[65vw] max-w-[270px] opacity-40 scale-[0.97]',
              ].join(' ')}
              style={{ aspectRatio: '3/4' }}
            >
              {link.image_url ? (
                <img
                  src={link.image_url}
                  alt={link.title}
                  className="w-full h-full object-cover"
                  loading={i < 2 ? 'eager' : 'lazy'}
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <Share2 className="w-16 h-16 text-neutral-600" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {i === activeIdx && (
                <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/60 pointer-events-none" />
              )}

              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
                <span className="text-white/70 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
              </div>

              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{link.title}</p>
                <div className="w-8 h-px bg-amber-400 mt-1.5 mr-auto" />
              </div>
            </a>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6" dir="ltr">
          {links.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className="touch-manipulation"
            >
              <span
                className={[
                  'block rounded-full transition-all duration-300',
                  i === activeIdx ? 'w-6 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-white/30',
                ].join(' ')}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
