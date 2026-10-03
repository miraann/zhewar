'use client';

type Variant = 'filled' | 'tonal' | 'outlined' | 'error' | 'success';

const VARIANT_CLASSES: Record<Variant, string> = {
  filled:   'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-[0_10px_24px_-8px_rgb(79,70,229,0.55)]',
  tonal:    'bg-indigo-50 text-indigo-700 active:bg-indigo-100',
  outlined: 'border border-slate-200 text-slate-700 bg-white active:bg-slate-50',
  error:    'bg-rose-50 text-rose-600 active:bg-rose-100',
  success:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export default function Button({
  children, onClick, type = 'button', disabled, variant = 'filled', fullWidth = true, className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center gap-2 min-h-[48px] px-5 py-3.5 rounded-2xl font-bold text-sm tracking-wide touch-manipulation transition-all duration-200',
        disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
