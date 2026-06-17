'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BlockedDate } from '@/lib/types';
import { Plus, Trash2, CalendarOff, Loader2 } from 'lucide-react';

const WEEKDAY     = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const MONTH_SHORT = ['ک٢','شوب','ئاز','نیس','ئای','حوز','تەم','ئاب','ئەی','تش١','تش٢','ک١'];

function formatKurdishDate(dateStr: string) {
  const dt = new Date(dateStr + 'T00:00:00');
  return `${WEEKDAY[dt.getDay()]}، ${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

export default function BlockedDatesEditor() {
  const [dates, setDates]     = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason]   = useState('');
  const [adding, setAdding]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blocked_dates')
      .select('*')
      .order('blocked_date', { ascending: true });
    if (data) setDates(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newDate) return;
    setAdding(true);
    const { data } = await supabase
      .from('blocked_dates')
      .insert({ blocked_date: newDate, reason: reason || null })
      .select()
      .single();
    if (data) setDates((prev) => [...prev, data].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
    setNewDate('');
    setReason('');
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('blocked_dates').delete().eq('id', id);
    setDates((prev) => prev.filter((d) => d.id !== id));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">رووژانی داخراو</h2>
        <p className="text-slate-500 text-sm mt-0.5">رووژە دیاریکراوەکان ببەستە — هیچ کاتی سەردانیکردنێک وەرناگیرێت</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-3">
        <p className="text-red-600 text-xs font-semibold tracking-wider">زیادکردنی رووژی داخراو</p>
        <input
          type="date"
          value={newDate}
          min={today}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-500/60 [color-scheme:light] transition-colors"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="هۆکار (ئارەزوومەند، بۆ نموونە: مەرخەس)"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-500/60 transition-colors placeholder-slate-400"
        />
        <button
          onClick={handleAdd}
          disabled={!newDate || adding}
          className={[
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all touch-manipulation',
            !newDate || adding
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-blue-600 text-white shadow-md shadow-blue-200/50 active:bg-blue-700 active:scale-[0.98]',
          ].join(' ')}
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          ئەم رووژە ببەستە
        </button>
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && dates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <CalendarOff className="w-9 h-9 text-slate-300" />
          <p className="text-slate-400 text-sm">هنوکا هیچ رووژێک داخراو نییە</p>
        </div>
      )}

      {!loading && dates.map((d) => {
        const isPast = d.blocked_date < today;
        return (
          <div
            key={d.id}
            className={[
              'flex items-center justify-between gap-3 rounded-2xl border p-4 bg-white',
              isPast ? 'border-slate-100 opacity-40' : 'border-red-200 shadow-sm',
            ].join(' ')}
          >
            <div className="min-w-0">
              <p className="text-slate-900 text-sm font-semibold">{formatKurdishDate(d.blocked_date)}</p>
              {d.reason && <p className="text-slate-500 text-xs mt-0.5 truncate">{d.reason}</p>}
            </div>
            <button
              onClick={() => handleDelete(d.id)}
              className="p-2 text-slate-400 active:text-red-500 transition-colors touch-manipulation flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
