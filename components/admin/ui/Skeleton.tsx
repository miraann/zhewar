'use client';

type Variant = 'card' | 'row' | 'circle' | 'text';

const VARIANT_CLASSES: Record<Variant, string> = {
  card:   'h-16 rounded-3xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
  row:    'h-12 rounded-2xl bg-slate-100/80',
  circle: 'rounded-full bg-slate-100',
  text:   'h-5 rounded-xl bg-slate-100',
};

export default function Skeleton({
  variant = 'card', count = 1, className = '',
}: {
  variant?: Variant;
  count?: number;
  className?: string;
}) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={[
            'animate-pulse',
            VARIANT_CLASSES[variant],
            className,
          ].join(' ')}
        />
      ))}
    </div>
  );
}
