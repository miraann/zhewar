import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { notifyAdmins } from '@/lib/firebaseAdmin';
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

// POST /api/admin/push-test  { token?: string }
// Sends a sample notification with the sound picked in Settings. With
// `token` (the calling phone's FCM token) only that device gets it; without
// one — e.g. from a desktop browser — every registered admin device does.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
