import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAdmins } from '@/lib/firebaseAdmin';

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

  // Fetch all saved admin FCM tokens
  const { data: tokenRows } = await supabase
    .from('admin_fcm_tokens')
    .select('token');

  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);

  // Fire-and-forget push — don't block the response
  if (tokens.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
    sendPushToAdmins(
      tokens,
      'داواکاری نوێ 📅',
      `${customer?.full_name ?? 'کڕیار'} — ${formatDateTime(body.appointment_time)}`,
      { appointmentId: data.id, tab: 'appointments' },
    ).catch(console.error);
  }

  return NextResponse.json(data);
}
