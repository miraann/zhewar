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

function isAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? '';
  if (!token) return false;
  const cookie = cookies().get('admin_session')?.value ?? '';
  const header = req.headers.get('X-Admin-Token') ?? '';
  return safeEqual(cookie, token) || safeEqual(header, token);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('appointments')
    .select('id, appointment_time, status, created_at, customers(full_name, phone_number, photo_url, facebook_id, notes)')
    .order('appointment_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
