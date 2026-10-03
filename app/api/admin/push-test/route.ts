import { notifyAdmins } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/push-test  { token?: string }
// Sends a sample notification with the sound picked in Settings. With
// `token` (the calling phone's FCM token) only that device gets it; without
// one — e.g. from a desktop browser — every registered admin device does.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return NextResponse.json({ error: 'FIREBASE_SERVICE_ACCOUNT is not set' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' && body.token ? body.token : undefined;

  try {
    const result = await notifyAdmins(
      'تاقیکردنەوەی ئاگادارکردنەوە 🔔',
      'ئەگەر ئەمە دەبینیت، ئاگادارکردنەوەکان بە باشی کار دەکەن',
      undefined,
      token,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('Test push failed', e);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
