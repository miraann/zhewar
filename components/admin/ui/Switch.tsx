'use client';

// iOS-style switch. The knob slides along inset-inline-start, so "on" sits at
// the inline end in both LTR and the admin's RTL.
export default function Switch({
  checked, onChange, disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative w-12 h-7 rounded-full flex-shrink-0 touch-manipulation transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20',
        checked ? 'bg-indigo-600' : 'bg-slate-200',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0,0,0,0.18)]',
          'transition-[inset-inline-start] duration-300 ease-[cubic-bezier(.34,1.4,.64,1)]',
          checked ? 'start-[22px]' : 'start-0.5',
        ].join(' ')}
      />
    </button>
  );
}
