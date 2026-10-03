import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { INVALID_URL_MESSAGE, isHttpsUrl } from '@/lib/urls';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { photo_url, caption } = await req.json().catch(() => ({}));
  if (photo_url !== undefined && !isHttpsUrl(photo_url)) {
    return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('gallery_photos')
    .update({ photo_url, caption: caption ?? null })
    .eq('id', params.id);

  if (error) return serverError('admin-gallery-update', error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { error } = await getSupabaseAdmin()
    .from('gallery_photos')
    .delete()
    .eq('id', params.id);

  if (error) return serverError('admin-gallery-delete', error);
  return NextResponse.json({ ok: true });
}
