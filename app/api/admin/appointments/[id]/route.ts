import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = new Set(['confirmed', 'cancelled', 'pending']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { status } = await req.json().catch(() => ({}));
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('appointments')
    .update({ status })
    .eq('id', params.id);

  if (error) return serverError('admin-appointment-update', error);
  return NextResponse.json({ ok: true });
}
