'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors thrown inside the root layout (app/layout.tsx).
// Must provide its own <html> and <body> since the layout is broken.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[app/global-error]', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="ckb" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>کێشەیەک ڕوویدا — ژێوار محمد</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          @keyframes poleSlide {
            from { background-position: 0 0; }
            to   { background-position: 113px 0; }
          }
          .pole {
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 10px;
            background-image: repeating-linear-gradient(
              -45deg,
              #ef4444, #ef4444 20px,
              #ffffff 20px, #ffffff 40px,
              #3b82f6 40px, #3b82f6 60px,
              #ffffff 60px, #ffffff 80px
            );
            background-size: 113px 100%;
            animation: poleSlide 2.4s linear infinite;
          }
          .card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            max-width: 360px;
            width: 100%;
            padding: 0 24px;
            text-align: center;
          }
          .ring {
            width: 96px; height: 96px;
            border-radius: 50%;
            padding: 3px;
            background: conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg);
          }
          .ring-inner {
            width: 100%; height: 100%;
            border-radius: 50%;
            background: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 2rem;
          }
          h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
          p  { font-size: 0.875rem; color: #64748b; line-height: 1.6; }
          .actions { display: flex; flex-direction: column; gap: 12px; width: 100%; }
          .btn-primary {
            display: flex; align-items: center; justify-content: center; gap: 10px;
            width: 100%; padding: 14px;
            border-radius: 16px;
            background: #2563eb;
            color: #fff;
            font-weight: 700; font-size: 1rem;
            border: none; cursor: pointer;
            transition: background 0.15s;
          }
          .btn-primary:hover { background: #1d4ed8; }
          .btn-secondary {
            display: flex; align-items: center; justify-content: center;
            width: 100%; padding: 14px;
            border-radius: 16px;
            background: #fff;
            color: #334155;
            font-weight: 700; font-size: 1rem;
            border: 2px solid #e2e8f0;
            text-decoration: none;
            cursor: pointer;
            transition: background 0.15s;
          }
          .btn-secondary:hover { background: #f8fafc; }
          .brand { font-size: 0.7rem; color: #cbd5e1; letter-spacing: 0.2em; margin-top: 8px; }
        `}</style>
      </head>
      <body>
        <div className="pole" />
        <div className="card">
          <div className="ring">
            <div className="ring-inner">✂</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1>کێشەیەک ڕوویدا</h1>
            <p>
              کێشەیەک لە سیستەمدا ڕوویدا. تکایە دووبارە هەوڵبدەرەوە یان
              لە کاتێکی تر سەردانمان بکە.
            </p>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={reset}>
              <RefreshCw size={16} />
              دووبارە هەوڵبدەرەوە
            </button>
            <a className="btn-secondary" href="/">
              سەرەتا
            </a>
          </div>
          <p className="brand">ژێوار محمد</p>
        </div>
      </body>
    </html>
  );
}
