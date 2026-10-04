import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { INVALID_URL_MESSAGE, normalizeHttpsUrl } from '@/lib/urls';
import { NextRequest, NextResponse } from 'next/server';

// The only columns ProfileEditor edits. Anything else in the body — including
// the face_scan_enabled / facebook_required / notification_sound it echoes
// back from its initial load — is ignored; /api/admin/settings owns those.
const TEXT_FIELDS: Record<string, number> = { name: 100, tagline: 300, address: 300, whatsapp_number: 30 };
// Rendered as links and images on the public site
const URL_FIELDS = ['logo_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'maps_url'];

// ProfileEditor uploads logos to this public bucket (/api/admin/upload)
const LOGO_BUCKET = 'uploads';
const LOGO_BASE   =
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${LOGO_BUCKET}/`;

// The logo's file name in our bucket, or null for anything else
function logoPath(url: string | null | undefined): string | null {
  if (!url?.startsWith(LOGO_BASE)) return null;
  const path = url.slice(LOGO_BASE.length).split(/[?#]/)[0];
  return path && !path.includes('/') ? path : null;
}

function pickProfileFields(body: Record<string, unknown>): { fields: Record<string, string | null> } | { error: string } {
  const fields: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(TEXT_FIELDS)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && typeof value !== 'string') return { error: `${key} must be a string` };
    fields[key] = value === null ? null : value.trim().slice(0, max);
  }
  for (const key of URL_FIELDS) {
    if (!(key in body)) continue;
    const url = normalizeHttpsUrl(body[key]);
    if (url === undefined) return { error: INVALID_URL_MESSAGE };
    fields[key] = url;
  }
  return { fields };
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const picked = pickProfileFields(body);
  if ('error' in picked) return NextResponse.json({ error: picked.error }, { status: 400 });
  const { fields } = picked;
  const id = typeof body.id === 'string' ? body.id : null;
  const db = getSupabaseAdmin();

  if (id) {
    // Read first, so the logo this save replaces can be deleted after it
    const { data: before } = 'logo_url' in fields
      ? await db.from('barber_profile').select('logo_url').eq('id', id).maybeSingle()
      : { data: null };

    const { data, error } = await db
      .from('barber_profile')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');

    if (error) return serverError('admin-profile-update', error);
    if (!data || data.length === 0)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });

    // A replaced or removed logo would otherwise stay in the bucket forever.
    // Compared by file name, so an unchanged URL is never deleted.
    const oldLogo = logoPath((before as { logo_url: string | null } | null)?.logo_url);
    if (oldLogo && oldLogo !== logoPath(fields.logo_url)) {
      const { error: removeError } = await db.storage.from(LOGO_BUCKET).remove([oldLogo]);
      // The save itself succeeded; a leftover file is only wasted space
      if (removeError) console.error('[admin-profile] old logo remove failed', removeError.message);
    }
  } else {
    const { error } = await db.from('barber_profile').insert(fields).select().single();
    if (error) return serverError('admin-profile-insert', error);
  }

  return NextResponse.json({ ok: true });
}
