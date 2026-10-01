import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { notifyAdmins } from '@/lib/firebaseAdmin';

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

  // Insert appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_id:      body.customer_id,
      appointment_time: body.appointment_time,
      status:           'pending',
    })
    .select()
    .single();

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
