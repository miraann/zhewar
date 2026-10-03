'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { BookingSettings, Customer, WorkingSchedule } from '@/lib/types';
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

// Re-creates the customer row if the hourly cleanup (supabase/migrations/
// 2026-10-01_visit_retention.sql) deleted it between registration and
// confirm, with the same fields CustomerRegistration sent.
async function registerAgain(cached: Customer): Promise<Customer | null> {
  let storedToken: string | null = null;
  try { storedToken = localStorage.getItem('luxe_customer_token'); } catch {}
  try {
    const res = await fetch('/api/register-customer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        full_name:    cached.full_name,
        phone_number: cached.phone_number,
        photo_url:    cached.photo_url,
        facebook_id:  cached.facebook_id,
        notes:        cached.notes,
        access_token: storedToken || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.id) return null;
    try {
      if (typeof json.access_token === 'string') localStorage.setItem('luxe_customer_token', json.access_token);
    } catch {}
    // Without this device's access token only the id comes back
    return { ...cached, ...json } as Customer;
  } catch {
    return null;
  }
}

interface Props {
  settings: BookingSettings;
}

export default function BookingFlow({ settings }: Props) {
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
  // Face scan taken for this booking, stored on the appointment
  const [bookingPhoto, setBookingPhoto] = useState<string | null>(null);

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

  const displayCustomer = customer && bookingPhoto ? { ...customer, photo_url: bookingPhoto } : customer;

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
    }
    init();
    // Cached registration left by older versions — no longer used
    try {
      localStorage.removeItem('luxe_customer');
      localStorage.removeItem('luxe_registered');
    } catch {}
  }, []);

  // Every booking starts with registration (face scan + form), so the
  // customer only exists once that's done in this visit — landing on a
  // later step directly, or after a refresh, starts over.
  useEffect(() => {
    if (step !== 'register' && !customer) router.replace(STEP_URL.register);
  }, [step, customer, router]);

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
    const book = (customerId: string | null) => fetch('/api/book-appointment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        customer_id:      customerId,
        appointment_time: dt.toISOString(),
        photo_url:        bookingPhoto ?? customer?.photo_url ?? null,
      }),
    });
    let data: { id: string } | null = null;
    try {
      let res = await book(customer?.id ?? null);
      // The hourly cleanup deleted the customer since they registered
      if (res.status === 404 && customer) {
        const fresh = await registerAgain(customer);
        if (fresh) {
          setCustomer(fresh);
          res = await book(fresh.id);
        }
      }
      const json = await res.json();
      if (res.ok && json?.id) data = json;
      // Missing or reused face scan — start over at registration
      if (json?.error === 'face_scan_required') {
        setConfirming(false);
        setCustomer(null);
        setBookingError('تکایە سەرەتا سکانی ڕووخسارت بکە');
        return;
      }
      // The slot passed or the schedule changed meanwhile — pick another
      if (json?.error === 'invalid_time') {
        setConfirming(false);
        setSelectedTime(null);
        router.replace(STEP_URL.datetime);
        setBookingError('ئەم کاتە بەردەست نییە. تکایە کاتێکی تر هەڵبژێرە');
        return;
      }
      if (json?.error === 'rate_limited') {
        setConfirming(false);
        setBookingError('تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵبدەرەوە');
        return;
      }
    } catch {}
    setConfirming(false);
    if (!data) {
      setBookingError('کاتی سەردانیکردن تۆمار نەکرا. تکایە دووبارە هەوڵ بدەرەوە.');
      return;
    }
    try {
      sessionStorage.removeItem('book_date');
      sessionStorage.removeItem('book_time');
    } catch {}
    router.push(`/appointment/${data.id}`);
  }, [customer, bookingPhoto, selectedDate, selectedTime, router]);

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
        settings={settings}
        onComplete={(cust, photo) => {
          setCustomer(cust);
          setBookingPhoto(photo);
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
          customer={displayCustomer}
          onDateSelect={handleDateChange}
          onTimeSelect={setSelectedTime}
          onNext={() => router.push(STEP_URL.summary)}
          onEdit={() => router.push(STEP_URL.register)}
        />
      )}
      {step === 'summary' && selectedDate && selectedTime && (
        <BookingSummary
          customer={displayCustomer}
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
