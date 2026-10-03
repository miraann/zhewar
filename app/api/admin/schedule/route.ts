import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  let days: unknown[];
  try { days = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(days)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const results  = await Promise.all(
    (days as { day_of_week: number; is_active: boolean; start_time: string; end_time: string; slot_interval: number }[])
      .map((d) =>
        supabase.from('working_schedule').update({
          is_active:     d.is_active,
          start_time:    d.start_time,
          end_time:      d.end_time,
          slot_interval: d.slot_interval,
        }).eq('day_of_week', d.day_of_week)
      )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return serverError('admin-schedule', failed.error);

  return NextResponse.json({ ok: true });
}
