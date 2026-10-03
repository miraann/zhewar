import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  // The dashboard's client-side filters only ever show appointments from
  // roughly "yesterday" onward, except the pending tab which shows pending
  // requests of any age — so that's the exact set worth fetching. Without
  // this bound the query (and its payload) grows forever with shop history.
  const recentCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from('appointments')
    .select('id, appointment_time, status, photo_url, created_at, customers(full_name, phone_number, photo_url, facebook_id, notes)')
    .or(`appointment_time.gte.${recentCutoff},status.eq.pending`)
    .order('appointment_time', { ascending: true });

  if (error) return serverError('admin-appointments', error);
  return NextResponse.json(data ?? []);
}
