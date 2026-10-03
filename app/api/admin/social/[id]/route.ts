import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { INVALID_URL_MESSAGE, isHttpsUrl, isWebUrl } from '@/lib/urls';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { title, url, image_url } = await req.json().catch(() => ({}));
  // Shown as links and images on the public home page
  if (!isWebUrl(url) || (image_url && !isHttpsUrl(image_url))) {
    return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('social_links')
    .update({ title: title ?? '', url: url.trim(), image_url: image_url ?? null })
    .eq('id', params.id);

  if (error) return serverError('admin-social-update', error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { error } = await getSupabaseAdmin()
    .from('social_links')
    .delete()
    .eq('id', params.id);

  if (error) return serverError('admin-social-delete', error);
  return NextResponse.json({ ok: true });
}
