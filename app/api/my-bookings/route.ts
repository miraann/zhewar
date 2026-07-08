import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone } = body as Record<string, unknown>;
  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
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
