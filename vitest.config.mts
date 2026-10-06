import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "app/api/**"],
      exclude: ["lib/generated/**"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
  resolve: {
    alias: [
      // The cloudflare-runtime client imports `.wasm?module`, which Node can't
      // load. Tests use the identical client generated for the Node runtime.
      {
        find: "@/lib/generated/prisma/client",
        replacement: path.resolve(root, "lib/generated/prisma-node/client"),
      },
      { find: "@", replacement: root },
    ],
  },
});
