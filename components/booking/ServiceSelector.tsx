'use client';

import { useState } from 'react';
import { Scissors, Clock, ChevronLeft, Sparkles, Wind, Star } from 'lucide-react';
import type { Customer, Service } from '@/lib/types';

const ICONS = [Scissors, Wind, Star, Sparkles, Scissors];

interface Props {
  services: Service[];
  selected: Service | null;
  customer: Customer | null;
  onSelect: (service: Service) => void;
}

export default function ServiceSelector({ services, selected, customer, onSelect }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const firstName = customer?.full_name.split(' ')[0];

  return (
    <div className="flex flex-col min-h-[calc(100vh-1px)]">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <p className="text-amber-500/75 text-xs tracking-[0.35em] mb-2">
          {firstName ? `مەرحەبا، ${firstName}` : 'هەنگاوی ١ لە ٣'}
        </p>
        <h2 className="text-[1.75rem] font-light tracking-wide text-white leading-tight">
          خزمەتگوزاریەکەت<br />
          <span className="text-amber-400">هەڵبژێرە</span>
        </h2>
        <p className="text-neutral-500 text-sm mt-2">چاکسازییەک هەڵبژێرە بۆ دەستپێکردنی کاتی سەردانیکردنەکەت</p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-4 pb-12 space-y-3">
        {services.map((svc, i) => {
          const Icon     = ICONS[i % ICONS.length];
          const isActive = active === svc.id || selected?.id === svc.id;

          return (
            <button
              key={svc.id}
              onClick={() => onSelect(svc)}
              onPointerDown={() => setActive(svc.id)}
              onPointerUp={() => setActive(null)}
              onPointerLeave={() => setActive(null)}
              className={[
                'w-full text-right rounded-2xl border transition-all duration-250 overflow-hidden',
                'active:scale-[0.985] touch-manipulation',
                isActive
                  ? 'border-amber-500/60 bg-white/[0.07] shadow-[0_0_28px_rgba(245,158,11,0.13)]'
                  : 'border-white/[0.07] bg-white/[0.03]',
              ].join(' ')}
            >
              {isActive && <div className="h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />}

              <div className="p-5 flex items-center gap-4">
                {/* Price + arrow (now on the left for RTL = leading side) */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <ChevronLeft
                    className={[
                      'w-4 h-4 transition-all duration-250',
                      isActive ? 'text-amber-500 -translate-x-0.5' : 'text-neutral-700',
                    ].join(' ')}
                  />
                  <span className={`text-[1.15rem] font-semibold transition-colors duration-250 ${isActive ? 'text-amber-400' : 'text-neutral-300'}`}>
                    ${svc.price}
                  </span>
                </div>

                {/* Name + duration */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-[0.95rem] truncate transition-colors duration-250 ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                    {svc.name}
                  </h3>
                  <span className="flex items-center gap-1.5 mt-0.5 text-neutral-500 text-xs justify-end">
                    {svc.duration} خ
                    <Clock className="w-3 h-3" />
                  </span>
                </div>

                {/* Icon pill */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-250 ${isActive ? 'bg-amber-500/20' : 'bg-white/[0.05]'}`}>
                  <Icon className={`w-5 h-5 transition-colors duration-250 ${isActive ? 'text-amber-400' : 'text-neutral-500'}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-neutral-700 text-xs pb-8 px-4">
        دراو لە بەربەرخانە وەردەگیرێت · کارتی پێویست نییە
      </p>
    </div>
  );
}
