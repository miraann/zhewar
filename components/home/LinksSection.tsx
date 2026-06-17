'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { SocialLink } from '@/lib/types';
import { Share2 } from 'lucide-react';

export default function LinksSection({ links }: { links: SocialLink[] }) {
  const trackRef      = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef  = useRef(0);

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
    <div className="relative py-20 overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Header */}
      <div className="relative z-10 px-6 mb-10 max-w-4xl mx-auto w-full text-center md:text-right">
        <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
          <span className="text-neutral-400 text-[0.6rem] tracking-[0.4em]">پۆستەکانی</span>
          <div className="w-8 h-px bg-neutral-300" />
        </div>
        <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none">
          سۆشیاڵ میدیا
        </h2>
      </div>

      {/* Desktop grid */}
      <div className="relative z-10 hidden md:grid md:grid-cols-3 gap-4 max-w-4xl mx-auto px-6">
        {links.map((link, i) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl overflow-hidden relative shadow-sm hover:shadow-lg transition-shadow duration-300 group border border-neutral-100"
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
              <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                <Share2 className="w-14 h-14 text-neutral-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 rounded-3xl border border-white/0 group-hover:border-blue-400/40 transition-colors pointer-events-none" />
            <div className="absolute bottom-4 right-4 left-4 text-right">
              <p className="text-white text-sm font-medium">{link.title}</p>
              <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
            </div>
          </a>
        ))}
      </div>

      {/* Mobile carousel */}
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
                'flex-shrink-0 snap-center rounded-3xl overflow-hidden relative transition-all duration-300 shadow-md touch-manipulation border border-neutral-100',
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
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                  <Share2 className="w-16 h-16 text-neutral-300" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {i === activeIdx && (
                <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/60 pointer-events-none" />
              )}

              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{link.title}</p>
                <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
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
                  i === activeIdx ? 'w-6 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-neutral-300',
                ].join(' ')}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
