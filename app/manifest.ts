import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, next: { revalidate: 300 } }) } }
  );

  const { data } = await supabase
    .from('barber_profile')
    .select('name, logo_url')
    .single();

  const name    = (data?.name ?? 'Zhewar Barber').trim();
  const iconUrl = data?.logo_url ?? '/icons/icon.svg';

  return {
    name,
    short_name: name,
    description: 'بروانە کاتی سەردانیکردنت — داواکاریت تۆمار بکە',
    start_url:   '/',
    scope:       '/',
    display:     'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color:      '#2563eb',
    icons: [
      { src: iconUrl, sizes: '192x192', type: data?.logo_url ? 'image/png' : 'image/svg+xml' },
      { src: iconUrl, sizes: '512x512', type: data?.logo_url ? 'image/png' : 'image/svg+xml' },
      { src: iconUrl, sizes: '512x512', type: data?.logo_url ? 'image/png' : 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
