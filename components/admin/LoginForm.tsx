'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2, Clock } from 'lucide-react';
import Button from './ui/Button';
import { isAdminApp, renewAppSession } from '@/lib/adminAuth';

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

  // The APK only lands here if the WebView lost its session cookie (or it
  // expired on an older 8-hour login). Its token from the last login is still
  // in localStorage, so sign straight back in. Only logout removes the token.
  useEffect(() => {
    if (!isAdminApp() || !localStorage.getItem('admin_token')) return;
    setLoading(true);
    renewAppSession()
      .then((res) => {
        if (res.ok) {
          window.location.replace('/admin/dashboard');
          return;
        }
        // The saved session was revoked or expired
        if (res.status === 401) localStorage.removeItem('admin_token');
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      // The APK loads the live site, so this is same-origin there too.
      const isCapacitor = isAdminApp();
      const res = await fetch(
        '/api/admin/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, app: isCapacitor }),
          ...(isCapacitor ? { credentials: 'include' } : {}),
        },
      );

      setLoading(false);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Only the APK gets a token (see /api/admin/login); a browser's
        // session lives in its httpOnly cookie, out of reach of scripts
        if (isCapacitor && data.token) localStorage.setItem('admin_token', data.token);
        window.location.href = '/admin/dashboard';
      } else if (res.status === 503) {
        setError('کێشەی تۆڕ. دووبارە هەوڵبدەرەوە.');
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
          className="admin-input h-14 ps-12 pe-5 py-4 text-base"
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
