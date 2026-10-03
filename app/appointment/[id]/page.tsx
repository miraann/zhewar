import AppointmentReceiptPage from '@/components/booking/AppointmentReceiptPage';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import type { AppointmentFull } from '@/lib/types';

export const dynamic = 'force-dynamic';

// This page is public to anyone holding the link. Everything passed to
// AppointmentReceiptPage (a client component) is serialized into the HTML,
// whether the component uses it or not — so never pass it anything secret.
export default async function AppointmentPage({ params }: { params: { id: string } }) {
  // Service role required — anon SELECT is blocked on customers table for privacy
  const supabase = getSupabaseAdmin();

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, appointment_time, status, photo_url, created_at,
        customers(full_name, phone_number, photo_url, facebook_id)
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('barber_profile').select('name, logo_url').single(),
  ]);

  if (!data) notFound();

  return (
    <AppointmentReceiptPage
      appointment={data as unknown as AppointmentFull}
      shopName={(profile as any)?.name ?? 'ژێوار عزیز'}
      logoUrl={(profile as any)?.logo_url ?? null}
    />
  );
}
