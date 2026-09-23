'use client';

export default function Card({
  children, emphasized, className = '',
}: {
  children: React.ReactNode;
  emphasized?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-md-lg p-4 transition-colors duration-200',
        emphasized
          ? 'bg-md-primary-container/40 border border-md-primary-container'
          : 'bg-md-surface-container border border-md-outline-variant shadow-md-1',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
