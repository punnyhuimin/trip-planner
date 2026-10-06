import { defineConfig } from "prisma/config";

// The app talks to D1 through the driver adapter, so Prisma only needs a URL
// for `prisma migrate diff --from-config-datasource`. scripts/new-migration.mjs
// points DATABASE_URL at the local D1 SQLite file for that.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./.wrangler/prisma-placeholder.db",
  },
});
