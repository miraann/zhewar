import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

function expectedToken(appointmentId: string, action: string): string {
  return createHmac('sha256', process.env.ADMIN_TOKEN!)
    .update(`${appointmentId}:${action}`)
    .digest('hex');
}

function verifyToken(token: string, appointmentId: string, action: string): boolean {
  try {
    const expected = Buffer.from(expectedToken(appointmentId, action), 'hex');
    const provided  = Buffer.from(token, 'hex');
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const { id, action } = params;

  const status = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : null;
  if (!status) return new NextResponse('Invalid action', { status: 400 });

  if (!verifyToken(token, id, action)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await getSupabaseAdmin().from('appointments').update({ status }).eq('id', id);

  return NextResponse.redirect(new URL('/admin/dashboard?tab=appointments', req.url));
}
