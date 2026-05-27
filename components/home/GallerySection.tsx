'use client';

import { useRef, useState, useCallback } from 'react';
import type { GalleryPhoto } from '@/lib/types';

export default function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardW = track.scrollWidth / photos.length;
    setActiveIdx(Math.min(photos.length - 1, Math.round(track.scrollLeft / cardW)));
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-20 overflow-hidden text-neutral-900">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(245,158,11,0.1)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 mb-8 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-px bg-amber-500/50" />
          <span className="text-amber-600/80 text-[0.6rem] tracking-[0.4em]">کارەکانمان</span>
        </div>
        <h2 className="font-display text-5xl font-bold text-neutral-900 leading-none">
          ئەمارەکانمان
        </h2>
        <p className="text-neutral-500 text-sm mt-2">بکێشە بۆ گەڕان ←</p>
      </div>

      {/* Carousel — kept ltr so scroll calculations stay predictable */}
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
                : 'w-[65vw] max-w-[270px] opacity-50 scale-[0.97]',
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
              <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/60 pointer-events-none" />
            )}
            {photo.caption && (
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-sm font-medium">{photo.caption}</p>
                <div className="w-8 h-px bg-amber-400 mt-1.5 mr-auto" />
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
                i === activeIdx ? 'w-6 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-neutral-300',
              ].join(' ')}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
