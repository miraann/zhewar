import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

function isAdmin(): boolean {
  const session = cookies().get('admin_session');
  const token   = process.env.ADMIN_TOKEN ?? '';
  if (!session?.value || !token) return false;
  const bufA = Buffer.from(session.value);
  const bufB = Buffer.from(token);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function PUT(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let days: unknown[];
  try { days = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

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
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
