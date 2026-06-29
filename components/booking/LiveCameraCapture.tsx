'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'loading' | 'searching' | 'face_found' | 'captured' | 'error';

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel:  () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
// Models hosted on jsDelivr CDN — loaded once, browser-cached thereafter
const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

// Eye Aspect Ratio below this = eye is closing (blink)
const EAR_BLINK_THRESHOLD = 0.21;

// Auto-capture after face held steady for this long (ms)
const AUTO_CAPTURE_MS = 2500;

// Run face detection every N animation frames (~5fps on a 30fps device)
const DETECT_EVERY_N_FRAMES = 6;

// ── Geometry helpers ──────────────────────────────────────────────────────────
type Pt = { x: number; y: number };
type FaceValidity = 'invalid' | 'misaligned' | 'valid';

function d(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Eye Aspect Ratio — expects 6 contour points (faceapi landmark order)
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
function ear(pts: Pt[]): number {
  if (pts.length < 6) return 1;
  return (d(pts[1], pts[5]) + d(pts[2], pts[4])) / (2 * d(pts[0], pts[3]));
}

// ── Strict full-face validation ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateFace(result: any, videoW: number, videoH: number): FaceValidity {
  const det   = result.detection;
  const score = det.score  as number;
  const box   = det.box    as { x: number; y: number; width: number; height: number };

  // 1. High confidence gate
  if (score < 0.92) return 'invalid';

  // 2. Bounding box must not clip any canvas edge
  if (box.x < 0 || box.y < 0 ||
      box.x + box.width  > videoW ||
      box.y + box.height > videoH) return 'misaligned';

  // 3. Face must occupy 30–55 % of canvas area (too far / too close → amber)
  const faceRatio = (box.width * box.height) / (videoW * videoH);
  if (faceRatio < 0.30 || faceRatio > 0.55) return 'misaligned';

  // 4. Face centre must be within ±15 % of canvas centre on both axes
  const normCx = (box.x + box.width  / 2) / videoW - 0.5;
  const normCy = (box.y + box.height / 2) / videoH - 0.5;
  if (Math.abs(normCx) > 0.15 || Math.abs(normCy) > 0.15) return 'misaligned';

  // 5. Yaw + Roll from 68 landmarks ─────────────────────────────────────────
  const pts = result.landmarks.positions as Pt[];

  const avg = (idxs: number[]): Pt => ({
    x: idxs.reduce((s, i) => s + pts[i].x, 0) / idxs.length,
    y: idxs.reduce((s, i) => s + pts[i].y, 0) / idxs.length,
  });

  // face-api 68-pt model: right eye = 36-41, left eye = 42-47, nose tip = 30
  const rEye = avg([36, 37, 38, 39, 40, 41]);
  const lEye = avg([42, 43, 44, 45, 46, 47]);
  const nose = pts[30];

  // Roll: slope of the inter-eye line — allow ±15°
  const rollDeg = Math.atan2(lEye.y - rEye.y, lEye.x - rEye.x) * (180 / Math.PI);
  if (Math.abs(rollDeg) > 15) return 'misaligned';

  // Yaw: how far nose deviates from eye-midpoint, normalised by inter-eye distance
  const interEyeDist = Math.abs(lEye.x - rEye.x);
  const yawOffset    = interEyeDist > 0
    ? Math.abs(nose.x - (rEye.x + lEye.x) / 2) / interEyeDist
    : 0;
  if (yawOffset > 0.25) return 'misaligned';

  return 'valid';
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveCameraCapture({ onCapture, onCancel }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const phaseRef   = useRef<Phase>('loading');

  // face-lock timing
  const faceFoundAt  = useRef(0); // timestamp when face first locked
  const faceLostAt   = useRef(0); // timestamp when face was last lost (debounce)

  // blink state machine
  const blinkStateRef = useRef<'open' | 'closing'>('open');

  const [phase,        setPhase]        = useState<Phase>('loading');
  const [flash,        setFlash]        = useState(false);
  const [capturedUrl,  setCaptured]     = useState('');
  const [errorMsg,     setError]        = useState('');
  const [loadStep,     setLoadStep]     = useState('');
  // 0-100 — progress toward auto-capture while face is held
  const [autoProgress, setAutoProgress] = useState(0);
  // 'none' = no face | 'partial' = face found but alignment/score rejected
  const [faceHint, setFaceHint] = useState<'none' | 'partial'>('none');

  // Keep phaseRef in sync with React state
  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── stop camera ─────────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── capture frame ────────────────────────────────────────────────────────────
  const captureNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const srcW = video.videoWidth  || 480;
    const srcH = video.videoHeight || 640;

    // Scale down to max 240px — fits ~3000+ images in 50 MB bucket
    const maxPx = 240;
    const scale = Math.min(maxPx / srcW, maxPx / srcH, 1);
    const outW  = Math.round(srcW * scale);
    const outH  = Math.round(srcH * scale);

    const cv  = document.createElement('canvas');
    cv.width  = outW;
    cv.height = outH;
    const ctx = cv.getContext('2d')!;
    ctx.translate(outW, 0);
    ctx.scale(-1, 1); // mirror (selfie)
    ctx.drawImage(video, 0, 0, outW, outH);
    // quality 0.60 → ~8-15 KB per image
    setCaptured(cv.toDataURL('image/jpeg', 0.60));
    setPhaseSync('captured');
    stopStream();
  }, [stopStream, setPhaseSync]);

  // ── main effect ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Start camera immediately so the user sees themselves while models load
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

        // ── load face-api models from CDN ──────────────────────────────────────
        if (mounted) setLoadStep('ناسینی ڕووخسار بارکردن...');
        const faceapi = await import('@vladmandic/face-api');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fa = faceapi as any;

        await fa.nets.tinyFaceDetector.loadFromUri(MODEL_CDN);
        if (!mounted) return;

        if (mounted) setLoadStep('دیاریکردنی چاوەکان...');
        await fa.nets.faceLandmark68TinyNet.loadFromUri(MODEL_CDN);
        if (!mounted) return;

        setPhaseSync('searching');

        // ── detection loop ─────────────────────────────────────────────────────
        const detectorOptions = new fa.TinyFaceDetectorOptions({
          inputSize: 224,      // smaller input = faster inference on mobile
          scoreThreshold: 0.5,
        });

        let frame = 0;

        const loop = (): void => {
          if (!mounted || phaseRef.current === 'captured') return;
          rafRef.current = requestAnimationFrame(async () => {
            frame++;

            // Throttle — only run heavy detection every N frames
            if (frame % DETECT_EVERY_N_FRAMES !== 0) { loop(); return; }

            const video = videoRef.current;
            if (!video || video.readyState < 2) { loop(); return; }

            let result: unknown;
            try {
              result = await fa
                .detectSingleFace(video, detectorOptions)
                .withFaceLandmarks(/* tiny= */ true);
            } catch {
              // Frame-level detection error is non-fatal — skip this frame
              loop();
              return;
            }

            if (!mounted) return;

            // ── no face in frame ───────────────────────────────────────────────
            if (!result) {
              faceLostAt.current = Date.now();
              if (
                phaseRef.current === 'face_found' &&
                Date.now() - faceLostAt.current > 400
              ) {
                faceFoundAt.current = 0;
                setAutoProgress(0);
                blinkStateRef.current = 'open';
                setPhaseSync('searching');
              }
              setFaceHint('none');
              loop();
              return;
            }

            // ── strict face validation ─────────────────────────────────────────
            const validity = validateFace(
              result,
              video.videoWidth  || 640,
              video.videoHeight || 480,
            );

            if (validity === 'invalid') {
              // Confidence too low — treat as no face
              if (phaseRef.current === 'face_found') {
                faceFoundAt.current = 0;
                setAutoProgress(0);
                blinkStateRef.current = 'open';
                setPhaseSync('searching');
              }
              setFaceHint('none');
              loop();
              return;
            }

            if (validity === 'misaligned') {
              // Real face detected but angle / centering / size rejected → stay amber
              if (phaseRef.current === 'face_found') {
                faceFoundAt.current = 0;
                setAutoProgress(0);
                blinkStateRef.current = 'open';
                setPhaseSync('searching');
              }
              setFaceHint('partial');
              loop();
              return;
            }

            // ── all checks passed → lock face ──────────────────────────────────
            setFaceHint('none');
            if (phaseRef.current === 'searching') {
              setPhaseSync('face_found');
              faceFoundAt.current = Date.now();
              blinkStateRef.current = 'open';
            }

            // ── EAR blink detection ────────────────────────────────────────────
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lm         = (result as any).landmarks;
            const leftEye    = lm.getLeftEye()  as Pt[];
            const rightEye   = lm.getRightEye() as Pt[];
            const avgEar     = (ear(leftEye) + ear(rightEye)) / 2;

            if (blinkStateRef.current === 'open' && avgEar < EAR_BLINK_THRESHOLD) {
              blinkStateRef.current = 'closing';
            } else if (blinkStateRef.current === 'closing' && avgEar >= EAR_BLINK_THRESHOLD) {
              // Full blink cycle completed → capture
              blinkStateRef.current = 'open';
              if (mounted) {
                setFlash(true);
                setTimeout(() => { if (mounted) setFlash(false); }, 350);
                setTimeout(() => { if (mounted) captureNow(); },    250);
                return;
              }
            }

            // ── auto-capture countdown ─────────────────────────────────────────
            const held = Date.now() - faceFoundAt.current;
            const pct  = Math.min((held / AUTO_CAPTURE_MS) * 100, 100);
            setAutoProgress(pct);

            if (held >= AUTO_CAPTURE_MS && mounted) {
              captureNow();
              return;
            }

            loop();
          });
        };

        loop();
      } catch (err: unknown) {
        if (!mounted) return;
        const name = (err as { name?: string }).name ?? '';
        setError(
          name === 'NotAllowedError'
            ? 'مۆڵەتی کامێرا نەدرا. تکایە مۆڵەت بدە'
            : 'کامێرا یان مۆدێل بارنەبوو. دووبارە هەوڵ بدەرەوە',
        );
        setPhaseSync('error');
      }
    }

    init();
    return () => { mounted = false; stopStream(); };
  }, [captureNow, stopStream, setPhaseSync]);

  const retry = () => window.location.reload();

  // ── Derived UI values ─────────────────────────────────────────────────────
  const ringColor =
    phase === 'captured'  ? 'conic-gradient(#10b981 0deg,#10b981 360deg)' :
    phase === 'face_found'? 'conic-gradient(#10b981 0deg,#10b981 360deg)' :
                            'conic-gradient(#f59e0b 0deg,#f59e0b 180deg,transparent 180deg)';

  const bracketColor =
    phase === 'face_found' ? 'border-emerald-500' : 'border-amber-400';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md font-sans"
      dir="rtl"
    >
      {/* Hidden analysis canvas (not used for display) */}

      {/* Flash on blink capture */}
      {flash && (
        <div className="absolute inset-0 bg-white/65 z-20 pointer-events-none transition-opacity" />
      )}

      {/* Close button */}
      <button
        onClick={() => { stopStream(); onCancel(); }}
        className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white touch-manipulation active:scale-95 transition-transform"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Page title */}
      <p className="text-white/60 text-xs tracking-[0.3em] mb-6 font-medium">
        دڵنیاکردنەوەی ناسنامە
      </p>

      {/* ── Camera viewport ─────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 268, height: 268 }}
      >
        {/* Spinning conic ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: ringColor,
            padding: 3,
            animation:
              phase === 'searching' ? 'scanSpin 2.2s linear infinite' :
              phase === 'face_found'? 'scanSpin 1.2s linear infinite' :
              'none',
          }}
        >
          <div className="w-full h-full rounded-full bg-slate-950/90" />
        </div>

        {/* Outer pulse ring */}
        {phase === 'searching' && (
          <div
            className="absolute rounded-full border-2 border-dashed border-amber-500/60 animate-pulse"
            style={{ inset: -10, boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}
          />
        )}
        {phase === 'face_found' && (
          <div
            className="absolute rounded-full border-2 border-emerald-500"
            style={{ inset: -10, boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}
          />
        )}

        {/* Circular camera frame */}
        <div
          className="relative rounded-full overflow-hidden bg-slate-900 flex items-center justify-center"
          style={{ width: 246, height: 246 }}
        >
          {/* Live video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: 'scaleX(-1)',
              display: phase === 'captured' ? 'none' : 'block',
            }}
          />

          {/* Captured photo */}
          {capturedUrl && (
            <img
              src={capturedUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Loading spinner overlay */}
          {phase === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Amber scanning line — searching */}
          {phase === 'searching' && (
            <div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent pointer-events-none"
              style={{ animation: 'scanLine 2.2s ease-in-out infinite' }}
            />
          )}

          {/* Auto-capture arc progress */}
          {phase === 'face_found' && autoProgress > 0 && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `conic-gradient(rgba(16,185,129,0.25) ${autoProgress * 3.6}deg, transparent ${autoProgress * 3.6}deg)`,
              }}
            />
          )}

          {/* Success checkmark */}
          {phase === 'captured' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-full">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Corner crosshair brackets */}
        {(phase === 'searching' || phase === 'face_found') && (
          <>
            {(
              [
                ['top-3 left-3',    'border-t-2 border-l-2'],
                ['top-3 right-3',   'border-t-2 border-r-2'],
                ['bottom-3 left-3', 'border-b-2 border-l-2'],
                ['bottom-3 right-3','border-b-2 border-r-2'],
              ] as [string, string][]
            ).map(([pos, border]) => (
              <div
                key={pos}
                className={`absolute ${pos} w-7 h-7 rounded-sm ${border} ${bracketColor} transition-colors duration-300`}
              />
            ))}
          </>
        )}

        {/* Face-lock badge */}
        {phase === 'face_found' && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-[0.6rem] font-bold tracking-wide whitespace-nowrap">
              ڕووخسار دۆزرایەوە
            </span>
          </div>
        )}
      </div>

      {/* ── Instruction text ─────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-col items-center gap-2.5 px-8 text-center">
        {phase === 'loading' && (
          <>
            <p className="text-white/80 font-semibold text-sm">{loadStep || 'بارکردن...'}</p>
            <p className="text-white/35 text-xs">ئامادەکردنی تەکنەلۆژیای ناسینی ڕووخسار</p>
          </>
        )}

        {phase === 'searching' && (
          <>
            <p className="text-amber-400 font-bold text-base leading-snug">
              {faceHint === 'partial'
                ? 'تکایە ڕوخسارت بهێنە ناوەڕاستی چوارچێوەکە'
                : '  کامێرا بکە سەر ڕوخسارت'}
            </p>
            <p className="text-white/45 text-xs">
              {faceHint === 'partial' ? 'ڕووخسار دۆزرایەوە، بەڵام پێویستە ڕوخسارت بە شێوازێکی ڕێک بێت  بەرامبەر کامێرا' : 'گەڕان بۆ ڕووخسار...'}
            </p>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: `blinkDot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </>
        )}

        {phase === 'face_found' && (
          <>
            <p className="text-emerald-400 font-bold text-base">
              ڕووخسار ڕێکە
            </p>
            <p className="text-white font-semibold text-sm leading-snug">
              ئێستا چاو بتروکێنە
            </p>
            <p className="text-white/40 text-[0.7rem] mt-0.5">
              یان چاوەڕوان بە بۆ وێنەگرتنی خۆکار
            </p>
            {/* Auto-capture countdown bar */}
            <div className="w-40 h-1 mt-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                style={{ width: `${autoProgress}%` }}
              />
            </div>
          </>
        )}

        {phase === 'captured' && (
          <>
            <p className="text-emerald-400 font-bold text-lg">وێنەکەت تۆمار کرا ✓</p>
            <p className="text-white/55 text-xs">  کارەکەت سەرکەوتووبوو</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-red-400 font-semibold text-sm leading-relaxed">{errorMsg}</p>
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

      {/* ── Post-capture buttons ─────────────────────────────────────────────── */}
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

      <style>{`
        @keyframes scanSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scanLine {
          0%   { top: 18%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 82%; opacity: 0; }
        }
        @keyframes blinkDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
