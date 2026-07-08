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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, url, image_url } = await req.json();
  const { error } = await getSupabaseAdmin()
    .from('social_links')
    .update({ title: title ?? '', url, image_url: image_url ?? null })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await getSupabaseAdmin()
    .from('social_links')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
