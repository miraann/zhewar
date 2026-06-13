'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { BarberProfile, Customer, Service, WorkingSchedule } from '@/lib/types';
import DateTimePicker from './DateTimePicker';
import BookingSummary from './BookingSummary';
import CustomerRegistration from './CustomerRegistration';

type Step = 'register' | 'datetime' | 'summary';

interface Props {
  initialName?:  string;
  initialPhone?: string;
}

export default function BookingFlow({ initialName, initialPhone }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>('register');

  const [customer, setCustomer]               = useState<Customer | null>(null);
  const [service, setService]                 = useState<Service | null>(null);
  const [workingSchedule, setWorkingSchedule] = useState<WorkingSchedule[]>([]);
  const [blockedDates, setBlockedDates]       = useState<string[]>([]);
  const [selectedDate, setSelectedDate]       = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]       = useState<string | null>(null);
  const [confirming, setConfirming]           = useState(false);

  useEffect(() => {
    async function init() {
      const [
        { data: svcData },
        { data: scheduleData },
        { data: blockedData },
      ] = await Promise.all([
        supabase.from('services').select('*').order('price'),
        supabase.from('working_schedule').select('*').order('day_of_week'),
        supabase.from('blocked_dates').select('blocked_date'),
      ]);

      if (svcData && svcData.length > 0) setService(svcData[0]);
      if (scheduleData) setWorkingSchedule(scheduleData);
      if (blockedData)  setBlockedDates(blockedData.map((r) => r.blocked_date));

      let resolved: Customer | null = null;
      let isRegistered = false;
      try {
        const cached = localStorage.getItem('luxe_customer');
        if (cached) resolved = JSON.parse(cached);
        isRegistered = localStorage.getItem('luxe_registered') === '1';
      } catch {}

      if (resolved && isRegistered && !initialName) {
        setCustomer(resolved);
        setStep('datetime');
        return;
      }

      if (initialName && initialPhone) {
        const { data: upserted } = await supabase
          .from('customers')
          .upsert({ full_name: initialName, phone_number: initialPhone }, { onConflict: 'phone_number' })
          .select()
          .single();
        if (upserted) {
          resolved = upserted;
          try {
            localStorage.setItem('luxe_customer', JSON.stringify(upserted));
            localStorage.setItem('luxe_registered', '1');
          } catch {}
          setStep('datetime');
        }
      }

      setCustomer(resolved);
    }
    init();
  }, [initialName, initialPhone]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedDate || !selectedTime || !service) return;
    setConfirming(true);
    const [h, m] = selectedTime.split(':').map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h, m, 0, 0);
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        customer_id:      customer?.id ?? null,
        service_id:       service.id,
        appointment_time: dt.toISOString(),
        status:           'pending',
      })
      .select()
      .single();
    setConfirming(false);
    if (data && !error) { router.push(`/appointment/${data.id}`); }
  }, [customer, service, selectedDate, selectedTime, router]);

  if (step === 'register') return (
    <CustomerRegistration onComplete={(cust) => { setCustomer(cust); setStep('datetime'); }} />
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <StepBar step={step} />
      {step === 'datetime' && (
        <DateTimePicker
          selectedDate={selectedDate} selectedTime={selectedTime}
          workingSchedule={workingSchedule} blockedDates={blockedDates}
          customer={customer}
          onDateSelect={handleDateChange} onTimeSelect={setSelectedTime}
          onNext={() => setStep('summary')}
        />
      )}
      {step === 'summary' && selectedDate && selectedTime && (
        <BookingSummary
          customer={customer} date={selectedDate} time={selectedTime}
          confirming={confirming} onBack={() => setStep('datetime')} onConfirm={handleConfirm}
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
    <div className="w-full h-[2px] bg-white/5 relative">
      <div
        className="absolute right-0 top-0 h-full bg-gradient-to-l from-amber-500 to-amber-400 transition-all duration-500 ease-out rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        style={{ width: `${((idx + 1) / STEP_ORDER.length) * 100}%` }}
      />
    </div>
  );
}
