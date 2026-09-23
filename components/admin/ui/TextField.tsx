'use client';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-md-on-surface-variant text-[0.65rem] tracking-wider font-semibold">{children}</p>;
}

export default function TextField({
  icon: Icon, iconColor = 'text-md-on-surface-variant', label, value, onChange, placeholder,
  type = 'text', dir, trailing, disabled,
}: {
  icon?: React.ElementType;
  iconColor?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: 'ltr' | 'rtl';
  trailing?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      {label && <p className="text-md-on-surface text-xs font-medium mb-1.5">{label}</p>}
      <div className="relative">
        {Icon && (
          <Icon className={`absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor} pointer-events-none`} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          className={[
            'w-full h-12 bg-md-surface border border-md-outline rounded-md-sm text-md-on-surface text-sm placeholder-md-on-surface-variant/60 outline-none focus:border-md-primary focus:border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            Icon ? 'ps-10 pe-4' : 'px-4',
            trailing ? 'pe-12' : '',
          ].join(' ')}
        />
        {trailing}
      </div>
    </div>
  );
}
