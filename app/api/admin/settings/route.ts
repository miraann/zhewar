import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_NOTIFICATION_SOUND, isNotificationSound } from '@/lib/notificationSounds';
import { NextRequest, NextResponse } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? '';
  if (!token) return false;
  const cookie = cookies().get('admin_session')?.value ?? '';
  const header = req.headers.get('X-Admin-Token') ?? '';
  return safeEqual(cookie, token) || safeEqual(header, token);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('barber_profile')
    // `*` rather than a column list so a not-yet-migrated column (e.g.
    // notification_sound) falls back to its default instead of failing
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    face_scan_enabled: data?.face_scan_enabled ?? true,
    facebook_required: data?.facebook_required ?? true,
    notification_sound: isNotificationSound(data?.notification_sound) ? data.notification_sound : DEFAULT_NOTIFICATION_SOUND,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, boolean | string> = {};

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

  if ('notification_sound' in body) {
    if (!isNotificationSound(body.notification_sound))
      return NextResponse.json({ error: 'Unknown notification_sound' }, { status: 400 });
    patch.notification_sound = body.notification_sound;
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
