'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SocialLink } from '@/lib/types';
import { Share2 } from 'lucide-react';

const CARD_VW  = 78;
const GAP_VW   = 4;
const STEP_VW  = CARD_VW + GAP_VW;
const EDGE_VW  = (100 - CARD_VW) / 2;

export default function LinksSection({ links }: { links: SocialLink[] }) {
  const [idx, setIdx]     = useState(0);
  const idxRef            = useRef(0);
  const touchRef          = useRef({ startX: 0, startY: 0, axis: '' as 'h' | 'v' | '' });

  const go = useCallback((next: number) => {
    const n = (next + links.length) % links.length;
    idxRef.current = n;
    setIdx(n);
  }, [links.length]);

  // Auto-advance
  useEffect(() => {
    if (links.length < 2) return;
    const t = setInterval(() => go(idxRef.current + 1), 5000);
    return () => clearInterval(t);
  }, [links.length, go]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, axis: '' };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchRef.current.axis === 'v') return;
    const dx = Math.abs(e.touches[0].clientX - touchRef.current.startX);
    const dy = Math.abs(e.touches[0].clientY - touchRef.current.startY);
    if (touchRef.current.axis === '') {
      if (dx > dy && dx > 6) { touchRef.current.axis = 'h'; e.stopPropagation(); }
      else if (dy > dx && dy > 6) { touchRef.current.axis = 'v'; }
    } else if (touchRef.current.axis === 'h') {
      e.stopPropagation();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchRef.current.axis !== 'h') return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    if (Math.abs(dx) > 40) go(idxRef.current + (dx < 0 ? 1 : -1));
  };

  if (links.length === 0) return null;

  const colClass = links.length === 1 ? 'md:grid-cols-1' : links.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <div className="relative py-20 overflow-hidden w-full">
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
      <div className={`relative z-10 hidden md:grid gap-4 max-w-4xl mx-auto px-6 ${colClass}`}>
        {links.map((link, i) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-shadow duration-300 group border border-neutral-100" style={{ aspectRatio: '3/4' }}>
            {link.image_url ? (
              <img src={link.image_url} alt={link.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading={i < 3 ? 'eager' : 'lazy'} />
            ) : (
              <div className="w-full h-full bg-neutral-100 flex items-center justify-center"><Share2 className="w-14 h-14 text-neutral-300" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {link.title && (
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{link.title}</p>
                <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
              </div>
            )}
          </a>
        ))}
      </div>

      {/* Mobile carousel — transform-based, identical to GallerySection */}
      <div className="md:hidden">
        <div
          className="relative overflow-hidden w-full"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(calc(${EDGE_VW}vw - ${idx * STEP_VW}vw))`,
              transition: 'transform 450ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform',
            }}
          >
            {links.map((link, i) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-3xl overflow-hidden relative shadow-lg border border-neutral-100 flex-shrink-0 touch-manipulation"
                style={{
                  width: `${CARD_VW}vw`,
                  marginRight: `${GAP_VW}vw`,
                  aspectRatio: '3/4',
                  opacity: i === idx ? 1 : 0.4,
                  transform: i === idx ? 'scale(1)' : 'scale(0.97)',
                  transition: 'opacity 450ms ease, transform 450ms ease',
                }}
              >
                {link.image_url ? (
                  <img src={link.image_url} alt={link.title} className="w-full h-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
                ) : (
                  <div className="w-full h-full bg-neutral-100 flex items-center justify-center"><Share2 className="w-16 h-16 text-neutral-300" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {i === idx && <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/60 pointer-events-none" />}
                {link.title && (
                  <div className="absolute bottom-4 right-4 left-4 text-right">
                    <p className="text-white text-sm font-medium">{link.title}</p>
                    <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6" dir="ltr">
          {links.map((_, i) => (
            <button key={i} onClick={() => go(i)} className="touch-manipulation p-1">
              <span className={['block rounded-full transition-all duration-300', i === idx ? 'w-6 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-neutral-300'].join(' ')} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
