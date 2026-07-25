import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': 'capacitor://localhost',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function isAdmin(req: NextRequest): boolean {
  const token  = process.env.ADMIN_TOKEN ?? '';
  if (!token) return false;
  const cookie = cookies().get('admin_session')?.value ?? '';
  const header = req.headers.get('X-Admin-Token') ?? '';
  const bufT = Buffer.from(token);
  function check(v: string) {
    const b = Buffer.from(v);
    return b.length === bufT.length && timingSafeEqual(b, bufT);
  }
  return check(cookie) || check(header);
}

// POST /api/admin/fcm-token  { token: string }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('admin_fcm_tokens')
    .upsert({ token }, { onConflict: 'token' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/fcm-token  { token: string }
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  await getSupabaseAdmin().from('admin_fcm_tokens').delete().eq('token', token);
  return NextResponse.json({ ok: true });
}
