import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { INVALID_URL_MESSAGE, isHttpsUrl, isWebUrl } from '@/lib/urls';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/social — insert a new link
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { title, url, image_url, sort_order } = await req.json().catch(() => ({}));
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  // Shown as links and images on the public home page
  if (!isWebUrl(url) || (image_url && !isHttpsUrl(image_url))) {
    return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('social_links')
    .insert({ title: title ?? '', url: url.trim(), image_url: image_url ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return serverError('admin-social-insert', error);
  return NextResponse.json(data);
}

// PATCH /api/admin/social — reorder (body: { items: [{id, sort_order}] })
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { items } = await req.json().catch(() => ({}));
  if (!Array.isArray(items)) return NextResponse.json({ error: 'items required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await Promise.all(
    (items as { id: string; sort_order: number }[]).map((item) =>
      supabase.from('social_links').update({ sort_order: item.sort_order }).eq('id', item.id)
    )
  );

  return NextResponse.json({ ok: true });
}
