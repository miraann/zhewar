import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import AppointmentReceiptPage from '@/components/booking/AppointmentReceiptPage';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { AppointmentFull } from '@/lib/types';

function signAction(appointmentId: string, action: string): string {
  return createHmac('sha256', process.env.ADMIN_TOKEN!)
    .update(`${appointmentId}:${action}`)
    .digest('hex');
}

export const dynamic = 'force-dynamic';

function freshClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } }
  );
}

export default async function AppointmentPage({ params }: { params: { id: string } }) {
  const supabase = freshClient();

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, appointment_time, status, created_at,
        customers(full_name, phone_number, photo_url, facebook_id),
        services(name, duration, price)
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('barber_profile').select('name, logo_url, whatsapp_number').single(),
  ]);

  if (!data) notFound();

  const headersList = headers();
  const host  = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const base  = `${proto}://${host}`;
  const confirmUrl = `${base}/api/booking/${data.id}/confirm?token=${signAction(data.id, 'confirm')}`;
  const cancelUrl  = `${base}/api/booking/${data.id}/cancel?token=${signAction(data.id, 'cancel')}`;

  return (
    <AppointmentReceiptPage
      appointment={data as unknown as AppointmentFull}
      shopName={(profile as any)?.name ?? 'بەربەری لوکس'}
      logoUrl={(profile as any)?.logo_url ?? null}
      whatsappNumber={(profile as any)?.whatsapp_number ?? null}
      confirmUrl={confirmUrl}
      cancelUrl={cancelUrl}
    />
  );
}
