import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_CUSTOMERS = 1000;

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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
    .in('id', oldest.map(r => r.id));

  return NextResponse.json({ deleted: oldest.length });
}
