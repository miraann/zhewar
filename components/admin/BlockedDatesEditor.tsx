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
        <h2 className="text-white font-semibold text-lg">رووژانی داخراو</h2>
        <p className="text-white/35 text-sm mt-0.5">رووژە دیاریکراوەکان ببەستە — هیچ کاتی سەردانیکردنێک وەرناگیرێت</p>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/8 p-4 space-y-3">
        <p className="text-amber-400/70 text-xs tracking-wider font-medium">زیادکردنی رووژی داخراو</p>
        <input
          type="date"
          value={newDate}
          min={today}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 [color-scheme:dark] transition-colors"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="هۆکار (ئارەزوومەند، بۆ نموونە: مەرخەس)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 transition-colors placeholder-white/25"
        />
        <button
          onClick={handleAdd}
          disabled={!newDate || adding}
          className={[
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all touch-manipulation',
            !newDate || adding
              ? 'bg-white/5 text-white/20 border border-white/8 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.2)]',
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
            <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/8 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && dates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <CalendarOff className="w-9 h-9 text-white/15" />
          <p className="text-white/25 text-sm">هنوکا هیچ رووژێک داخراو نییە</p>
        </div>
      )}

      {!loading && dates.map((d) => {
        const isPast = d.blocked_date < today;
        return (
          <div
            key={d.id}
            className={[
              'flex items-center justify-between gap-3 rounded-2xl border p-4',
              isPast
                ? 'border-white/5 bg-white/3 opacity-40'
                : 'border-red-500/20 bg-red-500/5',
            ].join(' ')}
          >
            <div className="min-w-0">
              <p className="text-white text-sm font-medium">{formatKurdishDate(d.blocked_date)}</p>
              {d.reason && <p className="text-white/35 text-xs mt-0.5 truncate">{d.reason}</p>}
            </div>
            <button
              onClick={() => handleDelete(d.id)}
              className="p-2 text-white/20 active:text-red-400 transition-colors touch-manipulation flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
