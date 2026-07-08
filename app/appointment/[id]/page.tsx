import { createHmac } from 'crypto';
import AppointmentReceiptPage from '@/components/booking/AppointmentReceiptPage';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { AppointmentFull } from '@/lib/types';

function signAction(appointmentId: string, action: string): string {
  const secret = process.env.BOOKING_HMAC_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret)
    .update(`${appointmentId}:${action}`)
    .digest('hex');
}

export const dynamic = 'force-dynamic';

export default async function AppointmentPage({ params }: { params: { id: string } }) {
  // Service role required — anon SELECT is blocked on customers table for privacy
  const supabase = getSupabaseAdmin();

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, appointment_time, status, created_at,
        customers(full_name, phone_number, photo_url, facebook_id)
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('barber_profile').select('name, logo_url').single(),
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
      shopName={(profile as any)?.name ?? 'ژێوار محمد '}
      logoUrl={(profile as any)?.logo_url ?? null}
      confirmUrl={confirmUrl}
      cancelUrl={cancelUrl}
    />
  );
}
