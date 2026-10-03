import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse, type NextRequest } from 'next/server';

type Window = `${number} ${'s' | 'm' | 'h'}`;

export interface RateLimitResult {
  limited:      boolean;
  secondsLeft?: number;
  // Upstash missing or unreachable in production — the request is refused
  // (fail closed) rather than let through unlimited.
  unavailable?: boolean;
}

const isProd = process.env.NODE_ENV === 'production';

// Lazy singletons per (prefix, limit, window) — only created when actually
// invoked, so a missing Upstash config doesn't crash the build.
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

// In development a missing or unreachable Upstash just skips limiting. In
// production it fails closed: an attacker shouldn't get unlimited guesses
// because a config value went missing.
function unavailable(prefix: string, error?: unknown): RateLimitResult {
  console.error(`[rate-limit:${prefix}] Upstash ${error ? 'unreachable' : 'not configured'}`, error ?? '');
  return isProd ? { limited: true, unavailable: true } : { limited: false };
}

export async function checkRateLimit(
  prefix: string,
  identifier: string,
  limit: number,
  window: Window,
): Promise<RateLimitResult> {
  const rl = getLimiter(prefix, limit, window);
  if (!rl) return unavailable(prefix);

  try {
    const { success, reset } = await rl.limit(identifier);
    if (success) return { limited: false };
    return { limited: true, secondsLeft: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (e) {
    return unavailable(prefix, e);
  }
}

// Several limits on one request: refused if any of them refuses
export function mergeRateLimits(...results: RateLimitResult[]): RateLimitResult {
  if (results.some((r) => r.unavailable)) return { limited: true, unavailable: true };
  const hit = results.filter((r) => r.limited);
  if (!hit.length) return { limited: false };
  return { limited: true, secondsLeft: Math.max(...hit.map((r) => r.secondsLeft ?? 0)) };
}

// The 429/503 response for a refused request, or null to carry on
export function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (!result.limited) return null;
  if (result.unavailable) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }
  return NextResponse.json({ error: 'rate_limited', secondsLeft: result.secondsLeft }, { status: 429 });
}
