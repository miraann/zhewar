import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

type Window = `${number} ${'s' | 'm' | 'h'}`;

// Lazy singletons per (prefix, limit, window) — only created when actually
// invoked, so a missing Upstash config doesn't crash the build (limiting is
// then simply skipped, same fallback the admin-login route already uses).
const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, limit: number, window: Window): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !url.startsWith('https') || !token) return null;

  const key = `${prefix}:${limit}:${window}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rl:${prefix}`,
    });
    limiters.set(key, rl);
  }
  return rl;
}

export function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function checkRateLimit(
  prefix: string,
  identifier: string,
  limit: number,
  window: Window,
): Promise<{ limited: boolean; secondsLeft?: number }> {
  const rl = getLimiter(prefix, limit, window);
  if (!rl) return { limited: false };

  const { success, reset } = await rl.limit(identifier);
  if (success) return { limited: false };
  return { limited: true, secondsLeft: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}
