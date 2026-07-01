import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const VALID_STATUSES = new Set(['confirmed', 'cancelled', 'pending']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = cookies().get('admin_session');
  if (!session?.value || !safeEqual(session.value, process.env.ADMIN_TOKEN ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { status } = await req.json();
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('appointments')
    .update({ status })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
