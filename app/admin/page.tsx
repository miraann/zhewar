import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/LoginForm';
import { Scissors } from 'lucide-react';

export default function AdminLoginPage() {
  const session = cookies().get('admin_session');
  if (session?.value && session.value === process.env.ADMIN_TOKEN) {
    redirect('/admin/dashboard');
  }

  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(245,158,11,0.07)_0%,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border border-amber-500/40 bg-amber-500/[0.08] flex items-center justify-center">
              <Scissors className="w-7 h-7 text-amber-500" />
            </div>
            <div className="absolute -inset-1.5 rounded-full border border-amber-500/15 animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-white">پانێڵی ئەدمین</h1>
            <p className="text-neutral-500 text-xs tracking-[0.3em] mt-1">بەربەری لوکس</p>
          </div>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
