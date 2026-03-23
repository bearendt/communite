// apps/web/lib/rate-limit.ts
// Upstash Redis rate limiter — use on any sensitive endpoint

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Pre-configured limiters for different endpoint sensitivity levels

// Strict: auth endpoints, report filing (10 req / 10 min per IP)
export const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "rl:strict",
});

// Standard: event creation, RSVP (30 req / 1 min per user)
export const standardLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "rl:standard",
});

// Loose: read endpoints (100 req / 1 min per IP)
export const looseLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "rl:loose",
});

/**
 * Apply rate limiting to an API route handler.
 * Returns a 429 response if limit exceeded, otherwise null (proceed).
 *
 * Usage in a route handler:
 *   const limited = await rateLimit(req, strictLimiter, userId);
 *   if (limited) return limited;
 */
export async function rateLimit(
  req: NextRequest,
  limiter: Ratelimit,
  identifier?: string
): Promise<NextResponse | null> {
  // Use userId if available, fall back to IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const key = identifier ?? ip;

  const { success, limit, reset, remaining } = await limiter.limit(key);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}
