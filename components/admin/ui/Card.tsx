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
        'rounded-3xl p-5 transition-colors duration-200',
        emphasized
          ? 'bg-indigo-50/60 border border-indigo-100'
          : 'bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
