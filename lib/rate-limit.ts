// Per-IP rate limiting with the Workers Rate Limiting binding. The limits
// live in wrangler.jsonc (`ratelimits`). Join codes are the only thing
// protecting a trip, so this is what makes guessing them impractical.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "@/lib/http";

/** The part of the Workers `RateLimit` binding used here, so tests can pass a fake. */
export type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type RateLimiterName = "JOIN_LIMITER" | "STATE_LIMITER" | "CREATE_TRIP_LIMITER";

/** The caller's IP as Cloudflare reports it. Requests without one share a bucket. */
export function clientKey(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

/**
 * Throws a 429 when `limiter` says `key` is over its limit. A missing binding
 * (vitest, `next dev` without it) or a failing one lets the request through:
 * an outage of the limiter shouldn't take the app down with it.
 */
export async function checkRateLimit(limiter: RateLimiter | undefined, key: string): Promise<void> {
  if (!limiter) return;
  let success: boolean;
  try {
    ({ success } = await limiter.limit({ key }));
  } catch (err) {
    console.error("Rate limiter failed; allowing request", err);
    return;
  }
  if (!success) throw new HttpError(429, "Too many requests. Wait a minute and try again.");
}

function getLimiter(name: RateLimiterName): RateLimiter | undefined {
  try {
    return getCloudflareContext().env[name];
  } catch {
    return undefined; // Not running inside a Cloudflare request context.
  }
}

/** Call first in a route handler: 429 once this client's IP is over the named limit. */
export async function rateLimit(name: RateLimiterName, req: Request): Promise<void> {
  await checkRateLimit(getLimiter(name), clientKey(req));
}
