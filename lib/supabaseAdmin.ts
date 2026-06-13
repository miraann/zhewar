import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

export function getSupabaseAdmin() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _client = createClient(url, key, { auth: { persistSession: false } }) as any;
  }
  return _client!;
}
