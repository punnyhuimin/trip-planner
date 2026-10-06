// Creates a new D1 migration whose SQL brings the existing migrations up to
// prisma/schema.prisma.
//
//   npm run db:migration:new -- <name>
//
// Prisma 7 has no `--from-local-d1`, and the local D1 file also holds
// wrangler's own `d1_migrations` table, which Prisma would try to drop. So we
// replay migrations/*.sql into a throwaway SQLite file and diff from that.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: npm run db:migration:new -- <snake_case_name>");
  process.exit(1);
}

const dir = "migrations";
const sqlFiles = () =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

const existing = sqlFiles();
const tmp = mkdtempSync(join(tmpdir(), "tripmaker-migrate-"));
const dbPath = join(tmp, "from.db");
const db = new DatabaseSync(dbPath);
for (const file of existing) db.exec(readFileSync(join(dir, file), "utf8"));
db.close();

const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1", ...env },
  });

const sql = run(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    existing.length ? "--from-config-datasource" : "--from-empty",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { DATABASE_URL: `file:${dbPath}` },
);
rmSync(tmp, { recursive: true, force: true });

if (!/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(sql)) {
  console.log("Schema matches the existing migrations; nothing to do.");
  process.exit(0);
}

run("npx", ["wrangler", "d1", "migrations", "create", "tripmaker", name]);
const created = sqlFiles().find((f) => !existing.includes(f));
writeFileSync(join(dir, created), sql);
console.log(`Wrote ${dir}/${created}. Apply it with: npm run db:migrate:local`);
