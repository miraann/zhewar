import { supabase } from '@/lib/supabase';
import AppointmentReceiptPage from '@/components/booking/AppointmentReceiptPage';
import { notFound } from 'next/navigation';
import type { AppointmentFull } from '@/lib/types';

export default async function AppointmentPage({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from('appointments')
    .select(`
      id, appointment_time, status, created_at,
      customers(full_name, phone_number, photo_url),
      services(name, duration, price)
    `)
    .eq('id', params.id)
    .single();

  if (!data) notFound();

  return <AppointmentReceiptPage appointment={data as unknown as AppointmentFull} />;
}
