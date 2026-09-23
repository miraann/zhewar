'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2, Clock } from 'lucide-react';
import Button from './ui/Button';

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
      // Capacitor WebView uses capacitor://localhost as its JS origin, making
      // /api/admin/login cross-origin. We need an absolute URL + credentials:include
      // so the Set-Cookie is stored. On a regular browser the request is same-origin
      // and works fine with a relative URL and the default credentials mode.
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const res = await fetch(
        isCapacitor ? 'https://zhewar.shop/api/admin/login' : '/api/admin/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
          ...(isCapacitor ? { credentials: 'include' } : {}),
        },
      );

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
          dir="ltr"
          className="w-full h-14 bg-md-surface border border-md-outline rounded-md-sm ps-12 pe-5 py-4 text-md-on-surface placeholder-md-on-surface-variant/60 text-base outline-none focus:border-md-primary focus:border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute start-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant active:text-md-on-surface transition-colors touch-manipulation"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {isBlocked && (
        <div className="flex items-center justify-center gap-2.5 text-md-on-warning-container bg-md-warning-container border border-md-warning/30 rounded-md-md py-3 px-4">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            {countdown} چرکەی دیکە چاوەڕوان بە
          </span>
        </div>
      )}

      {error && (
        <p className="text-md-on-error-container text-sm text-center bg-md-error-container border border-md-error/20 rounded-md-md py-3 px-4">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || !password || isBlocked} variant={loading || !password || isBlocked ? 'outlined' : 'filled'} className="text-base py-4">
        {loading
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <LogIn className="w-5 h-5" />
        }
        {loading ? 'چوونەژوورەوە...' : 'چوونەژوورەوە'}
      </Button>
    </form>
  );
}
