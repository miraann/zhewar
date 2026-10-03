import type { Viewport } from 'next';

// Overrides just the Android status-bar tint for /admin/* — the root
// layout's themeColor (#2563eb) is shared with the customer booking PWA
// and must stay untouched. Matches the new md-surface tone the admin
// header now uses instead of the old white/blue header.
export const viewport: Viewport = {
  themeColor: '#f8fafc',
};

// middleware.ts gives every /admin response a CSP with a fresh nonce, which
// Next.js can only stamp onto its scripts when the page renders per request.
// A prerendered page would carry no nonce, and the CSP would block it.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
