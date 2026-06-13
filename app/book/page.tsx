import { Suspense } from 'react';
import BookingFlow from '@/components/booking/BookingFlow';

interface BookPageProps {
  searchParams: { name?: string; phone?: string };
}

export default function BookPage({ searchParams }: BookPageProps) {
  const name  = searchParams.name  ? decodeURIComponent(searchParams.name)  : undefined;
  const phone = searchParams.phone ? decodeURIComponent(searchParams.phone) : undefined;

  return (
    <main className="min-h-screen bg-neutral-950">
      <Suspense fallback={<SplashFallback />}>
        <BookingFlow initialName={name} initialPhone={phone} />
      </Suspense>
    </main>
  );
}

function SplashFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-neutral-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="w-20 h-20 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          <span className="text-amber-400 text-3xl">✂</span>
        </div>
        <div className="absolute inset-0 rounded-full border border-amber-400/20 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold text-white">بەربەری لوکس</h1>
        <p className="text-amber-500/60 text-sm tracking-widest">چاکسازی بەرز</p>
      </div>
    </div>
  );
}
