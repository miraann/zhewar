'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { WorkingSchedule } from '@/lib/types';
import { Save, Loader2 } from 'lucide-react';
import Switch from './ui/Switch';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

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
    await fetch('/api/admin/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="px-4 py-6"><Skeleton count={7} /></div>;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="mb-6">
        <h2 className="text-md-on-surface font-semibold text-lg">خشتەی کاری</h2>
        <p className="text-md-on-surface-variant text-sm mt-0.5">ڕۆژ و کاتی کارکردن دیاری بکە</p>
      </div>

      {schedule.map((day) => (
        <div
          key={day.day_of_week}
          className={[
            'rounded-md-lg p-4 transition-colors duration-200',
            day.is_active
              ? 'bg-md-primary-container/40 border border-md-primary-container'
              : 'bg-md-surface-container border border-md-outline-variant shadow-md-1',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`font-semibold text-sm ${day.is_active ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
              {DAY_NAMES[day.day_of_week]}
            </span>
            <Switch
              checked={day.is_active}
              onChange={() => update(day.day_of_week, { is_active: !day.is_active })}
            />
          </div>

          {day.is_active && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-md-on-surface-variant text-[0.65rem] tracking-wider font-medium">دەکرێتەوە</label>
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => update(day.day_of_week, { start_time: e.target.value })}
                    className="mt-1 w-full bg-md-surface border border-md-outline rounded-md-sm px-3 py-2.5 text-md-on-surface text-sm outline-none focus:border-md-primary focus:border-2 [color-scheme:light] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-md-on-surface-variant text-[0.65rem] tracking-wider font-medium">دادەخرێت</label>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => update(day.day_of_week, { end_time: e.target.value })}
                    className="mt-1 w-full bg-md-surface border border-md-outline rounded-md-sm px-3 py-2.5 text-md-on-surface text-sm outline-none focus:border-md-primary focus:border-2 [color-scheme:light] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-md-on-surface-variant text-[0.65rem] tracking-wider font-medium">ماوەی هەر کاتی سەردانیکردنێک</label>
                <div className="flex gap-2 mt-1">
                  {INTERVALS.map((min) => (
                    <button
                      key={min}
                      onClick={() => update(day.day_of_week, { slot_interval: min })}
                      className={[
                        'flex-1 py-2 rounded-md-full text-xs font-semibold border transition-all touch-manipulation',
                        day.slot_interval === min
                          ? 'border-md-secondary-container bg-md-secondary-container text-md-on-secondary-container'
                          : 'border-md-outline-variant bg-md-surface-container-high text-md-on-surface-variant active:bg-md-surface-container-highest',
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

      <Button onClick={handleSave} disabled={saving} variant={saved ? 'success' : 'filled'}>
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> پاشەکەوتکردن...</>
          : saved
            ? '✓ خشتەی کار پاشەکەوتکرا!'
            : <><Save className="w-4 h-4" /> خشتەی کار پاشەکەوت بکە</>
        }
      </Button>
    </div>
  );
}
