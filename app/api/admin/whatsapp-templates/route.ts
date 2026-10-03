import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { parseTemplateFields } from '@/lib/whatsapp';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/whatsapp-templates — every template, in send-sheet order
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { data, error } = await getSupabaseAdmin()
    .from('whatsapp_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return serverError('admin-wa-templates-read', error);
  return NextResponse.json(data ?? []);
}

// POST /api/admin/whatsapp-templates — add a template at the end of its kind
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const fields = parseTemplateFields(await req.json().catch(() => null));
  if (!fields) return NextResponse.json({ error: 'kind, title and body required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase
    .from('whatsapp_templates')
    .select('sort_order')
    .eq('kind', fields.kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({ ...fields, sort_order: (last?.sort_order ?? -1) + 1 })
    .select()
    .single();

  if (error) return serverError('admin-wa-templates-insert', error);
  return NextResponse.json(data);
}

// PATCH /api/admin/whatsapp-templates — reorder one kind's templates
// (body: { ids: string[] } in their new top-to-bottom order)
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    (ids as string[]).map((id, index) =>
      supabase.from('whatsapp_templates').update({ sort_order: index }).eq('id', id)
    )
  );
  const failed = results.find((r: { error: unknown }) => r.error);
  if (failed) return NextResponse.json({ error: 'Reorder failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
