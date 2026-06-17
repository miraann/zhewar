'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2 } from 'lucide-react';

type Phase = 'starting' | 'scanning' | 'captured' | 'error';

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel:  () => void;
}

export default function LiveCameraCapture({ onCapture, onCancel }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const aCanvasRef  = useRef<HTMLCanvasElement>(null); // analysis (hidden)
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const phaseRef    = useRef<Phase>('starting');

  const [phase, setPhase]         = useState<Phase>('starting');
  const [flash, setFlash]         = useState(false);
  const [capturedUrl, setCaptured] = useState('');
  const [errorMsg, setError]      = useState('');
  const [dotCount, setDotCount]   = useState(0); // animated dots

  // blink detection
  const history    = useRef<number[]>([]);
  const blinkState = useRef<'open' | 'closing'>('open');
  const blinkStart = useRef(0);

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── capture ────────────────────────────────────────────────────────────────
  const captureNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const W = video.videoWidth  || 480;
    const H = video.videoHeight || 640;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    ctx.translate(W, 0); ctx.scale(-1, 1); // mirror
    ctx.drawImage(video, 0, 0, W, H);
    setCaptured(cv.toDataURL('image/jpeg', 0.85));
    setPhaseSync('captured');
    stopStream();
  }, [stopStream]);

  // ── brightness of eye-region ───────────────────────────────────────────────
  function eyeBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement): number {
    const W = 96, H = 72;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, W, H);
    // eye strip: centre 50% wide, rows 28-50% from top
    const x = Math.floor(W * 0.25), y = Math.floor(H * 0.28);
    const w = Math.floor(W * 0.50), h = Math.floor(H * 0.22);
    const d = ctx.getImageData(x, y, w, h).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 16)
      s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    return s / (d.length / 16);
  }

  // ── main effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // animated dots
    const dotInterval = setInterval(() => setDotCount(n => (n + 1) % 4), 450);

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.muted = true;
        await v.play();
        if (!mounted) return;
        setPhaseSync('scanning');

        let frameCount = 0;

        const analyze = (): void => {
          if (!mounted || phaseRef.current !== 'scanning') return;
          const v = videoRef.current, c = aCanvasRef.current;
          if (!v || !c || v.readyState < 2) { rafRef.current = requestAnimationFrame(analyze); return; }

          const brightness = eyeBrightness(v, c);
          history.current.push(brightness);
          if (history.current.length > 60) history.current.shift();
          frameCount++;

          // need ~20 frames to establish baseline
          if (frameCount < 20) { rafRef.current = requestAnimationFrame(analyze); return; }

          // baseline: mean of "open eye" samples (top 70% brightest)
          const sorted   = [...history.current].sort((a, b) => b - a);
          const baseline = sorted.slice(0, Math.ceil(sorted.length * 0.7))
                                 .reduce((a, b) => a + b, 0) / Math.ceil(sorted.length * 0.7);
          const threshold = baseline * 0.78;
          const now = performance.now();

          if (blinkState.current === 'open' && brightness < threshold) {
            blinkState.current = 'closing';
            blinkStart.current = now;
          } else if (blinkState.current === 'closing' && brightness >= threshold) {
            const dur = now - blinkStart.current;
            blinkState.current = 'open';
            if (dur >= 50 && dur <= 650) {
              // ✅ blink confirmed → flash + capture
              if (!mounted) return;
              setFlash(true);
              setTimeout(() => { if (mounted) setFlash(false); }, 350);
              setTimeout(() => { if (mounted) captureNow(); },    250);
              return;
            }
          }

          rafRef.current = requestAnimationFrame(analyze);
        };

        rafRef.current = requestAnimationFrame(analyze);
      } catch {
        if (mounted) {
          setError('کامێرا بەردەست نییە. تکایە مۆڵەتی کامێرا بدە');
          setPhaseSync('error');
        }
      }
    }

    init();
    return () => { mounted = false; stopStream(); clearInterval(dotInterval); };
  }, [captureNow, stopStream]);

  // ── retry ──────────────────────────────────────────────────────────────────
  const retry = () => {
    setCaptured('');
    setError('');
    setPhaseSync('starting');
    history.current = [];
    blinkState.current = 'open';
    // re-mount effect by forcing key change via parent; just re-call init inline
    window.location.reload();
  };

  const dots = '.'.repeat(dotCount);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0f1a] font-sans" dir="rtl">

      {/* Hidden analysis canvas */}
      <canvas ref={aCanvasRef} className="hidden" />

      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white/60 z-20 pointer-events-none" />}

      {/* Close */}
      <button
        onClick={() => { stopStream(); onCancel(); }}
        className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white touch-manipulation active:scale-95 transition-transform"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Title */}
      <p className="text-white/60 text-xs tracking-[0.3em] mb-6 font-medium">تەسدیقکردنی ناسنامە</p>

      {/* ── Camera circle ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>

        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: phase === 'captured'
              ? 'conic-gradient(#10b981 0deg,#10b981 360deg)'
              : 'conic-gradient(#3b82f6 0deg,#3b82f6 200deg,transparent 200deg)',
            padding: 3,
            animation: phase === 'scanning' ? 'scanSpin 2s linear infinite' : 'none',
          }}
        >
          <div className="w-full h-full rounded-full bg-[#0b0f1a]" />
        </div>

        {/* Dashed pulse ring */}
        {phase === 'scanning' && (
          <div
            className="absolute rounded-full border-2 border-dashed border-blue-400/40 animate-pulse"
            style={{ inset: -10 }}
          />
        )}

        {/* Video / captured preview */}
        <div
          className="relative rounded-full overflow-hidden bg-slate-800 flex items-center justify-center"
          style={{ width: 240, height: 240 }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)', display: phase === 'captured' ? 'none' : 'block' }}
          />
          {capturedUrl && (
            <img src={capturedUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
          )}
          {phase === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Scanning line */}
          {phase === 'scanning' && (
            <div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/70 to-transparent pointer-events-none"
              style={{ animation: 'scanLine 2s ease-in-out infinite' }}
            />
          )}

          {/* Captured checkmark */}
          {phase === 'captured' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Corner brackets */}
        {phase === 'scanning' && (
          <>
            {[['top-4 left-4', 'border-t-2 border-l-2'], ['top-4 right-4', 'border-t-2 border-r-2'],
              ['bottom-4 left-4', 'border-b-2 border-l-2'], ['bottom-4 right-4', 'border-b-2 border-r-2']
            ].map(([pos, border]) => (
              <div key={pos} className={`absolute ${pos} w-6 h-6 border-blue-400 rounded-sm ${border}`} />
            ))}
          </>
        )}
      </div>

      {/* Instruction text */}
      <div className="mt-8 flex flex-col items-center gap-3 px-8 text-center">
        {phase === 'starting' && (
          <p className="text-white/70 text-sm">چاوەڕوانبە{dots}</p>
        )}
        {phase === 'scanning' && (
          <>
            <p className="text-white font-bold text-lg leading-snug">
              تکایە چاوەکانت بپڕوکێنە
            </p>
            <p className="text-blue-400/80 text-xs tracking-wide">
              بۆ دڵنیابوونەوە لە بوونی ئەنسانی ڕاستەقینە
            </p>
            <div className="flex items-center gap-2 mt-1">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-500"
                  style={{ animation: `blinkDot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </>
        )}
        {phase === 'captured' && (
          <>
            <p className="text-emerald-400 font-bold text-lg">پڕوکێنان تەسدیق کرا ✓</p>
            <p className="text-white/60 text-xs">وێنەکەت تۆمار کرا</p>
          </>
        )}
        {phase === 'error' && (
          <>
            <p className="text-red-400 font-semibold text-sm">{errorMsg}</p>
            <button
              onClick={retry}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium touch-manipulation active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
              دووبارەهەوڵبدەرەوە
            </button>
          </>
        )}
      </div>

      {/* Confirm / retake buttons after capture */}
      {phase === 'captured' && capturedUrl && (
        <div className="flex gap-3 mt-6 w-full max-w-xs px-4">
          <button
            onClick={() => { stopStream(); onCapture(capturedUrl); }}
            className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:bg-emerald-600 active:scale-[0.98] transition-all touch-manipulation shadow-lg shadow-emerald-500/30"
          >
            بەکاربهێنە ✓
          </button>
          <button
            onClick={retry}
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual capture fallback */}
      {phase === 'scanning' && (
        <button
          onClick={captureNow}
          className="mt-5 text-white/30 text-xs underline underline-offset-4 touch-manipulation"
        >
          بەدەستی وێنە بگرە
        </button>
      )}

      <style>{`
        @keyframes scanSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanLine {
          0%   { top: 20%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes blinkDot {
          0%,100% { opacity: 0.3; transform: scale(0.8); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
