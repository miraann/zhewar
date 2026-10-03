'use client';

import { Loader2 } from 'lucide-react';
import Switch from './Switch';

export function StatusBadge({ text, tone }: { text: string; tone: 'success' | 'neutral' | 'error' }) {
  const toneClasses = {
    success: 'bg-md-success-container text-md-on-success-container',
    neutral: 'bg-md-surface-container-highest text-md-on-surface-variant',
    error:   'bg-md-error-container text-md-on-error-container',
  }[tone];
  const dotClasses = {
    success: 'bg-md-success',
    neutral: 'bg-md-on-surface-variant',
    error:   'bg-md-error',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-bold ${toneClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      {text}
    </span>
  );
}

export function SavingIndicator({ label = 'پاشەکەوتکردن...' }: { label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] text-md-on-surface-variant">
      <Loader2 className="w-3 h-3 animate-spin" />
      {label}
    </span>
  );
}

export default function ToggleListItem({
  icon: Icon, label, description, value, onToggle, disabled, statusNode,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  statusNode?: React.ReactNode;
}) {
  return (
    <div
      className={[
        'rounded-3xl p-5 border transition-all duration-300',
        value
          ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.08)]'
          : 'bg-white border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div
            className={[
              'p-3 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300',
              value ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100/80 text-slate-500',
            ].join(' ')}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[0.95rem] text-slate-900">{label}</p>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <Switch checked={value} onChange={onToggle} disabled={disabled} />
      </div>

      {statusNode && <div className="mt-4 flex items-center gap-2">{statusNode}</div>}
    </div>
  );
}
