import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getRequestIp } from '@/lib/rateLimit';

// There's no OTP/SMS verification in this app, so phone_number alone can't
// prove ownership. Instead, the FIRST registration for a phone number mints
// an opaque access_token (HMAC of the phone, keyed by a server secret) that
// the client stores locally and must present to modify that record again —
// unauthenticated requests can still book under the existing identity, they
// just can't overwrite it. The token is only ever returned at creation time;
// it is never echoed back on a lookup, or it would stop being a secret.
function customerAccessToken(phoneNumber: string): string {
  return createHmac('sha256', process.env.BOOKING_HMAC_SECRET!)
    .update(`customer_access:${phoneNumber}`)
    .digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { full_name, phone_number, photo_url, facebook_id, notes, access_token } = body as Record<string, unknown>;

  if (typeof full_name !== 'string' || !full_name.trim()) {
    return NextResponse.json({ error: 'full_name required' }, { status: 400 });
  }
  if (full_name.trim().length > 60) {
    return NextResponse.json({ error: 'full_name too long' }, { status: 400 });
  }
  if (typeof phone_number !== 'string' || !/^\+?[0-9\s\-]{7,20}$/.test(phone_number.trim())) {
    return NextResponse.json({ error: 'invalid phone_number' }, { status: 400 });
  }

  const ip = getRequestIp(req);
  const { limited, secondsLeft } = await checkRateLimit('register-customer-ip', ip, 15, '10 m');
  if (limited) {
    return NextResponse.json({ error: 'rate_limited', secondsLeft }, { status: 429 });
  }

  const phone = phone_number.trim();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle();

  const fields = {
    full_name:    full_name.trim(),
    phone_number: phone,
    photo_url:    typeof photo_url === 'string' && photo_url ? photo_url : null,
    facebook_id:  typeof facebook_id === 'string' && facebook_id ? facebook_id : null,
    notes:        typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 100) : null,
  };

  if (!existing) {
    const { data, error } = await supabase.from('customers').insert(fields).select().single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'db error' }, { status: 500 });
    }
    return NextResponse.json({ ...data, access_token: customerAccessToken(phone) });
  }

  const providedToken = typeof access_token === 'string' ? access_token : '';
  const recognized = providedToken && safeEqualHex(providedToken, customerAccessToken(phone));

  if (!recognized) {
    // Unrecognized caller for an existing phone number — hand back the
    // existing record so booking can proceed, but don't apply their edits.
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from('customers')
    .update(fields)
    .eq('id', existing.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'db error' }, { status: 500 });
  }

  return NextResponse.json({ ...data, access_token: customerAccessToken(phone) });
}
