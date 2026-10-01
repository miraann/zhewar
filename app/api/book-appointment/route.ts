import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { notifyAdmins } from '@/lib/firebaseAdmin';
import { faceScanPath } from '@/lib/faceScans';

const KURDISH_DAYS = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day  = KURDISH_DAYS[d.getDay()];
  const date = d.getDate();
  const mon  = d.getMonth() + 1;
  const h    = String(d.getHours()).padStart(2, '0');
  const m    = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${date}/${mon} — ${h}:${m}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.customer_id || !body?.appointment_time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // The face scan taken for this booking. It's stored on the appointment,
  // not the customer, because a second phone can book under an existing
  // phone number without being allowed to overwrite that customer's
  // profile — so customers.photo_url may show someone else's older scan.
  // Only our own bucket is accepted (the CSP blocks any other image host).
  const photoUrl =
    typeof body.photo_url === 'string' && faceScanPath(body.photo_url) ? body.photo_url : null;

  // With face scan on, every booking needs its own new scan: one no other
  // booking has used. Defaults to on, like app/book/page.tsx.
  const { data: profile } = await supabase
    .from('barber_profile')
    .select('face_scan_enabled')
    .single();
  if (profile?.face_scan_enabled !== false) {
    const { count } = photoUrl
      ? await supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('photo_url', photoUrl)
      : { count: null };
    if (!photoUrl || count) {
      return NextResponse.json({ error: 'face_scan_required' }, { status: 400 });
    }
  }

  // Insert appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_id:      body.customer_id,
      appointment_time: body.appointment_time,
      status:           'pending',
      photo_url:        photoUrl,
    })
    .select()
    .single();

  // 23503 = foreign key violation: the customer row is gone (deleted 3 days
  // after their last visit, see migrations/2026-10-01_visit_retention.sql).
  // BookingFlow registers the device's cached customer again and retries.
  if (error?.code === '23503') {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch customer name for the notification
  const { data: customer } = await supabase
    .from('customers')
    .select('full_name')
    .eq('id', body.customer_id)
    .single();

  // Push without blocking the response. Vercel freezes the function as soon
  // as the response is sent, so an un-awaited send would stall mid-flight and
  // only go out when a later request (e.g. the admin opening the app) thaws
  // the same instance — waitUntil keeps it running until the send settles.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set — skipping admin push notification');
  } else {
    waitUntil(
      notifyAdmins(
        'داواکاری نوێ 📅',
        `${customer?.full_name ?? 'کڕیار'} — ${formatDateTime(body.appointment_time)}`,
        { appointmentId: data.id, tab: 'appointments' },
      )
        .then(({ total }) => {
          if (!total) console.warn('No admin_fcm_tokens registered — skipping admin push notification');
        })
        .catch(console.error),
    );
  }

  return NextResponse.json(data);
}
