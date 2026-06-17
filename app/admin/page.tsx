import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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

export default function AdminLoginPage() {
  const session = cookies().get('admin_session');
  if (session?.value && isValidSession(session.value)) {
    redirect('/admin/dashboard');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div
            className="w-16 h-16 rounded-full p-[3px]"
            style={{
              background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
              animation: 'ringRotate 3.5s linear infinite',
            }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                <path d="M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                <path d="M8.59 8.59L15 15" />
                <path d="M15 9l-6.41 6.41" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">پانێڵی ئەدمین</h1>
            <p className="text-slate-400 text-xs tracking-[0.3em] mt-1"> ژێوار محمد </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
