'use client';

import { useEffect, useState } from 'react';
import { Clock, BanIcon, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkingSchedule, Customer } from '@/lib/types';

const DAY_SHORT = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];

export function formatTimeFull(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  let period: string;
  if (h < 12)        period = 'بەیانی';
  else if (h === 12) period = 'نیوەڕۆ';
  else if (h <= 16)  period = 'دوا نیوەڕۆ';
  else if (h <= 18)  period = 'ئێوارە';
  else               period = 'شەو';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}${m ? `:${String(m).padStart(2, '0')}` : ''} ${period}`;
}

function buildDates(): Date[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });
}

function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function toDateStr(d: Date)        { return d.toISOString().slice(0, 10); }

function generateSlots(startTime: string, endTime: string, intervalMins: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const slots: string[] = [];
  for (let m = sh * 60 + sm; m < eh * 60 + em; m += intervalMins)
    slots.push(`${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`);
  return slots;
}

interface Props {
  selectedDate: Date | null;
  selectedTime: string | null;
  workingSchedule: WorkingSchedule[];
  blockedDates: string[];
  customer: Customer | null;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string | null) => void;
  onNext: () => void;
  onEdit: () => void;
}

export default function DateTimePicker({
  selectedDate, selectedTime,
  workingSchedule, blockedDates,
  customer,
  onDateSelect, onTimeSelect, onNext, onEdit,
}: Props) {
  const dates = buildDates();
  const [pendingSlots,   setPendingSlots]   = useState<Set<string>>(new Set());
  const [confirmedSlots, setConfirmedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots,   setLoadingSlots]   = useState(false);
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('realtime:appointments:slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        setSlotRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let dead = false;
    async function fetchSlots() {
      setLoadingSlots(true);
      const start = new Date(selectedDate!); start.setHours(0,0,0,0);
      const end   = new Date(selectedDate!); end.setHours(23,59,59,999);
      const { data } = await supabase
        .from('appointments').select('appointment_time, status')
        .gte('appointment_time', start.toISOString())
        .lte('appointment_time', end.toISOString())
        .neq('status', 'cancelled');
      if (!dead && data) {
        const p = new Set<string>();
        const c = new Set<string>();
        data.forEach((r) => {
          const d = new Date(r.appointment_time);
          const key = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          if (r.status === 'confirmed') c.add(key);
          else p.add(key);
        });
        setPendingSlots(p);
        setConfirmedSlots(c);
      }
      if (!dead) setLoadingSlots(false);
    }
    fetchSlots();
    return () => { dead = true; };
  }, [selectedDate, slotRefreshKey]);

  const daySchedule = selectedDate
    ? workingSchedule.find((s) => s.day_of_week === selectedDate.getDay())
    : null;
  const timeSlots = daySchedule?.is_active
    ? generateSlots(daySchedule.start_time, daySchedule.end_time, daySchedule.slot_interval)
    : [];

  const today     = new Date(); today.setHours(0,0,0,0);
  const isBlocked = (d: Date) => blockedDates.includes(toDateStr(d));
  const isWorkDay = (d: Date) => Boolean(workingSchedule.find((w) => w.day_of_week === d.getDay())?.is_active);
  const canProceed = Boolean(selectedDate && selectedTime);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3px)] bg-transparent relative">

      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <p className="text-blue-600 text-xs tracking-[0.35em] mb-1 text-right font-medium">هەنگاوی ١ لە ٢</p>
        <h2 className="text-[1.75rem] font-bold text-slate-900 leading-tight text-right">
          ڕۆژ و کات هەڵبژێرە
        </h2>

        {/* Customer chip */}
        {customer && (
          <div className="flex items-center justify-between mt-4 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 flex-shrink-0 bg-slate-100">
                {customer.photo_url
                  ? <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-base">
                      {customer.full_name.charAt(0)}
                    </div>
                }
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm leading-tight">{customer.full_name}</p>
                <p className="text-slate-400 text-[0.65rem] mt-0.5">{customer.phone_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-[0.6rem] font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 active:text-slate-800 transition-all touch-manipulation"
              >
                <Pencil className="w-2.5 h-2.5" />
                دەستکاری
              </button>
              <span className="text-[0.6rem] font-semibold tracking-wider px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600">
                کاتی سەردانیکردن
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 7-day strip */}
      <section className="px-4 mb-4">
        <p className="text-slate-500 text-[0.6rem] tracking-widest mb-2 text-right font-medium">ڕۆژ هەڵبژێرە</p>
        <div dir="ltr" className="flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {dates.map((date) => {
            const isSelected = selectedDate ? sameDay(date, selectedDate) : false;
            const isToday    = sameDay(date, today);
            const disabled   = !isWorkDay(date) || isBlocked(date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => { if (!disabled) onDateSelect(date); }}
                disabled={disabled}
                className={[
                  'flex-shrink-0 w-[13%] flex flex-col items-center justify-center gap-[2px] py-3 rounded-2xl border transition-all duration-150 touch-manipulation select-none snap-start',
                  disabled
                    ? 'border-slate-100 bg-slate-50 opacity-35 cursor-not-allowed'
                    : isSelected
                      ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200/60'
                      : isToday
                        ? 'bg-blue-50 border-blue-300 active:scale-[0.95]'
                        : 'bg-white border-slate-200 active:border-blue-400 active:scale-[0.95] shadow-sm',
                ].join(' ')}
              >
                <span className={`text-[0.5rem] font-semibold leading-tight text-center w-full px-0.5 break-words ${
                  isSelected ? 'text-white/80' : isToday ? 'text-blue-600' : disabled ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {DAY_SHORT[date.getDay()]}
                </span>
                <span className={`text-[1.05rem] font-bold leading-none ${
                  isSelected ? 'text-white' : isToday ? 'text-blue-700' : disabled ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />
                )}
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-0.5" />
                )}
                {isBlocked(date) && <BanIcon className="w-2.5 h-2.5 text-red-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time grid */}
      <section className="flex-1 px-4 pb-36">

        {/* Legend + label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-[0.6rem] font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-600">چاوەڕوان</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span className="text-slate-600">پەسەندکراوە</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-600">بەردەستە</span>
            </span>
          </div>
          <p className="text-slate-500 text-[0.6rem] tracking-widest text-right">
            {!selectedDate
              ? 'پێشتر ڕۆژێک هەڵبژێرە'
              : !daySchedule?.is_active
                ? 'ئەم ڕۆژە داخراوە'
                : 'کاتە بەردەستەکان'}
          </p>
        </div>

        {selectedDate && daySchedule?.is_active && (
          loadingSlots ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[58px] rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot) => {
                const isPending   = pendingSlots.has(slot);
                const isConfirmed = confirmedSlots.has(slot);
                const taken  = isPending || isConfirmed;
                const chosen = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => onTimeSelect(chosen ? null : slot)}
                    className={[
                      'h-[58px] rounded-2xl border text-sm font-semibold transition-all duration-150 touch-manipulation select-none relative overflow-hidden',
                      isConfirmed
                        ? 'border-red-600 bg-red-600 text-white cursor-not-allowed'
                        : isPending
                          ? 'border-amber-400 bg-amber-400 text-white cursor-not-allowed'
                          : chosen
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200/60 active:scale-[0.97]'
                            : 'border-emerald-500 bg-emerald-500 text-white active:scale-[0.97] shadow-sm',
                    ].join(' ')}
                  >
                    {formatTimeFull(slot)}
                  </button>
                );
              })}
            </div>
          )
        )}

        {(!selectedDate || !daySchedule?.is_active) && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Clock className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-slate-500 text-sm text-center leading-relaxed px-6">
              {!selectedDate
                ? 'ڕۆژێک هەڵبژێرە بۆ بینینی کاتە بەردەستەکان'
                : 'بەربەرخانەکە ئەم ڕۆژە داخراوە'}
            </p>
          </div>
        )}
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-14 pb-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20">
        <button
          disabled={!canProceed}
          onClick={onNext}
          className={[
            'w-full h-14 rounded-2xl font-bold text-base tracking-wide transition-all duration-200 pointer-events-auto touch-manipulation select-none',
            canProceed
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200/70 active:bg-blue-700 active:scale-[0.98]'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed',
          ].join(' ')}
        >
          {canProceed ? '← تۆمار کردن' : 'ڕۆژ و کات هەڵبژێرە'}
        </button>
      </div>
    </div>
  );
}
