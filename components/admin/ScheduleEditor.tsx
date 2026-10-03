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
        <h2 className="text-2xl font-black text-slate-900 leading-tight">خشتەی کاری</h2>
        <p className="text-slate-500 text-sm mt-1">ڕۆژ و کاتی کارکردن دیاری بکە</p>
      </div>

      {schedule.map((day) => (
        <div
          key={day.day_of_week}
          className={[
            'rounded-3xl p-5 border transition-all duration-300',
            day.is_active
              ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.08)]'
              : 'bg-white border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`font-bold text-[0.95rem] ${day.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
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
                    className="admin-input mt-1 px-3 py-2.5 [color-scheme:light]"
                  />
                </div>
                <div>
                  <label className="text-md-on-surface-variant text-[0.65rem] tracking-wider font-medium">دادەخرێت</label>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => update(day.day_of_week, { end_time: e.target.value })}
                    className="admin-input mt-1 px-3 py-2.5 [color-scheme:light]"
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
                        'flex-1 h-10 rounded-xl text-xs border transition-all duration-200 touch-manipulation active:scale-95',
                        day.slot_interval === min
                          ? 'border-indigo-100 bg-indigo-50 text-indigo-600 font-bold'
                          : 'border-transparent bg-slate-100/60 text-slate-500 font-semibold',
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
