// Runs route handlers against a real, in-memory D1 database (Miniflare via
// wrangler's getPlatformProxy) with the repo's migrations applied. Only the
// request-scoped Next/Cloudflare APIs are faked: getCloudflareContext() and
// cookies(). Each test file wires them up with:
//
//   vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
//   vi.mock("next/headers", async () => (await import("./harness")).headersMock);
//   const t = setupApi();
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PrismaD1 } from "@prisma/adapter-d1";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { getPlatformProxy } from "wrangler";
import { PrismaClient } from "@/lib/generated/prisma/client";

type CookieOptions = Record<string, unknown>;
export type Browser = { cookies: Map<string, { value: string; options: CookieOptions }> };

const context = { env: {} as Partial<CloudflareEnv> };
let current: Browser = newBrowser();

export const cloudflareMock = { getCloudflareContext: () => context };

export const headersMock = {
  cookies: async () => ({
    get: (name: string) => {
      const c = current.cookies.get(name);
      return c ? { name, value: c.value } : undefined;
    },
    set: (name: string, value: string, options: CookieOptions = {}) => {
      current.cookies.set(name, { value, options });
    },
  }),
};

export function newBrowser(): Browser {
  return { cookies: new Map() };
}

/** Makes later requests carry this browser's cookies. */
export function actAs(browser: Browser): Browser {
  current = browser;
  return browser;
}

function migrationStatements(): string[] {
  const dir = path.resolve(import.meta.dirname, "../../migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .flatMap((f) => readFileSync(path.join(dir, f), "utf8").split(/;\s*$/m))
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

/** Boots a fresh database for this test file and returns a Prisma client on it. */
export function setupApi() {
  let dispose: (() => Promise<void>) | undefined;
  const harness = { db: undefined as unknown as PrismaClient };

  beforeAll(async () => {
    const proxy = await getPlatformProxy<CloudflareEnv>({ persist: false });
    dispose = proxy.dispose;
    const d1 = proxy.env.DB;
    await d1.batch(migrationStatements().map((s) => d1.prepare(s)));
    // Only DB: with no rate-limit bindings, rateLimit() lets every request through.
    context.env = { DB: d1 };
    harness.db = new PrismaClient({ adapter: new PrismaD1(d1) });
  }, 30_000);

  afterAll(async () => {
    await harness.db?.$disconnect();
    await dispose?.();
  });

  beforeEach(() => {
    actAs(newBrowser());
  });

  return harness;
}

export function request(method: string, body?: unknown, url = "http://localhost/api"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function params<T extends Record<string, string>>(p: T): { params: Promise<T> } {
  return { params: Promise.resolve(p) };
}

export async function body<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
