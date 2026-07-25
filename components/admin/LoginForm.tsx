'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2, Clock } from 'lucide-react';

export default function AdminLoginForm() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [show,      setShow]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (countdown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('https://zhewar.shop/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      setLoading(false);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.token) localStorage.setItem('admin_token', data.token);
        window.location.href = '/admin/dashboard';
      } else if (res.status === 429) {
        const data = await res.json();
        startCountdown(data.secondsLeft ?? 60);
        setPassword('');
      } else {
        setError('ووشەی نهێنی هەڵەیە.');
        startCountdown(60);
        setPassword('');
      }
    } catch {
      setLoading(false);
      setError('کێشەی تۆڕ. دووبارە هەوڵبدەرەوە.');
    }
  }

  const isBlocked = countdown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ووشەی نهێنی ئەدمین بنووسە"
          required
          disabled={isBlocked}
          dir="rtl"
          className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 text-base outline-none focus:border-blue-500/60 focus:bg-white transition-all pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-700 transition-colors touch-manipulation"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {isBlocked && (
        <div className="flex items-center justify-center gap-2.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-3 px-4">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            {countdown} چرکەی دیکە چاوەڕوان بە
          </span>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-xl py-3 px-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password || isBlocked}
        className={[
          'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base tracking-wide transition-all duration-200 touch-manipulation',
          loading || !password || isBlocked
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            : 'bg-blue-600 text-white shadow-md shadow-blue-200/60 active:bg-blue-700 active:scale-[0.98]',
        ].join(' ')}
      >
        {loading
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <LogIn className="w-5 h-5" />
        }
        {loading ? 'چوونەژوورەوە...' : 'چوونەژوورەوە'}
      </button>
    </form>
  );
}
