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
    setSchedule((prev) => prev.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setSaving(true);
    for (const day of schedule) {
      await supabase
        .from('working_schedule')
        .update({ is_active: day.is_active, start_time: day.start_time, end_time: day.end_time, slot_interval: day.slot_interval })
        .eq('day_of_week', day.day_of_week);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <Skeleton />;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="mb-6">
        <h2 className="text-slate-900 font-semibold text-lg">خشتەی کاری</h2>
        <p className="text-slate-500 text-sm mt-0.5">رووژەکان دەگوێزەرەوە و کاتی بەردەستەکانت دیاری بکە</p>
      </div>

      {schedule.map((day) => (
        <div
          key={day.day_of_week}
          className={[
            'rounded-2xl border-2 p-4 transition-all duration-200 bg-white',
            day.is_active ? 'border-blue-200 shadow-sm' : 'border-slate-100 opacity-50',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`font-semibold text-sm ${day.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
              {DAY_NAMES[day.day_of_week]}
            </span>
            <Toggle
              checked={day.is_active}
              onChange={() => update(day.day_of_week, { is_active: !day.is_active })}
            />
          </div>

          {day.is_active && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 text-[0.65rem] tracking-wider font-medium">دەکرێتەوە</label>
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => update(day.day_of_week, { start_time: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm outline-none focus:border-blue-500/60 [color-scheme:light] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[0.65rem] tracking-wider font-medium">دادەخرێت</label>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => update(day.day_of_week, { end_time: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm outline-none focus:border-blue-500/60 [color-scheme:light] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 text-[0.65rem] tracking-wider font-medium">ماوەی هەر کاتی سەردانیکردنێک</label>
                <div className="flex gap-2 mt-1">
                  {INTERVALS.map((min) => (
                    <button
                      key={min}
                      onClick={() => update(day.day_of_week, { slot_interval: min })}
                      className={[
                        'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all touch-manipulation',
                        day.slot_interval === min
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 active:bg-slate-100',
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

      <button
        onClick={handleSave}
        disabled={saving}
        className={[
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all touch-manipulation',
          saved
            ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700'
            : 'bg-blue-600 text-white shadow-md shadow-blue-200/60 active:bg-blue-700 active:scale-[0.98]',
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
        checked ? 'bg-blue-600' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-200',
          checked ? 'left-6 bg-white' : 'left-1 bg-white',
        ].join(' ')}
      />
    </button>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-6 space-y-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
      ))}
    </div>
  );
}
