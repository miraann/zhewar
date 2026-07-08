import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { full_name, phone_number, photo_url, facebook_id, notes } = body as Record<string, unknown>;

  if (typeof full_name !== 'string' || !full_name.trim()) {
    return NextResponse.json({ error: 'full_name required' }, { status: 400 });
  }
  if (full_name.trim().length > 60) {
    return NextResponse.json({ error: 'full_name too long' }, { status: 400 });
  }
  if (typeof phone_number !== 'string' || !/^\+?[0-9\s\-]{7,20}$/.test(phone_number.trim())) {
    return NextResponse.json({ error: 'invalid phone_number' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('customers')
    .upsert(
      {
        full_name:    full_name.trim(),
        phone_number: phone_number.trim(),
        photo_url:    typeof photo_url === 'string' && photo_url ? photo_url : null,
        facebook_id:  typeof facebook_id === 'string' && facebook_id ? facebook_id : null,
        notes:        typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 100) : null,
      },
      { onConflict: 'phone_number' },
    )
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'db error' }, { status: 500 });
  }

  return NextResponse.json(data);
}
