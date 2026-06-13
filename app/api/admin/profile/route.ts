import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = cookies().get('admin_session');
  if (!session || session.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...fields } = body;
  const db = getSupabaseAdmin();

  if (id) {
    const { data, error } = await db
      .from('barber_profile')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0)
      return NextResponse.json({ error: 'No rows updated — RLS may be blocking. Check SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  } else {
    const { error } = await db.from('barber_profile').insert(fields).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
