import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isFaceScanPath } from '@/lib/faceScans';

// Deletes face scans from the customer_photos bucket once nothing uses
// them, to keep Storage small. Customers and appointments are deleted 3
// days after the visit (supabase/migrations/2026-10-01_visit_retention.sql),
// which leaves their photos behind — this removes those, plus scans that
// were uploaded but never booked with.
//
// A file goes when it's more than RETENTION_DAYS old AND no remaining
// customers.photo_url / appointments.photo_url points at it, so the photo
// for a booking weeks ahead stays until that booking is deleted. The age
// check spares a scan uploaded mid-registration, before its row exists.
//
// Run daily by Vercel Cron (vercel.json), which sends
// `Authorization: Bearer <CRON_SECRET>`.

const BUCKET         = 'customer_photos';
const RETENTION_DAYS = 3;
// Storage list/remove and PostgREST selects all cap out around 1000
const PAGE           = 1000;

function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Hashed first so timingSafeEqual always compares equal lengths
  const a = createHash('sha256').update(req.headers.get('authorization') ?? '').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

// Looser than faceScanPath on purpose: a URL on any host still counts as
// in use, since a missed reference would delete a photo that's shown.
function bucketPath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length).split(/[?#]/)[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addReferencedPaths(supabase: any, table: 'customers' | 'appointments', into: Set<string>) {
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('photo_url')
      .not('photo_url', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of data as { photo_url: string }[]) {
      const path = bucketPath(row.photo_url);
      if (path) into.add(path);
    }
    if (data.length < PAGE) return;
  }
}

export async function GET(req: NextRequest) {
  if (!isCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const cutoff   = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // Oldest first, so paging can stop at the first file that's too new
  const old: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit:  PAGE,
      offset,
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (error) {
      console.error('[cleanup-photos] list failed', error.message);
      return NextResponse.json({ error: 'list_failed' }, { status: 500 });
    }
    const files = data as { name: string; created_at: string | null }[];
    const fresh = files.findIndex((f) => f.created_at && Date.parse(f.created_at) >= cutoff);
    for (const f of fresh === -1 ? files : files.slice(0, fresh)) {
      if (isFaceScanPath(f.name)) old.push(f.name);
    }
    if (fresh !== -1 || files.length < PAGE) break;
  }

  if (!old.length) return NextResponse.json({ deleted: 0 });

  // Read after listing, so a booking made meanwhile still protects its photo
  const inUse = new Set<string>();
  try {
    await addReferencedPaths(supabase, 'customers', inUse);
    await addReferencedPaths(supabase, 'appointments', inUse);
  } catch (e) {
    console.error('[cleanup-photos] reference query failed', (e as Error).message);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const unused = old.filter((p) => !inUse.has(p));
  for (let i = 0; i < unused.length; i += PAGE) {
    const { error } = await supabase.storage.from(BUCKET).remove(unused.slice(i, i + PAGE));
    if (error) {
      console.error('[cleanup-photos] remove failed', error.message);
      return NextResponse.json({ error: 'remove_failed', deleted: i }, { status: 500 });
    }
  }

  return NextResponse.json({ deleted: unused.length });
}
