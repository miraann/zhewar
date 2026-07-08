'use client';

import { useEffect } from 'react';
import { RefreshCw, Scissors } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    // Log to your error tracking service here (e.g. Sentry) — never expose to UI
    console.error('[app/error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="flex flex-col items-center justify-center min-h-screen px-6 bg-slate-50"
    >
      <style>{`
        @keyframes poleSlide { from { background-position: 0 0; } to { background-position: 113px 0; } }
        @keyframes floatBob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      {/* Barber-pole strip — matches homepage */}
      <div
        className="fixed top-0 inset-x-0 h-2.5 z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, #ef4444, #ef4444 20px, #ffffff 20px, #ffffff 40px, #3b82f6 40px, #3b82f6 60px, #ffffff 60px, #ffffff 80px)',
          backgroundSize: '113px 100%',
          animation: 'poleSlide 2.4s linear infinite',
        }}
      />

      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">

        {/* Icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
          style={{ animation: 'floatBob 3s ease-in-out infinite' }}
        >
          <div
            className="w-24 h-24 rounded-full p-[3px]"
            style={{
              background: 'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
            }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Scissors className="w-9 h-9 text-red-500" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            کێشەیەک ڕوویدا
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            کێشەیەک لە سیستەمدا ڕوویدا. تکایە دووبارە هەوڵبدەرەوە یان
            لە کاتێکی تر سەردانمان بکە.
          </p>
          {/* Only show digest in dev — never expose the real error message */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <p className="text-[11px] text-slate-400 font-mono bg-slate-100 rounded-lg px-3 py-2 text-left break-all">
              {error.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2.5 w-full h-13 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-md shadow-blue-200/60 active:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation select-none"
          >
            <RefreshCw className="w-4 h-4" />
            دووبارە هەوڵبدەرەوە
          </button>
          <a
            href="/"
            className="flex items-center justify-center w-full py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-base active:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation select-none"
          >
            سەرەتا
          </a>
        </div>

        {/* Branding */}
        <p className="text-slate-300 text-xs tracking-widest mt-2">
          ژێوار محمد
        </p>
      </div>
    </div>
  );
}
