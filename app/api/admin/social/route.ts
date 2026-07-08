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

// POST /api/admin/social — insert a new link
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, url, image_url, sort_order } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('social_links')
    .insert({ title: title ?? '', url, image_url: image_url ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/social — reorder (body: { items: [{id, sort_order}] })
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await Promise.all(
    (items as { id: string; sort_order: number }[]).map((item) =>
      supabase.from('social_links').update({ sort_order: item.sort_order }).eq('id', item.id)
    )
  );

  return NextResponse.json({ ok: true });
}
