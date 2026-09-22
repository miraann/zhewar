import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_RANGE_MS = 26 * 60 * 60 * 1000; // one day + DST slack

// Public endpoint used by the booking calendar to grey out already-taken
// slots. Only returns appointment_time + status (no id, no customer_id,
// no PII) for a caller-supplied range, capped to ~1 day so this can't be
// used to dump the whole appointments table.
export async function GET(req: NextRequest) {
  const startParam = req.nextUrl.searchParams.get('start') ?? '';
  const endParam   = req.nextUrl.searchParams.get('end') ?? '';

  const startMs = Date.parse(startParam);
  const endMs   = Date.parse(endParam);

  if (!startParam || !endParam || Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 });
  }
  if (endMs <= startMs || endMs - startMs > MAX_RANGE_MS) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('appointments')
    .select('appointment_time, status')
    .gte('appointment_time', new Date(startMs).toISOString())
    .lte('appointment_time', new Date(endMs).toISOString())
    .neq('status', 'cancelled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
