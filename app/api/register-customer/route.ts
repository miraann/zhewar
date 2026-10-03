import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getRequestIp, rateLimitResponse } from '@/lib/rateLimit';
import { customerAccessToken, isCustomerAccessToken } from '@/lib/customerToken';
import { normalizeFacebookId } from '@/lib/facebook';
import { serverError } from '@/lib/apiResponse';

// See lib/customerToken.ts: the first registration for a phone number mints
// an access_token the device keeps. Without it, callers can still book under
// the existing identity — they get its id back — but they can't overwrite
// the record or read anything in it.

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

  // Shown to the admin as a link, so only a real Facebook id or link is kept
  let facebookId: string | null = null;
  if (typeof facebook_id === 'string' && facebook_id.trim()) {
    facebookId = normalizeFacebookId(facebook_id);
    if (!facebookId) return NextResponse.json({ error: 'invalid_facebook_id' }, { status: 400 });
  }

  const limited = rateLimitResponse(await checkRateLimit('register-customer-ip', getRequestIp(req), 15, '10 m'));
  if (limited) return limited;

  const phone = phone_number.trim();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('phone_number', phone)
    .maybeSingle();

  const fields = {
    full_name:    full_name.trim(),
    phone_number: phone,
    photo_url:    typeof photo_url === 'string' && photo_url ? photo_url : null,
    facebook_id:  facebookId,
    notes:        typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 100) : null,
  };

  if (!existing) {
    const { data, error } = await supabase.from('customers').insert(fields).select().single();
    if (error || !data) return serverError('register-customer-insert', error);
    return NextResponse.json({ ...data, access_token: customerAccessToken(phone) });
  }

  if (!isCustomerAccessToken(access_token, phone)) {
    // Unrecognized caller for an existing phone number: just the id, so
    // booking can proceed — no name, photo or notes, and no edits applied.
    return NextResponse.json({ id: existing.id });
  }

  // No photo means the customer chose not to save this face scan (it still
  // goes on the booking itself) — keep the profile photo they already have.
  const { photo_url: newPhoto, ...rest } = fields;
  const { data, error } = await supabase
    .from('customers')
    .update(newPhoto ? fields : rest)
    .eq('id', existing.id)
    .select()
    .single();

  if (error || !data) return serverError('register-customer-update', error);
  return NextResponse.json({ ...data, access_token: customerAccessToken(phone) });
}
