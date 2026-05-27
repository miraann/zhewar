import { Suspense } from 'react';
import { Scissors } from 'lucide-react';
import BookingFlow from '@/components/booking/BookingFlow';

interface BookPageProps {
  searchParams: { name?: string; phone?: string };
}

export default function BookPage({ searchParams }: BookPageProps) {
  const name  = searchParams.name  ? decodeURIComponent(searchParams.name)  : undefined;
  const phone = searchParams.phone ? decodeURIComponent(searchParams.phone) : undefined;

  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<SplashFallback />}>
        <BookingFlow initialName={name} initialPhone={phone} />
      </Suspense>
    </main>
  );
}

function SplashFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-white">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-amber-300 flex items-center justify-center bg-amber-50 shadow-md">
          <Scissors className="w-9 h-9 text-amber-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold text-neutral-900">بەربەری لوکس</h1>
        <p className="text-neutral-400 text-sm tracking-wide">چاکسازی بەرز</p>
      </div>
    </div>
  );
}
