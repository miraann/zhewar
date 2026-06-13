'use client';

import { useRef, useEffect, useState } from 'react';
import { Clock, BanIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkingSchedule, Customer } from '@/lib/types';

const DAY_SHORT   = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
const MONTH_SHORT = ['ک٢', 'شوب', 'ئاز', 'نیس', 'ئای', 'حوز', 'تەم', 'ئاب', 'ئەی', 'تش١', 'تش٢', 'ک١'];

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
  return Array.from({ length: 7 }, (_, i) => {
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
}

export default function DateTimePicker({
  selectedDate, selectedTime,
  workingSchedule, blockedDates,
  customer,
  onDateSelect, onTimeSelect, onNext,
}: Props) {
  const dates = buildDates();
  const [pendingSlots,   setPendingSlots]   = useState<Set<string>>(new Set());
  const [confirmedSlots, setConfirmedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots,   setLoadingSlots]   = useState(false);

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
  }, [selectedDate]);

  const daySchedule = selectedDate
    ? workingSchedule.find((s) => s.day_of_week === selectedDate.getDay())
    : null;
  const timeSlots = daySchedule?.is_active
    ? generateSlots(daySchedule.start_time, daySchedule.end_time, daySchedule.slot_interval)
    : [];

  const today    = new Date(); today.setHours(0,0,0,0);
  const isBlocked = (d: Date) => blockedDates.includes(toDateStr(d));
  const isWorkDay = (d: Date) => Boolean(workingSchedule.find((w) => w.day_of_week === d.getDay())?.is_active);
  const canProceed = Boolean(selectedDate && selectedTime);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2px)] bg-neutral-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-64 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-10 pb-5 relative z-10">
        <p className="text-amber-500/60 text-xs tracking-[0.35em] mb-1 text-right">هەنگاوی ١ لە ٢</p>
        <h2 className="text-[1.75rem] font-bold text-white leading-tight text-right">
          ڕۆژ و کات هەڵبژێرە
        </h2>

        {/* Customer chip */}
        {customer && (
          <div className="flex items-center justify-between mt-5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/40 shadow-sm flex-shrink-0 bg-amber-500/10">
                {customer.photo_url
                  ? <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold text-base">
                      {customer.full_name.charAt(0)}
                    </div>
                }
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{customer.full_name}</p>
                <p className="text-white/35 text-[0.65rem] mt-0.5">{customer.phone_number}</p>
              </div>
            </div>
            <span className="text-[0.6rem] font-semibold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
              کاتی سەردانیکردن
            </span>
          </div>
        )}
      </div>

      {/* 7-day strip */}
      <section className="px-4 mb-5 relative z-10">
        <p className="text-white/25 text-[0.6rem] tracking-widest mb-2.5 text-right">ڕۆژ هەڵبژێرە</p>
        <div dir="ltr" className="grid grid-cols-7 gap-1.5">
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
                  'flex flex-col items-center justify-center gap-[2px] py-3 rounded-2xl border transition-all duration-150 touch-manipulation select-none',
                  disabled
                    ? 'border-white/5 bg-white/3 opacity-25 cursor-not-allowed'
                    : isSelected
                      ? 'bg-amber-500 border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.35)]'
                      : isToday
                        ? 'bg-amber-500/10 border-amber-500/30 active:scale-[0.95]'
                        : 'bg-white/5 border-white/10 active:border-amber-500/40 active:scale-[0.95]',
                ].join(' ')}
              >
                <span className={`text-[0.5rem] font-semibold leading-tight text-center w-full px-0.5 break-words ${
                  isSelected ? 'text-neutral-900/70' : isToday ? 'text-amber-400' : disabled ? 'text-white/20' : 'text-white/40'
                }`}>
                  {DAY_SHORT[date.getDay()]}
                </span>
                <span className={`text-[1.05rem] font-bold leading-none ${
                  isSelected ? 'text-neutral-900' : isToday ? 'text-amber-400' : disabled ? 'text-white/20' : 'text-white/80'
                }`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />
                )}
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-900/40 mt-0.5" />
                )}
                {isBlocked(date) && <BanIcon className="w-2.5 h-2.5 text-red-400/60 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time grid */}
      <section className="flex-1 px-4 pb-36 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-[0.6rem] font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-white/35">چاوەڕوان</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400/70 inline-block" />
              <span className="text-white/35">پەسەندکراوە</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400/70 inline-block" />
              <span className="text-white/35">بەردەستە</span>
            </span>
          </div>
          <p className="text-white/25 text-[0.6rem] tracking-widest text-right">
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
                <div key={i} className="h-[58px] rounded-2xl bg-white/5 animate-pulse" />
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
                        ? 'border-red-500/20 bg-red-500/8 text-red-400/60 cursor-not-allowed'
                        : isPending
                          ? 'border-amber-500/25 bg-amber-500/8 text-amber-400/70 cursor-not-allowed'
                          : chosen
                            ? 'border-amber-400 bg-amber-500 text-neutral-950 shadow-[0_4px_20px_rgba(245,158,11,0.3)] active:scale-[0.97]'
                            : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400 active:border-emerald-400/40 active:scale-[0.97]',
                    ].join(' ')}
                  >
                    {formatTimeFull(slot)}
                    {isPending && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                        <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                        <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-red-400/40" />
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}

        {(!selectedDate || !daySchedule?.is_active) && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-400/60" />
            </div>
            <p className="text-white/35 text-sm text-center leading-relaxed px-6">
              {!selectedDate
                ? 'ڕۆژێک هەڵبژێرە بۆ بینینی کاتە بەردەستەکان'
                : 'بەربەرخانەکە ئەم ڕۆژە داخراوە'}
            </p>
          </div>
        )}
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-14 pb-6 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pointer-events-none z-20">
        <button
          disabled={!canProceed}
          onClick={onNext}
          className={[
            'relative w-full py-[18px] rounded-2xl font-bold text-base tracking-wide transition-all duration-200 pointer-events-auto touch-manipulation select-none overflow-hidden',
            canProceed
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-[0_0_40px_rgba(245,158,11,0.3),0_4px_20px_rgba(245,158,11,0.2)] active:scale-[0.98]'
              : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed',
          ].join(' ')}
        >
          {canProceed && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />}
          <span className="relative">{canProceed ? '← تۆمار کردن' : 'ڕۆژ و کات هەڵبژێرە'}</span>
        </button>
      </div>
    </div>
  );
}
