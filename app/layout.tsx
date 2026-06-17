import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { createClient } from '@supabase/supabase-js';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

async function getProfile() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: (url, opts) => fetch(url, { ...opts, next: { revalidate: 300 } }) } }
    );
    const { data } = await supabase
      .from('barber_profile')
      .select('name, logo_url')
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const shopName = profile?.name ?? 'Luxe Barber';
  const logoUrl  = profile?.logo_url ?? null;

  return {
    title:       `${shopName} | Zhewar Muhamad`,
    description: 'Book your premium barber experience in seconds. Luxury grooming for the modern gentleman.',
    icons: logoUrl
      ? { icon: logoUrl, apple: logoUrl, shortcut: logoUrl }
      : undefined,
    openGraph: {
      title:       `${shopName} | Zhewar Muhamad`,
      description: 'Book your premium barber appointment instantly.',
      type:        'website',
      images:      logoUrl
        ? [{ url: logoUrl, width: 400, height: 400, alt: shopName }]
        : undefined,
    },
    twitter: {
      card:   'summary',
      title:  `${shopName} | Zhewar Muhamad`,
      images: logoUrl ? [logoUrl] : undefined,
    },
  };
}

export const viewport: Viewport = {
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
  themeColor:    '#ffffff',
  viewportFit:   'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ckb" className={inter.variable} suppressHydrationWarning>
      <body className="text-neutral-900 antialiased min-h-screen bg-white" suppressHydrationWarning>
        {/* ── Global background ── */}
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-neutral-50" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent 0px, transparent 24px, #ef4444 24px, #ef4444 38px, transparent 38px, transparent 62px, #3b82f6 62px, #3b82f6 76px, transparent 76px, transparent 100px)',
              backgroundSize: '141px 141px',
              opacity: 0.045,
              animation: 'stripeScroll 22s linear infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes stripeScroll { from { background-position: 0 0; } to { background-position: 141px 141px; } }
          @keyframes ringRotate   { from { transform: rotate(0deg); }  to { transform: rotate(360deg); } }
        `}</style>
        {children}
      </body>
    </html>
  );
}
