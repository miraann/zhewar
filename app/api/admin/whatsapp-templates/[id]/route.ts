import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseTemplateFields } from '@/lib/whatsapp';
import { NextRequest, NextResponse } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? '';
  if (!token) return false;
  const cookie = cookies().get('admin_session')?.value ?? '';
  const header = req.headers.get('X-Admin-Token') ?? '';
  return safeEqual(cookie, token) || safeEqual(header, token);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await getSupabaseAdmin()
    .from('whatsapp_templates')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
