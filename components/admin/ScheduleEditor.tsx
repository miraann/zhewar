'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { WorkingSchedule } from '@/lib/types';
import { Save, Loader2 } from 'lucide-react';

const DAY_NAMES = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
const INTERVALS = [30, 60, 90];

export default function ScheduleEditor() {
  const [schedule, setSchedule] = useState<WorkingSchedule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    supabase
      .from('working_schedule')
      .select('*')
      .order('day_of_week')
      .then(({ data }) => {
        if (data) setSchedule(data);
        setLoading(false);
      });
  }, []);

  function update(day: number, patch: Partial<WorkingSchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d))
    );
  }

  async function handleSave() {
    setSaving(true);
    for (const day of schedule) {
      await supabase
        .from('working_schedule')
        .update({
          is_active:    day.is_active,
          start_time:   day.start_time,
          end_time:     day.end_time,
          slot_interval: day.slot_interval,
        })
        .eq('day_of_week', day.day_of_week);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <Skeleton />;

  return (
    <div className="px-4 py-6 space-y-4">
      <SectionHeader
        title="خشتەی کاری"
        subtitle="رووژەکان دەگوێزەرەوە و کاتی بەردەستەکانت دیاری بکە"
      />

      {schedule.map((day) => (
        <div
          key={day.day_of_week}
          className={[
            'rounded-2xl border p-4 transition-all duration-200',
            day.is_active
              ? 'border-amber-500/30 bg-white/[0.04]'
              : 'border-white/[0.06] bg-white/[0.02] opacity-60',
          ].join(' ')}
        >
          {/* Day header */}
          <div className="flex items-center justify-between mb-3">
            <span className={`font-medium text-sm ${day.is_active ? 'text-white' : 'text-neutral-500'}`}>
              {DAY_NAMES[day.day_of_week]}
            </span>
            <Toggle
              checked={day.is_active}
              onChange={() => update(day.day_of_week, { is_active: !day.is_active })}
            />
          </div>

          {/* Time inputs */}
          {day.is_active && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-500 text-[0.65rem] tracking-wider">دەکرێتەوە</label>
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => update(day.day_of_week, { start_time: e.target.value })}
                    className="mt-1 w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-neutral-500 text-[0.65rem] tracking-wider">دادەخرێت</label>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => update(day.day_of_week, { end_time: e.target.value })}
                    className="mt-1 w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Slot interval */}
              <div>
                <label className="text-neutral-500 text-[0.65rem] tracking-wider">ماوەی هەر نەوبەتێک</label>
                <div className="flex gap-2 mt-1">
                  {INTERVALS.map((min) => (
                    <button
                      key={min}
                      onClick={() => update(day.day_of_week, { slot_interval: min })}
                      className={[
                        'flex-1 py-2 rounded-xl text-xs font-medium border transition-all touch-manipulation',
                        day.slot_interval === min
                          ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                          : 'border-white/10 bg-white/[0.04] text-neutral-400',
                      ].join(' ')}
                    >
                      {min} خ
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={[
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all touch-manipulation',
          saved
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
            : 'bg-amber-500 text-neutral-950 shadow-[0_0_25px_rgba(245,158,11,0.3)] active:scale-[0.98]',
        ].join(' ')}
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> پاشەکەوتکردن...</>
          : saved
            ? '✓ خشتەی کار پاشەکەوتکرا!'
            : <><Save className="w-4 h-4" /> خشتەی کار پاشەکەوت بکە</>
        }
      </button>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={[
        'relative w-11 h-6 rounded-full transition-colors duration-200 touch-manipulation flex-shrink-0',
        checked ? 'bg-amber-500' : 'bg-white/10',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
          checked ? 'left-6' : 'left-1',
        ].join(' ')}
      />
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-white font-semibold text-lg">{title}</h2>
      <p className="text-neutral-500 text-sm mt-0.5">{subtitle}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-6 space-y-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />
      ))}
    </div>
  );
}
