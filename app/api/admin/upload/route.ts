import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminSession';
import { serverError, unauthorized } from '@/lib/apiResponse';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_BUCKETS = new Set(['gallery_photos', 'social_posts', 'uploads']);
const MAX_BYTES = 5 * 1024 * 1024;

// The buckets are public and serve files with the type given here, so only
// images go in — never HTML or SVG, which a browser would run as a page.
// The extension comes from the type, never from the uploaded file's name.
const IMAGE_TYPES: Record<string, { ext: string; matches: (b: Uint8Array) => boolean }> = {
  'image/jpeg': { ext: 'jpg',  matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png':  { ext: 'png',  matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  // "RIFF" .... "WEBP"
  'image/webp': { ext: 'webp', matches: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
};
// Shown as-is by the admin editors
const INVALID_FILE = 'تەنها وێنەی JPG، PNG یان WEBP تا ٥MB';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  const form   = await req.formData().catch(() => null);
  const file   = form?.get('file');
  const bucket = (form?.get('bucket') as string | null) ?? 'gallery_photos';

  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });

  const type = IMAGE_TYPES[file.type];
  if (!type || file.size > MAX_BYTES) return NextResponse.json({ error: INVALID_FILE }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The declared type must match the file's actual signature
  if (!type.matches(bytes)) return NextResponse.json({ error: INVALID_FILE }, { status: 400 });

  const path = `${bucket}-${Date.now()}-${crypto.randomUUID()}.${type.ext}`;

  const { error } = await getSupabaseAdmin()
    .storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) return serverError('admin-upload', error);

  const { data } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
