'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { GalleryPhoto } from '@/lib/types';

export default function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const trackRef    = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardW = track.scrollWidth / photos.length;
    const idx = Math.min(photos.length - 1, Math.round(track.scrollLeft / cardW));
    activeIdxRef.current = idx;
    setActiveIdx(idx);
  }, [photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      const next = (activeIdxRef.current + 1) % photos.length;
      activeIdxRef.current = next;
      setActiveIdx(next);
      setTimeout(() => {
        const track = trackRef.current;
        if (!track) return;
        const el = track.children[next] as HTMLElement;
        if (!el) return;
        track.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2, behavior: 'smooth' });
      }, 50);
    }, 5000);
    return () => clearInterval(timer);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="relative py-20 overflow-hidden text-neutral-900">
      <div className="absolute inset-0 bg-white" />
      {/* Barber stripe divider */}
      <div className="absolute top-0 inset-x-0 h-1" style={{ background: 'repeating-linear-gradient(-45deg,#DC2626 0px,#DC2626 4px,#FFFFFF 4px,#FFFFFF 8px,#2563EB 8px,#2563EB 12px,#FFFFFF 12px,#FFFFFF 16px)' }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(220,38,38,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 mb-10 max-w-4xl mx-auto w-full text-center md:text-right">
        <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
          <span className="text-red-600 text-[0.6rem] tracking-[0.4em]">کارەکانمان</span>
          <div className="w-8 h-px bg-red-600/40" />
        </div>
        <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none">
          ئەمارەکانمان
        </h2>
        <p className="text-neutral-500 text-sm mt-2 md:hidden">بکێشە بۆ گەڕان ←</p>
      </div>

      {/* Desktop grid */}
      <div className="relative z-10 hidden md:grid md:grid-cols-3 gap-4 max-w-4xl mx-auto px-6">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-shadow duration-300 group"
            style={{ aspectRatio: '3/4' }}
          >
            <img
              src={photo.photo_url}
              alt={photo.caption ?? `وێنە ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading={i < 3 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-white/70 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
            </div>
            {photo.caption && (
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{photo.caption}</p>
                <div className="w-8 h-px bg-red-500 mt-1.5 mr-auto" />
              </div>
            )}
          </div>
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
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className={[
                'flex-shrink-0 snap-center rounded-3xl overflow-hidden relative transition-all duration-300 shadow-lg',
                i === activeIdx
                  ? 'w-[78vw] max-w-[320px] opacity-100'
                  : 'w-[65vw] max-w-[270px] opacity-40 scale-[0.97]',
              ].join(' ')}
              style={{ aspectRatio: '3/4' }}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption ?? `وێنە ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i < 2 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {i === activeIdx && (
                <div className="absolute inset-0 rounded-3xl border-2 border-red-500/50 pointer-events-none" />
              )}
              {photo.caption && (
                <div className="absolute bottom-4 right-4 left-4 text-right">
                  <p className="text-white text-sm font-medium">{photo.caption}</p>
                  <div className="w-8 h-px bg-red-500 mt-1.5 mr-auto" />
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
                <span className="text-white/70 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6" dir="ltr">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const track = trackRef.current;
                if (!track) return;
                const cardW = track.scrollWidth / photos.length;
                track.scrollTo({ left: cardW * i, behavior: 'smooth' });
              }}
              className="touch-manipulation"
            >
              <span
                className={[
                  'block rounded-full transition-all duration-300',
                  i === activeIdx ? 'w-6 h-1.5 bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.7)]' : 'w-1.5 h-1.5 bg-neutral-300',
                ].join(' ')}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
