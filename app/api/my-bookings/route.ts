import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getRequestIp, mergeRateLimits, rateLimitResponse } from '@/lib/rateLimit';
import { isCustomerAccessToken } from '@/lib/customerToken';
import { serverError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, access_token } = body as Record<string, unknown>;
  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  // Rate-limit hard, per phone AND per IP, to make scripted guessing
  // impractical.
  const ip = getRequestIp(req);
  const limited = rateLimitResponse(mergeRateLimits(
    await checkRateLimit('my-bookings-phone', phone.trim(), 8, '10 m'),
    await checkRateLimit('my-bookings-ip', ip, 20, '10 m'),
  ));
  if (limited) return limited;

  // A customer's name, face photo and bookings go only to a device holding
  // the access token minted when that phone number registered (stored as
  // luxe_customer_token) — a phone number alone is easy to know or guess.
  if (!isCustomerAccessToken(access_token, phone.trim())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('appointments')
    .select('id, appointment_time, status, photo_url, customers!inner(full_name, phone_number, photo_url)')
    .eq('customers.phone_number', phone.trim())
    .gte('appointment_time', new Date().toISOString())
    .order('appointment_time', { ascending: true });

  if (error) return serverError('my-bookings', error);
  return NextResponse.json(data ?? []);
}
