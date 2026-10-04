// One-off cleanup of the public uploads, social_posts and gallery_photos
// buckets: deletes every file nothing in the database points at — replaced
// logos, early gallery/social images, and the May–June customer-* face
// scans saved before customer_photos existed. customer_photos itself is
// left to the daily cron (app/api/cron/cleanup-photos).
//
// Dry run by default — lists what would go. Run from the repo root:
//   node scripts/cleanup-orphan-storage.mts            # dry run
//   node scripts/cleanup-orphan-storage.mts --apply    # delete
//
// Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
// .env.local. Storage files can only be deleted through the Storage API,
// not SQL, hence the service-role client.
//
// A file counts as in use when its bucket path appears anywhere in a row of
// TABLES — so a link in a WhatsApp template or a social card's target is
// respected too, not just the image columns. Files younger than MIN_AGE are
// skipped, so an image being uploaded right now isn't caught before its row
// is saved.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKETS    = ['uploads', 'social_posts', 'gallery_photos'] as const;
const TABLES     = ['barber_profile', 'gallery_photos', 'social_links', 'whatsapp_templates', 'customers', 'appointments'] as const;
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
// Storage list/remove and PostgREST selects all cap out around 1000
const PAGE       = 1000;

type Bucket     = (typeof BUCKETS)[number];
type StoredFile = { bucket: Bucket; name: string; bytes: number; createdAt: string | null };

async function listBucket(supabase: SupabaseClient, bucket: Bucket): Promise<StoredFile[]> {
  const files: StoredFile[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit:  PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    for (const f of data) {
      // Folder entries have no id; every bucket here is flat
      if (!f.id) continue;
      const size = (f.metadata as { size?: number } | null)?.size ?? 0;
      files.push({ bucket, name: f.name, bytes: size, createdAt: f.created_at });
    }
    if (data.length < PAGE) return files;
  }
}

// Every row of TABLES as one string, searched for each file's path
async function readReferences(supabase: SupabaseClient): Promise<string> {
  const chunks: string[] = [];
  for (const table of TABLES) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
      if (error) throw new Error(`read ${table}: ${error.message}`);
      const rows = data as unknown[];
      for (const row of rows) chunks.push(JSON.stringify(row));
      if (rows.length < PAGE) break;
    }
  }
  return chunks.join('\n');
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString('en')} KB`;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  process.loadEnvFile(new URL('../.env.local', import.meta.url));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const files: StoredFile[] = [];
  for (const bucket of BUCKETS) files.push(...(await listBucket(supabase, bucket)));

  // Read after listing, so a row saved meanwhile still protects its file
  const references = await readReferences(supabase);
  const inUse      = (f: StoredFile): boolean => references.includes(`/${f.bucket}/${f.name}`);

  // Nothing in use at all means the tables came back empty (wrong project,
  // missing grant) — deleting on that basis would wipe the live images
  if (!files.some(inUse)) throw new Error('No file is referenced by the database — refusing to continue');

  const cutoff  = Date.now() - MIN_AGE_MS;
  // A file with no upload time is kept, since its age can't be checked
  const orphans = files.filter((f) => !inUse(f) && f.createdAt !== null && Date.parse(f.createdAt) < cutoff);

  for (const bucket of BUCKETS) {
    const inBucket = files.filter((f) => f.bucket === bucket);
    const gone     = orphans.filter((f) => f.bucket === bucket);
    console.log(`\n${bucket}: ${inBucket.length} files, ${gone.length} unused (${kb(gone.reduce((s, f) => s + f.bytes, 0))})`);
    for (const f of gone) console.log(`  ${(f.createdAt ?? '').slice(0, 10)}  ${kb(f.bytes).padStart(9)}  ${f.name}`);
  }
  const total = orphans.reduce((s, f) => s + f.bytes, 0);
  console.log(`\nTotal: ${orphans.length} unused files, ${(total / 1024 / 1024).toFixed(1)} MB`);

  if (!apply) {
    console.log('\nDry run — nothing deleted. Re-run with --apply to delete these files.');
    return;
  }

  for (const bucket of BUCKETS) {
    const names = orphans.filter((f) => f.bucket === bucket).map((f) => f.name);
    for (let i = 0; i < names.length; i += PAGE) {
      const { error } = await supabase.storage.from(bucket).remove(names.slice(i, i + PAGE));
      if (error) throw new Error(`remove ${bucket}: ${error.message}`);
    }
    if (names.length) console.log(`Deleted ${names.length} from ${bucket}`);
  }
}

main().catch((e: unknown) => {
  console.error(`\nFailed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
