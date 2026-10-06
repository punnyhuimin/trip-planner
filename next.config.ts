import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Turbopack's wasm loader (pulled in by Prisma's query compiler) has a dynamic
  // path that makes the file tracer match the whole project. OpenNext bundles
  // every traced `.wasm` into the Worker, which would blow past the free plan's
  // 3 MiB limit. The only wasm the app needs is Prisma's SQLite compiler, which
  // Turbopack emits into `.next`, so drop other wasm (Prisma's other engines,
  // @vercel/og, which the app doesn't use) and dev-only tools.
  outputFileTracingExcludes: {
    "/**": [
      "./node_modules/@prisma/**/*.wasm",
      "./node_modules/blake3-wasm/**",
      "./node_modules/next/dist/compiled/@vercel/og/**",
      "./node_modules/prisma/**",
      "./node_modules/@prisma/dev/**",
      "./node_modules/{env-paths,grammex,graphmatch,robust-predicates,zeptomatch}/**",
      "./node_modules/@prisma/studio-core/**",
      "./node_modules/@electric-sql/**",
      "./node_modules/wrangler/**",
      "./node_modules/miniflare/**",
      "./node_modules/workerd/**",
      "./node_modules/@cloudflare/workerd-*/**",
      "./node_modules/typescript/**",
      "./node_modules/@playwright/**",
      "./node_modules/playwright*/**",
      "./node_modules/esbuild/**",
      "./node_modules/@esbuild/**",
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
      "./node_modules/vitest/**",
      "./node_modules/@vitest/**",
      "./node_modules/eslint*/**",
      "./node_modules/@typescript-eslint/**",
      "./node_modules/@next/swc-*/**",
      "./.wrangler/**",
      "./.open-next/**",
      "./e2e/**",
      "./tests/**",
    ],
  },
};

export default nextConfig;

// Lets `next dev` see Cloudflare bindings (e.g. the D1 `DB` binding).
initOpenNextCloudflareForDev();
