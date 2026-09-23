import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import AdminLoginForm from '@/components/admin/LoginForm';

function isValidSession(value: string): boolean {
  const expected = process.env.ADMIN_TOKEN ?? '';
  try {
    const bufA = Buffer.from(value);
    const bufB = Buffer.from(expected);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch { return false; }
}

export default async function AdminLoginPage() {
  const session = cookies().get('admin_session');
  if (session?.value && isValidSession(session.value)) {
    redirect('/admin/dashboard');
  }

  let logoUrl: string | null = null;
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await db.from('barber_profile').select('logo_url').single();
    logoUrl = data?.logo_url ?? null;
  } catch {}

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden bg-md-surface">

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative w-64 h-64">
            {/* Spinning ring only */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(rgb(var(--md-tertiary)) 0deg,rgb(var(--md-tertiary)) 110deg,rgb(var(--md-surface)) 135deg,rgb(var(--md-primary)) 160deg,rgb(var(--md-primary)) 290deg,rgb(var(--md-surface)) 315deg,rgb(var(--md-tertiary)) 360deg)',
                animation: 'ringRotate 3.5s linear infinite',
              }}
            />
            {/* Static logo — does not rotate */}
            <div className="absolute inset-[5px] rounded-full bg-md-surface-container overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="shop logo"
                  fill
                  sizes="256px"
                  className="object-cover"
                  priority
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="rgb(var(--md-primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  <path d="M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  <path d="M8.59 8.59L15 15" />
                  <path d="M15 9l-6.41 6.41" />
                </svg>
              )}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-md-on-surface">پانێڵی ئەدمین</h1>
            <p className="text-md-on-surface-variant text-xs tracking-[0.3em] mt-1"> ژێوار عزیز </p>
          </div>
        </div>

        <div className="bg-md-surface-container rounded-md-xl shadow-md-2 border border-md-outline-variant p-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
