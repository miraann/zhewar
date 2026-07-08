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

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('barber_profile')
    .select('face_scan_enabled, facebook_required')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    face_scan_enabled: data?.face_scan_enabled ?? true,
    facebook_required: data?.facebook_required ?? true,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, boolean> = {};

  if ('face_scan_enabled' in body) {
    if (typeof body.face_scan_enabled !== 'boolean')
      return NextResponse.json({ error: 'face_scan_enabled must be boolean' }, { status: 400 });
    patch.face_scan_enabled = body.face_scan_enabled;
  }

  if ('facebook_required' in body) {
    if (typeof body.facebook_required !== 'boolean')
      return NextResponse.json({ error: 'facebook_required must be boolean' }, { status: 400 });
    patch.facebook_required = body.facebook_required;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from('barber_profile')
    .update(patch)
    .not('id', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
