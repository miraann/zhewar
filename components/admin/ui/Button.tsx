'use client';

type Variant = 'filled' | 'tonal' | 'outlined' | 'error' | 'success';

const VARIANT_CLASSES: Record<Variant, string> = {
  filled:   'bg-md-primary text-md-on-primary shadow-md-1 active:bg-md-primary/90',
  tonal:    'bg-md-secondary-container text-md-on-secondary-container active:bg-md-secondary-container/80',
  outlined: 'border border-md-outline text-md-on-surface bg-transparent active:bg-md-surface-container-high',
  error:    'bg-md-error-container text-md-on-error-container active:bg-md-error-container/80',
  success:  'bg-md-success-container text-md-on-success-container border-2 border-md-success/30',
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
        'flex items-center justify-center gap-2 py-4 rounded-md-full font-semibold text-sm tracking-wide transition-all touch-manipulation active:scale-[0.98]',
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-60 cursor-not-allowed' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
