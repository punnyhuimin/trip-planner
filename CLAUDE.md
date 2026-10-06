# What this is

TripMaker: a group trip planner. Members join a trip by code, add wishes, react IN/MAYBE/SKIP, and the host generates a day-by-day plan with conflict warnings. It runs on Next.js (App Router), deployed to Cloudflare Workers via OpenNext, with D1 (SQLite) through Prisma 7.

- [PLAN.md](PLAN.md) is the spec: data model (§3), planner algorithm (§4), UI (§5), API routes (§6), phases (§7).
- [TASKS.md](TASKS.md) breaks phases 1–5 into numbered tasks (T01…T31) and settles the design decisions PLAN.md leaves open. Read its "Architecture overview" before building anything new.

## Workflow rules (from PLAN.md / TASKS.md)

- Do **one task at a time**, in order. Each task is one commit, using the exact commit message TASKS.md gives (e.g. `feat(phase-1): add deterministic demo seed`). Don't combine tasks; if one grows, split it and say so.
- Before committing, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` once it exists.
- **Ask before adding any dependency** that isn't in PLAN.md's Tech Stack or TASKS.md's "Dependencies to confirm" list.

## Commands

Scripts that exist now:

```bash
npm run dev          # next dev (sees Cloudflare bindings via initOpenNextCloudflareForDev)
npm run build        # next build
npm run lint         # eslint
npm run preview      # OpenNext build + run in the local Workers runtime
npm run deploy       # OpenNext build + deploy to Cloudflare
npm run cf-typegen   # regenerate cloudflare-env.d.ts after changing wrangler.jsonc bindings
```

Scripts that later tasks add (T02–T06); use these names when you create them:

```bash
npm run typecheck            # tsc --noEmit
npm run format / format:check
npm test                     # vitest; single file: npx vitest run tests/foo.test.ts -t "test name"
npm run test:e2e             # playwright; single spec: npx playwright test e2e/smoke.spec.ts
npm run db:migration:new     # wrangler d1 migrations create + prisma migrate diff
npm run db:migrate:local     # wrangler d1 migrations apply tripmaker --local
npm run db:migrate:remote
npm run db:seed              # tsx prisma/seed.ts (deterministic demo trip, code DEMO42)
npm run db:reset             # wipe .wrangler/state, migrate, seed
npm run db:query -- "SELECT * FROM Trip"   # replaces Prisma Studio, which can't open D1
```

## Architecture

**Runtime.** OpenNext turns the Next.js build into a Worker (`.open-next/worker.js`, configured in [wrangler.jsonc](wrangler.jsonc)). It uses the Node.js runtime: never add `export const runtime = "edge"`. Cloudflare bindings (`DB`, later `R2`) come from `getCloudflareContext().env`. Types live in the generated [cloudflare-env.d.ts](cloudflare-env.d.ts); don't edit that file by hand.

**Database (D1 + Prisma).**

- `lib/db.ts` `getDb()` builds a Prisma client **per request** from `env.DB`, wrapped in React `cache()`. There's no global singleton, because the binding belongs to the request.
- **D1 ignores `$transaction`.** Order multi-step writes so that stopping halfway leaves the data valid or easy to repair.
- Every write route calls `bumpVersion(db, tripId)` **last**. Polling relies on `Trip.version`.
- No `prisma migrate dev`. Migrations are SQL files in `migrations/` (wrangler's folder), produced by `prisma migrate diff`. Commit them.
- Keep the schema Postgres-portable: no raw SQL and no `@db.*` native types.
- Local D1 state lives in `.wrangler/state` (shared by dev, preview and seed). E2E uses a separate `.wrangler/e2e`.

**Identity.** There are no accounts. Each trip has a cookie `tm_<CODE>` holding `Member.token` (httpOnly, sameSite lax). `Member.token` is read **only** in `lib/auth.ts`. Every query that builds API output uses an explicit `select` that leaves `token` out.

**Route handlers stay thin.** Each one wraps its body in `handle()` from `lib/http.ts`, which maps ZodError to 400, `HttpError` to its status, and anything else to 500. Error responses are always `{ error }`. A handler then calls `requireMember`/`requireHost` and parses the input with a Zod schema from `lib/schemas.ts`. `params` and `cookies()` are async, so always `await` them.

**State and polling.**

- `GET /api/trips/[code]/state?since=<v>` reads only the Trip row and returns `{ unchanged: true }` when the version hasn't moved. This keeps polling within D1's free-tier read limits. Otherwise it returns a full `TripState` from `lib/state.ts` `buildTripState()`.
- The trip page (server component) calls `buildTripState()` directly. The client hook `useTripState` polls every 5 s, pauses while `document.hidden`, and exposes `refresh()`.
- **Polling must never reset forms.** Form components seed their own `useState` once from props and are never keyed on `version`.
- Warnings are **not stored**. The state endpoint recomputes them with `detectWarnings()` on every full fetch.

**Planner (`lib/planner/*`, re-exported as `lib/planner.ts`).** This is pure code with no Prisma import and no I/O. It uses its own `Planner*` types, not Prisma models. It must be deterministic: break ties by score, then `createdAt`, then `id`. TASKS.md Phase 4 settles the details PLAN.md leaves open (long wishes take two slots, what counts as a rest block, the budget rule, the order for `ANY` placement); follow it exactly.

## Conventions

- Business logic lives in `lib/`, pure and tested. Shared types go in `lib/types.ts`. Components go in `components/`, one per file.
- No `any`.
- Member colors render with inline `style={{ backgroundColor }}`, never dynamic Tailwind classes. Always pair a color with a name or initial.
- Mobile-first; the target width is 375px.
- Tabs are driven by the `?tab=wishes|plan|headsup|group` search param.
