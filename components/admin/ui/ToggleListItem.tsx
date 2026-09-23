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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md-full text-[0.65rem] font-semibold ${toneClasses}`}>
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
        'rounded-md-lg p-5 transition-colors duration-200',
        value
          ? 'bg-md-primary-container/40 border border-md-primary-container'
          : 'bg-md-surface-container border border-md-outline-variant shadow-md-1',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={[
              'w-10 h-10 rounded-md-md flex items-center justify-center flex-shrink-0 transition-colors',
              value ? 'bg-md-primary-container' : 'bg-md-surface-container-high',
            ].join(' ')}
          >
            <Icon className={`w-5 h-5 ${value ? 'text-md-on-primary-container' : 'text-md-on-surface-variant'}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${value ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>{label}</p>
            <p className="text-md-on-surface-variant text-xs mt-0.5 leading-snug">{description}</p>
          </div>
        </div>
        <Switch checked={value} onChange={onToggle} disabled={disabled} />
      </div>

      {statusNode && <div className="mt-4 flex items-center gap-2">{statusNode}</div>}
    </div>
  );
}
