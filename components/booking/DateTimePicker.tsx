'use client';

import { useRef, useEffect, useState } from 'react';
import { Clock, BanIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkingSchedule } from '@/lib/types';

const DAY_SHORT   = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
const MONTH_SHORT = ['ک٢', 'شوب', 'ئاز', 'نیس', 'ئای', 'حوز', 'تەم', 'ئاب', 'ئەی', 'تش١', 'تش٢', 'ک١'];

export function formatTimeFull(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  let period: string;
  if (h < 12)       period = 'بەیانی';   // 12 AM – 11:59 AM
  else if (h === 12) period = 'نیوەڕۆ';  // 12:00 PM
  else if (h <= 16) period = 'دوا نیوەڕۆ'; // 1 PM – 4 PM
  else if (h <= 18) period = 'ئێوارە';   // 5 PM – 6 PM
  else              period = 'شەو';      // 7 PM – 11 PM
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
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string | null) => void;
  onNext: () => void;
}

export default function DateTimePicker({
  selectedDate, selectedTime,
  workingSchedule, blockedDates,
  onDateSelect, onTimeSelect, onNext,
}: Props) {
  const dates = buildDates();
  const [bookedSlots, setBookedSlots]   = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    let dead = false;
    async function fetchSlots() {
      setLoadingSlots(true);
      const start = new Date(selectedDate!); start.setHours(0,0,0,0);
      const end   = new Date(selectedDate!); end.setHours(23,59,59,999);
      const { data } = await supabase
        .from('appointments').select('appointment_time')
        .gte('appointment_time', start.toISOString())
        .lte('appointment_time', end.toISOString())
        .neq('status', 'cancelled');
      if (!dead && data)
        setBookedSlots(data.map((r) => {
          const d = new Date(r.appointment_time);
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }));
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
    <div className="flex flex-col min-h-[calc(100vh-1px)] bg-white">
      {/* Header */}
      <div className="px-5 pt-10 pb-5">
        <p className="text-amber-500 text-xs tracking-[0.35em] mb-1 text-right">هەنگاوی ١ لە ٢</p>
        <h2 className="text-[1.75rem] font-bold text-neutral-900 leading-tight text-right">
          <span className="text-amber-500">رووژ</span> و کات هەڵبژێرە
        </h2>
      </div>

      {/* 7-day strip */}
      <section className="px-4 mb-5">
        <p className="text-neutral-400 text-[0.6rem] tracking-widest mb-2.5 text-right">رووژ هەڵبژێرە</p>
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
                  'flex flex-col items-center justify-center gap-[2px] py-3 rounded-2xl border-2 transition-all duration-150 touch-manipulation select-none',
                  disabled
                    ? 'border-neutral-100 bg-neutral-50 opacity-35 cursor-not-allowed'
                    : isSelected
                      ? 'bg-amber-500 border-amber-500 shadow-[0_4px_18px_rgba(245,158,11,0.40)]'
                      : isToday
                        ? 'bg-amber-50 border-amber-300 active:scale-[0.95]'
                        : 'bg-white border-neutral-200 shadow-sm active:border-amber-400 active:scale-[0.95]',
                ].join(' ')}
              >
                <span className={`text-[0.5rem] font-semibold leading-tight text-center w-full px-0.5 break-words ${
                  isSelected ? 'text-white/80' : isToday ? 'text-amber-600' : disabled ? 'text-neutral-300' : 'text-neutral-400'
                }`}>
                  {DAY_SHORT[date.getDay()]}
                </span>
                <span className={`text-[1.05rem] font-bold leading-none ${
                  isSelected ? 'text-white' : isToday ? 'text-amber-700' : disabled ? 'text-neutral-300' : 'text-neutral-800'
                }`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />
                )}
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-0.5" />
                )}
                {isBlocked(date) && <BanIcon className="w-2.5 h-2.5 text-red-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time grid */}
      <section className="flex-1 px-4 pb-36">
        <p className="text-neutral-400 text-[0.6rem] tracking-widest mb-3 text-right">
          {!selectedDate
            ? 'پێشتر رووژێک هەڵبژێرە'
            : !daySchedule?.is_active
              ? 'ئەم رووژە داخراوە'
              : 'کاتە بەردەستەکان'}
        </p>

        {selectedDate && daySchedule?.is_active && (
          loadingSlots ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[58px] rounded-2xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot) => {
                const taken  = bookedSlots.includes(slot);
                const chosen = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => onTimeSelect(chosen ? null : slot)}
                    className={[
                      'h-[58px] rounded-2xl border-2 text-sm font-semibold transition-all duration-150 touch-manipulation select-none',
                      taken
                        ? 'border-neutral-100 bg-neutral-50 text-neutral-300 line-through cursor-not-allowed'
                        : chosen
                          ? 'border-amber-500 bg-amber-500 text-white shadow-[0_4px_18px_rgba(245,158,11,0.35)] active:scale-[0.97]'
                          : 'border-neutral-200 bg-white text-neutral-800 shadow-sm active:border-amber-400 active:bg-amber-50 active:scale-[0.97]',
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
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-sm">
              <Clock className="w-7 h-7 text-amber-400" />
            </div>
            <p className="text-neutral-500 text-sm text-center leading-relaxed px-6">
              {!selectedDate
                ? 'رووژێک هەڵبژێرە بۆ بینینی کاتە بەردەستەکان'
                : 'بەربەرخانەکە ئەم رووژە داخراوە'}
            </p>
          </div>
        )}
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-10 pb-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
        <button
          disabled={!canProceed}
          onClick={onNext}
          className={[
            'w-full py-[18px] rounded-2xl font-bold text-base tracking-wide transition-all duration-200 pointer-events-auto touch-manipulation select-none',
            canProceed
              ? 'bg-amber-500 text-white shadow-[0_0_32px_rgba(245,158,11,0.4),0_4px_16px_rgba(245,158,11,0.25)] active:scale-[0.98]'
              : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed',
          ].join(' ')}
        >
          {canProceed ? '← پشکنینی نەوبەت' : 'رووژ و کات هەڵبژێرە'}
        </button>
      </div>
    </div>
  );
}
