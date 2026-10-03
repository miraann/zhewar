import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { parseTemplateFields } from '@/lib/whatsapp';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const fields = parseTemplateFields(await req.json().catch(() => null));
  if (!fields) return NextResponse.json({ error: 'kind, title and body required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from('whatsapp_templates')
    .select('kind')
    .eq('id', params.id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Moving to the other kind puts it at the end of that list, so it doesn't
  // silently take over as that kind's default (first) message.
  const patch: Record<string, unknown> = { ...fields };
  if (current.kind !== fields.kind) {
    const { data: last } = await supabase
      .from('whatsapp_templates')
      .select('sort_order')
      .eq('kind', fields.kind)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    patch.sort_order = (last?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return serverError('admin-wa-template-update', error);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { error } = await getSupabaseAdmin()
    .from('whatsapp_templates')
    .delete()
    .eq('id', params.id);

  if (error) return serverError('admin-wa-template-delete', error);
  return NextResponse.json({ ok: true });
}
