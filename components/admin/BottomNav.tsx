'use client';

// Floating native tab bar, detached from the screen edge. The active tab grows
// into an indigo pill that shows its label; the rest stay icon-only so all
// seven tabs fit on a narrow phone. z-40 keeps the bottom sheets (z-50) above it.
export default function BottomNav<T extends string>({
  tabs, active, badges, onSelect,
}: {
  tabs: { id: T; short: string; icon: React.ElementType }[];
  active: T;
  badges?: Partial<Record<T, number>>;
  onSelect: (id: T) => void;
}) {
  return (
    <nav
      className="fixed inset-x-4 z-40 mx-auto max-w-[480px] rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.08)]"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center gap-0.5 p-1.5">
        {tabs.map(({ id, short, icon: Icon }) => {
          const isActive = active === id;
          const badge    = badges?.[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={short}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative h-12 flex items-center justify-center gap-1.5 rounded-full touch-manipulation select-none transition-all duration-300 ease-out active:scale-90',
                isActive
                  ? 'flex-none px-4 bg-indigo-50 text-indigo-600 font-bold'
                  : 'flex-1 min-w-0 text-slate-400 active:bg-slate-100/80',
              ].join(' ')}
            >
              <span className="relative flex-shrink-0">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-2 -start-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {isActive && (
                <span key={id} className="text-xs leading-none whitespace-nowrap animate-nav-label-in">
                  {short}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
