import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/fcm-token  { token: string }
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('admin_fcm_tokens')
    .upsert({ token }, { onConflict: 'token' });

  if (error) return serverError('admin-fcm-token', error);
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/fcm-token  { token: string }
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  await getSupabaseAdmin().from('admin_fcm_tokens').delete().eq('token', token);
  return NextResponse.json({ ok: true });
}
