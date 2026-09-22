import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getRequestIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone } = body as Record<string, unknown>;
  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  // This endpoint discloses a customer's name/photo/appointment history to
  // whoever supplies their phone number, with no OTP available to prove
  // ownership — rate-limit hard, per phone AND per IP, to make scripted
  // enumeration of phone numbers impractical.
  const ip = getRequestIp(req);
  const [byPhone, byIp] = await Promise.all([
    checkRateLimit('my-bookings-phone', phone.trim(), 8, '10 m'),
    checkRateLimit('my-bookings-ip', ip, 20, '10 m'),
  ]);
  const limited = byPhone.limited || byIp.limited;
  if (limited) {
    const secondsLeft = Math.max(byPhone.secondsLeft ?? 0, byIp.secondsLeft ?? 0);
    return NextResponse.json({ error: 'rate_limited', secondsLeft }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_time, status, customers!inner(full_name, phone_number, photo_url)')
    .eq('customers.phone_number', phone.trim())
    .gte('appointment_time', new Date().toISOString())
    .order('appointment_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
