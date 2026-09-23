'use client';

import { Check } from 'lucide-react';

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
        'relative w-[52px] h-8 rounded-md-full transition-colors duration-200 touch-manipulation flex-shrink-0',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        checked ? 'bg-md-primary' : 'bg-md-surface-container-highest border-2 border-md-outline',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-200 flex items-center justify-center',
          checked ? 'end-1 w-6 h-6 bg-md-on-primary' : 'start-1.5 w-4 h-4 bg-md-outline',
        ].join(' ')}
      >
        {checked && <Check className="w-3.5 h-3.5 text-md-primary" strokeWidth={3} />}
      </span>
    </button>
  );
}
