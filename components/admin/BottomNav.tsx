'use client';

export default function BottomNav<T extends string>({
  tabs, active, badges, onSelect,
}: {
  tabs: { id: T; short: string; icon: React.ElementType }[];
  active: T;
  badges?: Partial<Record<T, number>>;
  onSelect: (id: T) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-md-surface-container-high border-t border-md-outline-variant safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch justify-around px-1 pt-1.5">
        {tabs.map(({ id, short, icon: Icon }) => {
          const isActive = active === id;
          const badge    = badges?.[id] ?? 0;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] touch-manipulation select-none active:scale-95 transition-transform duration-150"
            >
              <span
                className={[
                  'relative w-16 h-8 rounded-md-full flex items-center justify-center transition-colors duration-200',
                  isActive ? 'bg-md-primary-container' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-md-on-primary-container' : 'text-md-on-surface-variant'}`} />
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -start-1.5 min-w-[15px] h-[15px] rounded-full bg-md-error text-md-on-error flex items-center justify-center leading-none font-bold px-[3px]"
                    style={{ fontSize: '9px' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span
                className={[
                  'leading-none transition-colors duration-200 text-[10px]',
                  isActive ? 'font-bold text-md-on-primary-container' : 'font-medium text-md-on-surface-variant',
                ].join(' ')}
              >
                {short}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
