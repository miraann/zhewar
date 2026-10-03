import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getRequestIp, rateLimitResponse } from '@/lib/rateLimit';
import { faceScanUrl, newFaceScanPath } from '@/lib/faceScans';

// Face scans are uploaded through here with the service-role key rather
// than straight from the browser, so the customer_photos bucket needs no
// anon INSERT policy. The client already shrinks scans to ~240px JPEGs.
const MAX_BYTES = 300 * 1024;

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(await checkRateLimit('upload-face-scan-ip', getRequestIp(req), 20, '10 m'));
  if (limited) return limited;

  const bytes = new Uint8Array(await req.arrayBuffer());
  // JPEG files start with FF D8 FF
  if (bytes.length < 4 || bytes.length > MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  }

  const path = newFaceScanPath();
  const { error } = await getSupabaseAdmin()
    .storage
    .from('customer_photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (error) {
    console.error('[upload-face-scan] upload failed', error.message);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  return NextResponse.json({ path, url: faceScanUrl(path) });
}
