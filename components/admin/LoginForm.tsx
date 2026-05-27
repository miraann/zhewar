'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('ووشەی نهێنی هەڵەیە. تکایە دووبارە هەوڵبدەرەوە.');
      setPassword('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password field */}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ووشەی نهێنی ئەدمین بنووسە"
          required
          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl px-5 py-4 text-white placeholder-neutral-600 text-base outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 active:text-white transition-colors touch-manipulation"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !password}
        className={[
          'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base tracking-wide transition-all duration-200 touch-manipulation',
          loading || !password
            ? 'bg-white/[0.05] text-neutral-600 border border-white/[0.07] cursor-not-allowed'
            : 'bg-amber-500 text-neutral-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-[0.98]',
        ].join(' ')}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
        {loading ? 'چوونەژوورەوە...' : 'چوونەژوورەوە'}
      </button>

      <p className="text-center text-neutral-700 text-xs mt-6">
        تەنها دەستگەیشتنی ئەدمین. ووشەی نهێنیت لە{' '}
        <code className="text-neutral-600">.env.local</code>{' '}
        دادەنرێت
      </p>
    </form>
  );
}
