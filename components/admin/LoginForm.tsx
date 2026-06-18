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
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ووشەی نهێنی ئەدمین بنووسە"
          required
          dir="rtl"
          className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 text-base outline-none focus:border-blue-500/60 focus:bg-white transition-all pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-700 transition-colors touch-manipulation"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-xl py-3 px-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className={[
          'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base tracking-wide transition-all duration-200 touch-manipulation',
          loading || !password
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            : 'bg-blue-600 text-white shadow-md shadow-blue-200/60 active:bg-blue-700 active:scale-[0.98]',
        ].join(' ')}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
        {loading ? 'چوونەژوورەوە...' : 'چوونەژوورەوە'}
      </button>

    </form>
  );
}
