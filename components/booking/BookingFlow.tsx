'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer, Service, WorkingSchedule } from '@/lib/types';
import DateTimePicker from './DateTimePicker';
import BookingSummary from './BookingSummary';
import CustomerRegistration from './CustomerRegistration';

type Step = 'splash' | 'welcome' | 'register' | 'datetime' | 'summary';

interface Props {
  initialName?:  string;
  initialPhone?: string;
}

export default function BookingFlow({ initialName, initialPhone }: Props) {
  const router = useRouter();
  const [step, setStep]                       = useState<Step>('splash');
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

      if (initialName && initialPhone) {
        const { data: upserted } = await supabase
          .from('customers')
          .upsert({ full_name: initialName, phone_number: initialPhone }, { onConflict: 'phone_number' })
          .select()
          .single();
        if (upserted) {
          resolved = upserted;
          isRegistered = true;
          try {
            localStorage.setItem('luxe_customer', JSON.stringify(upserted));
            localStorage.setItem('luxe_registered', '1');
          } catch {}
        }
      }

      setCustomer(resolved);
      setStep((resolved && isRegistered) ? 'welcome' : 'register');
    }
    init();
  }, [initialName, initialPhone]);

  useEffect(() => {
    if (step !== 'welcome') return;
    const t = setTimeout(() => setStep('datetime'), customer ? 2200 : 3000);
    return () => clearTimeout(t);
  }, [step, customer]);

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
        status:           'confirmed',
      })
      .select()
      .single();
    setConfirming(false);
    if (data && !error) { router.push(`/appointment/${data.id}`); }
  }, [customer, service, selectedDate, selectedTime, router]);

  if (step === 'splash')   return <SplashScreen />;
  if (step === 'welcome')  return <WelcomeScreen customer={customer} />;
  if (step === 'register') return (
    <CustomerRegistration onComplete={(cust) => { setCustomer(cust); setStep('datetime'); }} />
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StepBar step={step} />
      {step === 'datetime' && (
        <DateTimePicker
          selectedDate={selectedDate} selectedTime={selectedTime}
          workingSchedule={workingSchedule} blockedDates={blockedDates}
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

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12)_0%,transparent_65%)]" />
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-amber-300 flex items-center justify-center bg-amber-50 shadow-md">
          <Scissors className="w-9 h-9 text-amber-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" style={{ animationDuration: '2.5s' }} />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-amber-500 text-xs tracking-[0.35em]">بەخێربێیت بۆ</p>
        <h1 className="font-display text-3xl font-bold text-neutral-900">بەربەری لوکس</h1>
        <p className="text-neutral-400 text-xs tracking-wide">چاکسازی بەرز</p>
      </div>
      <Dots />
    </div>
  );
}

function WelcomeScreen({ customer }: { customer: Customer | null }) {
  const firstName = customer?.full_name.split(' ')[0];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,158,11,0.14)_0%,transparent_65%)]" />
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-amber-300 flex items-center justify-center bg-amber-50 shadow-lg">
          <Scissors className="w-11 h-11 text-amber-500" />
        </div>
        <div className="absolute -inset-2 rounded-full border-2 border-amber-400/20 animate-pulse" />
      </div>
      <div className="text-center space-y-3">
        <p className="text-amber-500 text-xs tracking-[0.35em]">
          {customer ? `مەرحەبا، ${firstName}` : 'بەخێربێیت بۆ'}
        </p>
        <h1 className="font-display text-4xl font-bold text-neutral-900">بەربەری لوکس</h1>
        {customer
          ? <p className="text-neutral-600 text-base">خۆشحاڵبووین کە دیسانەوە هاتیت، <span className="text-amber-600 font-semibold">{firstName}</span>.</p>
          : <p className="text-neutral-500 text-sm leading-relaxed">چاکسازی بەرز، بە ئاسانی نەوبەت وەردەگیرێت.</p>
        }
      </div>
      <Dots />
    </div>
  );
}

function Dots() {
  return (
    <div className="flex gap-1.5 mt-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

const STEP_ORDER: Step[] = ['datetime', 'summary'];

function StepBar({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step);
  if (idx === -1) return null;
  return (
    <div className="w-full h-[3px] bg-neutral-100 relative">
      <div
        className="absolute right-0 top-0 h-full bg-gradient-to-l from-amber-600 to-amber-400 transition-all duration-500 ease-out rounded-full"
        style={{ width: `${((idx + 1) / STEP_ORDER.length) * 100}%` }}
      />
    </div>
  );
}
