import { NextRequest, NextResponse } from 'next/server';
import { renewAdminSession, requireAdmin, setAdminSessionCookie } from '@/lib/adminSession';
import { unauthorized } from '@/lib/apiResponse';

// The APK calls this on every launch: it restarts the session's lifetime
// and re-issues the cookie. When the WebView lost the cookie, the token
// header alone gets it back. Checks the session itself rather than trusting
// middleware.ts to have run.
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return unauthorized();

  await renewAdminSession(session);
  const res = NextResponse.json({ success: true });
  setAdminSessionCookie(res, session);
  return res;
}
