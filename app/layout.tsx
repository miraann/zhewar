import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'بەربەری لوکس | چاکسازی بەرز',
  description: 'نەوبەتەکەت لە چرکەیەکدا وەربگرە. چاکسازی بەرز بۆ پیاوی مۆدێرن.',
  openGraph: {
    title: 'بەربەری لوکس | چاکسازی بەرز',
    description: 'نەوبەتەکەت لە چرکەیەکدا وەربگرە.',
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
    <html lang="ckb" dir="rtl">
      <body className="bg-neutral-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
