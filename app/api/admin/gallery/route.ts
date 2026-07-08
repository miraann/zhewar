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

// POST /api/admin/gallery — insert a new photo
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { photo_url, caption, sort_order } = await req.json();
  if (!photo_url) return NextResponse.json({ error: 'photo_url required' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('gallery_photos')
    .insert({ photo_url, caption: caption ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/gallery — reorder (body: { items: [{id, sort_order}] })
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await Promise.all(
    (items as { id: string; sort_order: number }[]).map((item) =>
      supabase.from('gallery_photos').update({ sort_order: item.sort_order }).eq('id', item.id)
    )
  );

  return NextResponse.json({ ok: true });
}
