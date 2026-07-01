export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6" dir="rtl">
      <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-4xl">
        📡
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">بەبێ ئینتەرنێت</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          پەیوەندیت بە ئینتەرنێتەوە نییە.<br />تکایە پەیوەندی بکەرەوە و دووبارە هەوڵ بدەرەوە.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700 transition-colors touch-manipulation"
      >
        دووبارە هەوڵ بدەرەوە
      </button>
    </div>
  );
}
