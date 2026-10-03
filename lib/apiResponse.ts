import { NextResponse } from 'next/server';

// Shared API error responses. Safe to import from middleware (Edge runtime).

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Logs the real cause server-side and hands the client a generic error, so
// database messages (table/column names, constraint details) never leak.
export function serverError(context: string, error?: unknown) {
  const e = error as { message?: string; code?: string } | undefined;
  console.error(`[${context}]`, e?.code ?? '', e?.message ?? error ?? '');
  return NextResponse.json({ error: 'server_error' }, { status: 500 });
}
