<p align="center">
  <img src="docs/banner.svg" alt="TripMaker: Everyone's wishes. One plan. Nobody left behind." width="100%">
</p>

<p align="center">
  <b>The group trip planner that turns ten people's wish lists into one day-by-day plan.</b><br>
  No accounts. No spreadsheets. No 200-message group chat.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-000?logo=nextdotjs">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers_+_D1-F38020?logo=cloudflare&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
</p>

---

## Why TripMaker?

Planning a trip with friends usually goes like this: one person makes a spreadsheet, half the group never opens it, the quiet friend's one must-do quietly disappears, and someone finds out on day two that the 5 a.m. sunrise hike clashes with their "no early mornings" rule.

TripMaker fixes that:

- 🎟️ **Join with a code.** Share a 10-character code like `K7QX2MPW4R`. Anyone with it picks a name and they're in, with no sign-up and no password.
- 💭 **Everyone adds wishes.** Activities ("ramen crawl", "sunrise hike") and constraints ("no early mornings", "budget under $50/day"), each with a priority, time of day, cost and energy level.
- 👍 **React IN / MAYBE / SKIP.** The board shows what the whole group wants and what only one or two people want.
- 🗓️ **Get a plan.** The host generates a day-by-day schedule. Popular wishes become **group** activities, and smaller ones become **splinter** outings for the people who want them.
- ⚖️ **Nobody's wish left behind.** A fairness pass makes sure every member gets at least one of their must-dos into the plan.
- ⚠️ **Heads-up before the trip.** Conflicts show up as friendly warnings, e.g. _"Priya said no early mornings but is down for the Day 2 sunrise hike. Worth a chat?"_
- 📸 **Then it becomes a journal.** After the trip, members tick off what they did and add a one-line memory and a photo.

## How it works

```
 Host starts a trip ──► shares the code ──► friends join
                                               │
                     everyone adds wishes ◄────┘
                               │
                     everyone reacts IN / MAYBE / SKIP
                               │
             host hits "Generate plan" ──► score ─► classify ─► place ─► fairness pass
                               │
                 Plan tab  +  Heads-up tab (conflict warnings)
```

The planner is a pure, deterministic function, so the same wishes and reactions always give the same plan:

1. **Score** each wish: `(IN + 0.5 × MAYBE) × priority weight` (MUST 3, LOVE 2, NICE 1).
2. **Classify:** at least 60% of the group IN → **group**; 2 or more people IN → **splinter**; only the author → **solo**.
3. **Place** it into one of five daily blocks (early morning → night). Pinned slots never move, there's at most one intense group activity per day, and every day keeps a free block for rest.
4. **Fairness pass:** swap in any member's unscheduled MUST where that doesn't cost someone else their only MUST.
5. **Detect conflicts:** time-of-day, budget, energy and double-booking. These produce warnings and never block anything.

The full algorithm is in [PLAN.md §4](PLAN.md#4-plan-generation-algorithm), and the decisions it leaves open are settled in [TASKS.md](TASKS.md).

Everyone sees changes live: the trip page polls every 5 seconds, and when nothing has changed the server reads only one row and returns `{ unchanged: true }`, which keeps the app well inside Cloudflare's free tier.

## Tech stack

| Layer      | Choice                                                                |
| ---------- | --------------------------------------------------------------------- |
| Framework  | Next.js (App Router) + TypeScript + Tailwind CSS                      |
| Hosting    | Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) |
| Database   | Cloudflare D1 (SQLite) through Prisma 7 + `@prisma/adapter-d1`        |
| Validation | Zod                                                                   |
| Testing    | Vitest (unit) + Playwright (end-to-end)                               |

## Getting started

Requires **Node.js 24+**.

```bash
npm install            # also runs prisma generate
npm run db:reset       # create the local D1 database, migrate and seed it
npm run dev            # http://localhost:3000
```

The seed creates a demo trip with 10 members and about 30 wishes. Join it at **http://localhost:3000/t/DEMO42**.

### Useful scripts

| Command                      | What it does                                                     |
| ---------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                | Next.js dev server with Cloudflare bindings                      |
| `npm run preview`            | Build and run in the local Workers runtime                       |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit`                                          |
| `npm test`                   | Vitest unit tests                                                |
| `npm run test:e2e`           | Playwright smoke test (uses its own database in `.wrangler/e2e`) |
| `npm run db:migration:new`   | Generate a new SQL migration from the Prisma schema              |
| `npm run db:migrate:local`   | Apply migrations to the local D1 database                        |
| `npm run db:seed`            | Seed the demo trip (`DEMO42`)                                    |
| `npm run db:reset`           | Wipe local state, migrate and seed                               |
| `npm run db:query -- "SQL"`  | Run SQL against local D1 (Prisma Studio can't open D1)           |

### Deploy to Cloudflare

```bash
npm run db:migrate:remote   # apply migrations to the remote D1 database
npm run deploy              # OpenNext build + wrangler deploy
```

## Project status

TripMaker is being built phase by phase, following [PLAN.md](PLAN.md) and [TASKS.md](TASKS.md).

- [x] **Phase 1:** project setup (Next.js, Workers, D1, Prisma, tests, seed)
- [x] **Phase 2:** trips, joining and identity
- [ ] **Phase 3:** wishes and reactions _(in progress)_
- [ ] **Phase 4:** planner engine
- [ ] **Phase 5:** Plan and Heads-up UI
- [ ] **Phase 6:** journal mode
- [ ] **Phase 7:** polish and ship

## Project layout

```
app/          pages and API route handlers (thin: auth → Zod parse → lib call)
components/   UI components, one per file
lib/          business logic: auth, state, schemas, and the pure planner
prisma/       schema and the deterministic seed
migrations/   SQL migrations applied with wrangler
tests/        Vitest unit tests
e2e/          Playwright smoke test
```

Contributors (human or AI) should read [CLAUDE.md](CLAUDE.md) for the architecture rules and conventions.
