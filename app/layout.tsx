import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Luxe Barber | Premium Grooming',
  description:
    'Book your premium barber experience in seconds. Luxury grooming for the modern gentleman.',
  openGraph: {
    title: 'Luxe Barber | Premium Grooming',
    description: 'Book your premium barber appointment instantly.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-neutral-950 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
