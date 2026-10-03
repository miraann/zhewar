'use client';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-500 text-[0.7rem] tracking-wide font-bold">{children}</p>;
}

export default function TextField({
  icon: Icon, iconColor = 'text-slate-400', label, value, onChange, placeholder,
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
      {label && <p className="text-slate-700 text-xs font-bold mb-2">{label}</p>}
      <div className="relative">
        {Icon && (
          <Icon className={`absolute start-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${iconColor} pointer-events-none`} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          className={[
            'admin-input',
            Icon ? 'ps-11' : '',
            trailing ? 'pe-12' : '',
          ].join(' ')}
        />
        {trailing}
      </div>
    </div>
  );
}
