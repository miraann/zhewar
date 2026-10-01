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

// GET /api/admin/whatsapp-templates — every template, in send-sheet order
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('whatsapp_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/whatsapp-templates — add a template at the end of its kind
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/whatsapp-templates — reorder one kind's templates
// (body: { ids: string[] } in their new top-to-bottom order)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
