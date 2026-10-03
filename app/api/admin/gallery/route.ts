import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { INVALID_URL_MESSAGE, isHttpsUrl } from '@/lib/urls';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/gallery — insert a new photo
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { photo_url, caption, sort_order } = await req.json().catch(() => ({}));
  if (!photo_url) return NextResponse.json({ error: 'photo_url required' }, { status: 400 });
  if (!isHttpsUrl(photo_url)) return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('gallery_photos')
    .insert({ photo_url, caption: caption ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return serverError('admin-gallery-insert', error);
  return NextResponse.json(data);
}

// PATCH /api/admin/gallery — reorder (body: { items: [{id, sort_order}] })
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { items } = await req.json().catch(() => ({}));
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await Promise.all(
    (items as { id: string; sort_order: number }[]).map((item) =>
      supabase.from('gallery_photos').update({ sort_order: item.sort_order }).eq('id', item.id)
    )
  );

  return NextResponse.json({ ok: true });
}
