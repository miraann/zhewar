'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { GalleryPhoto } from '@/lib/types';

export default function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const trackRef     = useRef<HTMLDivElement>(null);
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
    <div className="relative py-20 overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Header */}
      <div className="relative z-10 px-6 mb-10 max-w-4xl mx-auto w-full text-center md:text-right">
        <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
          <span className="text-neutral-400 text-[0.6rem] tracking-[0.4em]">کارەکانمان</span>
          <div className="w-8 h-px bg-neutral-300" />
        </div>
        <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none">
          
        </h2>
        <p className="text-neutral-400 text-sm mt-2 md:hidden">بکێشە بۆ گەڕان ←</p>
      </div>

      {/* Desktop grid */}
      <div className="relative z-10 hidden md:grid md:grid-cols-3 gap-4 max-w-4xl mx-auto px-6">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-shadow duration-300 group border border-neutral-100"
            style={{ aspectRatio: '3/4' }}
          >
            <img
              src={photo.photo_url}
              alt={photo.caption ?? `وێنە ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading={i < 3 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {photo.caption && (
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{photo.caption}</p>
                <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
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
                'flex-shrink-0 snap-center rounded-3xl overflow-hidden relative transition-all duration-300 shadow-lg border border-neutral-100',
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {i === activeIdx && (
                <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/60 pointer-events-none" />
              )}
              {photo.caption && (
                <div className="absolute bottom-4 right-4 left-4 text-right">
                  <p className="text-white text-sm font-medium">{photo.caption}</p>
                  <div className="w-8 h-px bg-blue-400 mt-1.5 mr-auto" />
                </div>
              )}
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
