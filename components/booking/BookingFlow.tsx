'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Customer, WorkingSchedule } from '@/lib/types';
import { AlertCircle } from 'lucide-react';
import DateTimePicker from './DateTimePicker';
import BookingSummary from './BookingSummary';
import CustomerRegistration from './CustomerRegistration';

type Step = 'register' | 'datetime' | 'summary';

function stepFromParam(s: string | null): Step {
  if (s === 'datetime') return 'datetime';
  if (s === 'summary')  return 'summary';
  return 'register';
}

const STEP_URL: Record<Step, string> = {
  register: '/book',
  datetime: '/book?step=datetime',
  summary:  '/book?step=summary',
};

interface Props {
  initialName?:  string;
  initialPhone?: string;
}

export default function BookingFlow({ initialName, initialPhone }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const step         = stepFromParam(searchParams.get('step'));

  const [customer, setCustomer]               = useState<Customer | null>(null);
  const [workingSchedule, setWorkingSchedule] = useState<WorkingSchedule[]>([]);
  const [blockedDates, setBlockedDates]       = useState<string[]>([]);
  const [confirming, setConfirming]           = useState(false);
  const [bookingError, setBookingError]       = useState<string | null>(null);

  // Hydrate date/time from sessionStorage so summary survives refresh
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    try { const s = sessionStorage.getItem('book_date'); return s ? new Date(s) : null; } catch { return null; }
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(() => {
    try { return sessionStorage.getItem('book_time'); } catch { return null; }
  });

  // Keep sessionStorage in sync
  useEffect(() => {
    try {
      if (selectedDate) sessionStorage.setItem('book_date', selectedDate.toISOString());
      else              sessionStorage.removeItem('book_date');
    } catch {}
  }, [selectedDate]);

  useEffect(() => {
    try {
      if (selectedTime) sessionStorage.setItem('book_time', selectedTime);
      else              sessionStorage.removeItem('book_time');
    } catch {}
  }, [selectedTime]);

  // If landing on summary without date/time, push back to datetime
  useEffect(() => {
    if (step === 'summary' && (!selectedDate || !selectedTime)) {
      router.replace(STEP_URL.datetime);
    }
  }, [step, selectedDate, selectedTime, router]);

  useEffect(() => {
    async function init() {
      const [{ data: scheduleData }, { data: blockedData }] = await Promise.all([
        supabase.from('working_schedule').select('*').order('day_of_week'),
        supabase.from('blocked_dates').select('blocked_date'),
      ]);
      if (scheduleData) setWorkingSchedule(scheduleData);
      if (blockedData)  setBlockedDates(blockedData.map((r) => r.blocked_date));

      let resolved: Customer | null = null;
      let isRegistered = false;
      try {
        const cached = localStorage.getItem('luxe_customer');
        if (cached) resolved = JSON.parse(cached);
        isRegistered = localStorage.getItem('luxe_registered') === '1';
      } catch {}

      if (resolved) setCustomer(resolved);

      // Validate: datetime/summary requires a registered customer
      if (step !== 'register' && (!resolved || !isRegistered)) {
        router.replace(STEP_URL.register);
        return;
      }

      // Auto-advance: already registered and landing on register with no QR params
      if (step === 'register' && resolved && isRegistered && !initialName) {
        router.replace(STEP_URL.datetime);
        return;
      }

      // Handle QR / initialName deep-link
      if (initialName && initialPhone) {
        try {
          const res = await fetch('/api/register-customer', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ full_name: initialName, phone_number: initialPhone }),
          });
          const upserted = await res.json();
          if (res.ok && upserted?.id) {
            try {
              localStorage.setItem('luxe_customer', JSON.stringify(upserted));
              localStorage.setItem('luxe_registered', '1');
            } catch {}
            setCustomer(upserted);
            router.replace(STEP_URL.datetime);
          }
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    init();
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedDate || !selectedTime) return;
    setConfirming(true);
    setBookingError(null);
    const [h, m] = selectedTime.split(':').map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h, m, 0, 0);
    let data: { id: string } | null = null;
    try {
      const res = await fetch('/api/book-appointment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ customer_id: customer?.id ?? null, appointment_time: dt.toISOString() }),
      });
      const json = await res.json();
      if (res.ok && json?.id) data = json;
    } catch {}
    setConfirming(false);
    if (!data) {
      setBookingError('کاتی سەردانیکردن تۆمار نەکرا. تکایە دووبارە هەوڵ بدەرەوە.');
      return;
    }
    try { sessionStorage.removeItem('book_date'); sessionStorage.removeItem('book_time'); } catch {}
    router.push(`/appointment/${data.id}`);
  }, [customer, selectedDate, selectedTime, router]);

  const errorModal = bookingError && (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBookingError(null)} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-500" />
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-slate-800 font-semibold text-sm leading-relaxed">{bookingError}</p>
          <button
            onClick={() => setBookingError(null)}
            className="w-full h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 transition-colors"
          >
            باشە، تێگەیشتم
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 'register') return (
    <>
      {errorModal}
      <CustomerRegistration
        onComplete={(cust) => {
          setCustomer(cust);
          router.push(STEP_URL.datetime);
        }}
      />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {errorModal}
      <StepBar step={step} />
      {step === 'datetime' && (
        <DateTimePicker
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          workingSchedule={workingSchedule}
          blockedDates={blockedDates}
          customer={customer}
          onDateSelect={handleDateChange}
          onTimeSelect={setSelectedTime}
          onNext={() => router.push(STEP_URL.summary)}
          onEdit={() => {
            try { localStorage.removeItem('luxe_registered'); } catch {}
            router.push(STEP_URL.register);
          }}
        />
      )}
      {step === 'summary' && selectedDate && selectedTime && (
        <BookingSummary
          customer={customer}
          date={selectedDate}
          time={selectedTime}
          confirming={confirming}
          onBack={() => router.back()}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

const STEP_ORDER: Step[] = ['datetime', 'summary'];

function StepBar({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step);
  if (idx === -1) return null;
  return (
    <div className="w-full h-[3px] bg-slate-200 relative">
      <div
        className="absolute right-0 top-0 h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
        style={{ width: `${((idx + 1) / STEP_ORDER.length) * 100}%` }}
      />
    </div>
  );
}
