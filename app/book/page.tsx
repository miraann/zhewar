import { Suspense } from 'react';
import BookingFlow from '@/components/booking/BookingFlow';

interface BookPageProps {
  searchParams: { name?: string; phone?: string };
}

export default function BookPage({ searchParams }: BookPageProps) {
  const name  = searchParams.name  ? decodeURIComponent(searchParams.name)  : undefined;
  const phone = searchParams.phone ? decodeURIComponent(searchParams.phone) : undefined;

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Suspense fallback={<SplashFallback />}>
        <BookingFlow initialName={name} initialPhone={phone} />
      </Suspense>
    </main>
  );
}

function BarberTools() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden -z-[5]">
      <style>{`
        @keyframes float1 { 0%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(12px,-18px) rotate(12deg)} 50%{transform:translate(20px,-8px) rotate(6deg)} 75%{transform:translate(8px,15px) rotate(-8deg)} 100%{transform:translate(0,0) rotate(0deg)} }
        @keyframes float2 { 0%{transform:translate(0,0) rotate(0deg)} 33%{transform:translate(-15px,20px) rotate(-15deg)} 66%{transform:translate(10px,10px) rotate(10deg)} 100%{transform:translate(0,0) rotate(0deg)} }
        @keyframes float3 { 0%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-22px) rotate(5deg)} 100%{transform:translateY(0) rotate(-5deg)} }
      `}</style>

      {/* Scissors */}
      <svg viewBox="0 0 90 110" style={{ position:'absolute', width:64, top:'6%', left:'2%', animation:'float1 9s ease-in-out infinite', opacity:0.1 }}>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20,90 L45,50 L68,8" stroke="#1e293b" strokeWidth="7"/>
          <path d="M70,90 L45,50 L22,8" stroke="#1e293b" strokeWidth="7"/>
          <circle cx="20" cy="90" r="15" stroke="#1e293b" strokeWidth="5"/>
          <circle cx="20" cy="90" r="5" fill="#1e293b"/>
          <circle cx="70" cy="90" r="15" stroke="#1e293b" strokeWidth="5"/>
          <circle cx="70" cy="90" r="5" fill="#1e293b"/>
        </g>
      </svg>

      {/* Comb */}
      <svg viewBox="0 0 130 50" style={{ position:'absolute', width:88, top:'8%', right:'2%', animation:'float2 11s ease-in-out infinite', opacity:0.1 }}>
        <g fill="none" stroke="#1e293b" strokeLinecap="round">
          <rect x="4" y="4" width="122" height="18" rx="9" strokeWidth="5"/>
          <line x1="15" y1="22" x2="15" y2="46" strokeWidth="4.5"/>
          <line x1="28" y1="22" x2="28" y2="46" strokeWidth="4.5"/>
          <line x1="41" y1="22" x2="41" y2="46" strokeWidth="4.5"/>
          <line x1="54" y1="22" x2="54" y2="46" strokeWidth="4.5"/>
          <line x1="67" y1="22" x2="67" y2="46" strokeWidth="4.5"/>
          <line x1="80" y1="22" x2="80" y2="46" strokeWidth="4.5"/>
          <line x1="93" y1="22" x2="93" y2="46" strokeWidth="4.5"/>
          <line x1="106" y1="22" x2="106" y2="46" strokeWidth="4.5"/>
          <line x1="119" y1="22" x2="119" y2="46" strokeWidth="4.5"/>
        </g>
      </svg>

      {/* Clipper */}
      <svg viewBox="0 0 65 100" style={{ position:'absolute', width:48, top:'34%', left:'2%', animation:'float3 13s ease-in-out infinite', opacity:0.1 }}>
        <g fill="none" stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="4" width="49" height="64" rx="12" strokeWidth="5"/>
          <line x1="18" y1="20" x2="47" y2="20" strokeWidth="4"/>
          <line x1="18" y1="30" x2="47" y2="30" strokeWidth="4"/>
          <line x1="18" y1="40" x2="47" y2="40" strokeWidth="4"/>
          <circle cx="32" cy="54" r="7" strokeWidth="4"/>
          <rect x="4" y="67" width="57" height="13" rx="5" strokeWidth="4.5"/>
        </g>
      </svg>

      {/* Razor */}
      <svg viewBox="0 0 100 40" style={{ position:'absolute', width:72, top:'52%', right:'3%', animation:'float2 10s ease-in-out infinite 3s', opacity:0.1 }}>
        <g fill="none" stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="6" width="92" height="28" rx="5" strokeWidth="4.5"/>
          <rect x="38" y="14" width="24" height="12" rx="3" strokeWidth="4"/>
          <path d="M4,12 L14,20 L4,28" strokeWidth="3.5"/>
          <path d="M96,12 L86,20 L96,28" strokeWidth="3.5"/>
        </g>
      </svg>
    </div>
  );
}

function SplashFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full p-[3px]"
          style={{
            background:
              'conic-gradient(#ef4444 0deg,#ef4444 110deg,#f8fafc 135deg,#3b82f6 160deg,#3b82f6 290deg,#f8fafc 315deg,#ef4444 360deg)',
          }}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
            <span className="text-blue-600 text-3xl">✂</span>
          </div>
        </div>
        <div
          className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping"
          style={{ animationDuration: '2s' }}
        />
      </div>
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-900">بەربەری لوکس</h1>
        <p className="text-blue-600/50 text-sm tracking-widest">چاکسازی بەرز</p>
      </div>
    </div>
  );
}
