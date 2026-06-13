import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id, action } = params;
  const status = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : null;
  if (!status) return new NextResponse('Invalid action', { status: 400 });

  await supabase.from('appointments').update({ status }).eq('id', id);

  return NextResponse.redirect(new URL('/admin/dashboard?tab=appointments', req.url));
}
