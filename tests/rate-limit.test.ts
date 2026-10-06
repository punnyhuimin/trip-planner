import { describe, expect, it, vi } from "vitest";
import { HttpError, handle, json } from "@/lib/http";
import { type RateLimiter, checkRateLimit, clientKey, rateLimit } from "@/lib/rate-limit";

/** A fake binding that allows `limit` calls per key, then refuses. */
function fakeLimiter(limit: number): RateLimiter & { keys: string[] } {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  return {
    keys,
    async limit({ key }) {
      keys.push(key);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
  };
}

function request(ip?: string): Request {
  return new Request("http://localhost/api/trips/ABC/join", {
    headers: ip ? { "cf-connecting-ip": ip } : {},
  });
}

describe("clientKey", () => {
  it("uses the cf-connecting-ip header", () => {
    expect(clientKey(request("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("falls back to one shared key without it", () => {
    expect(clientKey(request())).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows requests under the limit and 429s after it", async () => {
    const limiter = fakeLimiter(2);
    await expect(checkRateLimit(limiter, "1.1.1.1")).resolves.toBeUndefined();
    await expect(checkRateLimit(limiter, "1.1.1.1")).resolves.toBeUndefined();
    const err = await checkRateLimit(limiter, "1.1.1.1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(429);
  });

  it("counts each key separately", async () => {
    const limiter = fakeLimiter(1);
    await checkRateLimit(limiter, "1.1.1.1");
    await expect(checkRateLimit(limiter, "2.2.2.2")).resolves.toBeUndefined();
    expect(limiter.keys).toEqual(["1.1.1.1", "2.2.2.2"]);
  });

  it("allows the request when there is no binding", async () => {
    await expect(checkRateLimit(undefined, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("allows the request when the binding throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: RateLimiter = { limit: () => Promise.reject(new Error("down")) };
    await expect(checkRateLimit(broken, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("becomes a 429 { error } response inside handle()", async () => {
    const limiter = fakeLimiter(0);
    const res = await handle(async () => {
      await checkRateLimit(limiter, "1.1.1.1");
      return json({ ok: true });
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests. Wait a minute and try again." });
  });
});

describe("rateLimit", () => {
  it("allows the request outside a Cloudflare context", async () => {
    await expect(rateLimit("JOIN_LIMITER", request("1.1.1.1"))).resolves.toBeUndefined();
  });
});
