import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isFaceScanPath } from '@/lib/faceScans';

// Daily cleanup, run by Vercel Cron (vercel.json), which sends
// `Authorization: Bearer <CRON_SECRET>`.
//
// 1. Face scans. Customers and appointments are deleted 3 days after the
//    visit (supabase/migrations/2026-10-01_visit_retention.sql), which leaves
//    their photos behind — this removes those, plus scans that were uploaded
//    but never booked with. A file goes when it's more than RETENTION_DAYS
//    old AND no remaining customers.photo_url / appointments.photo_url points
//    at it, so the photo for a booking weeks ahead stays until that booking
//    is deleted. The age check spares a scan uploaded mid-registration,
//    before its row exists.
//
// 2. pg_cron's run log, trimmed to 7 days by purge_cron_history()
//    (supabase/migrations/2026-10-04_purge_cron_history.sql).
//
// The steps run independently: one failing doesn't skip the other.

type Target = {
  bucket:     string;
  isFaceScan: (name: string) => boolean;
};

const TARGETS: readonly Target[] = [
  { bucket: 'customer_photos', isFaceScan: isFaceScanPath },
  // Scans from before customer_photos existed. Nothing saves customer-*
  // files here any more; the logos and images that share the bucket are
  // never touched.
  { bucket: 'uploads', isFaceScan: (name) => name.startsWith('customer-') },
];

const RETENTION_DAYS = 3;
// Storage list/remove and PostgREST selects all cap out around 1000
const PAGE           = 1000;

type Deleted = Record<string, number>;

type CleanupResult = {
  deleted:          Deleted | null;
  cron_runs_purged: number | null;
  errors?:          ('face_scans_failed' | 'cron_history_failed')[];
};

function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Hashed first so timingSafeEqual always compares equal lengths
  const a = createHash('sha256').update(req.headers.get('authorization') ?? '').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Looser than faceScanPath on purpose: a URL on any host still counts as
// in use, since a missed reference would delete a photo that's shown.
function bucketPath(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length).split(/[?#]/)[0];
}

async function listOldScans(supabase: SupabaseClient, { bucket, isFaceScan }: Target, cutoff: number): Promise<string[]> {
  const old: string[] = [];
  // Oldest first, so paging can stop at the first file that's too new
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit:  PAGE,
      offset,
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    const fresh = data.findIndex((f) => f.created_at && Date.parse(f.created_at) >= cutoff);
    for (const f of fresh === -1 ? data : data.slice(0, fresh)) {
      if (isFaceScan(f.name)) old.push(f.name);
    }
    if (fresh !== -1 || data.length < PAGE) return old;
  }
}

// Adds "bucket/path" for every target-bucket file the table's photo_url uses
async function addReferencedPaths(supabase: SupabaseClient, table: 'customers' | 'appointments', into: Set<string>): Promise<void> {
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('photo_url')
      .not('photo_url', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data as { photo_url: string }[];
    for (const { photo_url } of rows) {
      for (const { bucket } of TARGETS) {
        const path = bucketPath(photo_url, bucket);
        if (path) into.add(`${bucket}/${path}`);
      }
    }
    if (rows.length < PAGE) return;
  }
}

async function deleteUnusedFaceScans(supabase: SupabaseClient): Promise<Deleted> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const old    = await Promise.all(TARGETS.map(async (t) => ({
    bucket: t.bucket,
    paths:  await listOldScans(supabase, t, cutoff),
  })));

  const deleted: Deleted = Object.fromEntries(TARGETS.map(({ bucket }) => [bucket, 0]));
  if (old.every(({ paths }) => paths.length === 0)) return deleted;

  // Read after listing, so a booking made meanwhile still protects its photo
  const inUse = new Set<string>();
  await addReferencedPaths(supabase, 'customers', inUse);
  await addReferencedPaths(supabase, 'appointments', inUse);

  for (const { bucket, paths } of old) {
    const unused = paths.filter((path) => !inUse.has(`${bucket}/${path}`));
    for (let j = 0; j < unused.length; j += PAGE) {
      const { error } = await supabase.storage.from(bucket).remove(unused.slice(j, j + PAGE));
      if (error) throw new Error(`remove ${bucket} (${deleted[bucket]} already removed): ${error.message}`);
      deleted[bucket] += Math.min(PAGE, unused.length - j);
    }
  }
  return deleted;
}

async function purgeCronHistory(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('purge_cron_history');
  if (error) throw new Error(error.message);
  return data as number;
}

export async function GET(req: NextRequest) {
  if (!isCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase: SupabaseClient = getSupabaseAdmin();
  const result: CleanupResult    = { deleted: null, cron_runs_purged: null };
  const errors: NonNullable<CleanupResult['errors']> = [];

  try {
    result.deleted = await deleteUnusedFaceScans(supabase);
  } catch (e) {
    console.error('[cleanup-photos] face scans failed', message(e));
    errors.push('face_scans_failed');
  }

  try {
    result.cron_runs_purged = await purgeCronHistory(supabase);
  } catch (e) {
    console.error('[cleanup-photos] cron history failed', message(e));
    errors.push('cron_history_failed');
  }

  if (errors.length) result.errors = errors;
  return NextResponse.json(result, { status: errors.length ? 500 : 200 });
}
