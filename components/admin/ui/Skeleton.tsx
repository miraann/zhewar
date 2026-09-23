'use client';

type Variant = 'card' | 'row' | 'circle' | 'text';

const VARIANT_CLASSES: Record<Variant, string> = {
  card:   'h-16 rounded-md-lg',
  row:    'h-12 rounded-md-sm',
  circle: 'rounded-full',
  text:   'h-5 rounded-md-sm',
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
            'bg-md-surface-container-high border border-md-outline-variant animate-pulse',
            VARIANT_CLASSES[variant],
            className,
          ].join(' ')}
        />
      ))}
    </div>
  );
}
