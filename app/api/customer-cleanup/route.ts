import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { unauthorized } from '@/lib/apiResponse';

const MAX_CUSTOMERS = 1000;

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  if (!count || count <= MAX_CUSTOMERS) {
    return NextResponse.json({ deleted: 0 });
  }

  const excess = count - MAX_CUSTOMERS;

  const { data: oldest } = await supabase
    .from('customers')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(excess);

  if (!oldest?.length) return NextResponse.json({ deleted: 0 });

  await supabase
    .from('customers')
    .delete()
    .in('id', oldest.map((r: { id: string }) => r.id));

  return NextResponse.json({ deleted: oldest.length });
}
