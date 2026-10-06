# TripMaker — Implementation Plan

A collaborative trip-planning web app where a group (up to ~10 people) adds personal trip wishes, reacts to each other's wishes, and gets a shared day-by-day plan that balances group activities with optional side outings.

> **For Claude Code:** Work through the phases in order. Finish one phase completely (including its acceptance checks) before starting the next. After each phase, run the tests and linter, fix any failures, and summarize what was done. Ask before adding any dependency not listed in the Tech Stack section.

---

## 1. Goals

- Every member can add wishes privately-in-spirit but visibly-in-practice (everyone sees the board).
- The group can see which wishes are shared vs. personal.
- A trip plan is generated automatically and can be adjusted by hand.
- Conflicts (e.g. "no early mornings" vs. a sunrise hike) are surfaced before the trip.
- Every member gets at least one of their must-dos into the plan ("nobody's wish left behind").
- After the trip, the log becomes a shared journal.

### Non-goals (for v1)
- Booking, payments, maps, or external travel APIs.
- Full user accounts and passwords.
- Native mobile apps (the web app must be mobile-friendly instead).

---

## 2. Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Hosting:** Cloudflare Workers via the OpenNext adapter (`@opennextjs/cloudflare` + `wrangler`)
- **Database:** Cloudflare D1 (SQLite) via Prisma 7 + `@prisma/adapter-d1` (schema must work unchanged on Postgres later). Migrations are applied with `wrangler d1 migrations`, not `prisma migrate dev`. D1 ignores Prisma transactions, so multi-step writes must be ordered to be safe if they stop halfway.
- **File storage:** Cloudflare R2 for journal photos (Phase 6)
- **Realtime:** Polling every 5 seconds via a lightweight `GET /api/trips/[code]/state?since=<version>` endpoint (good enough for 10 users; no websockets in v1). Every write bumps `Trip.version`. When nothing has changed, the endpoint reads only the Trip row and returns `{ unchanged: true }`, which keeps polling within D1's free-tier read limits.
- **Validation:** Zod
- **Testing:** Vitest for unit tests, Playwright for one end-to-end smoke test
- **Linting/format:** ESLint + Prettier

---

## 3. Core Concepts & Data Model

```prisma
model Trip {
  id          String   @id @default(cuid())
  code        String   @unique        // 6-char join code, e.g. "K7QX2M"
  name        String
  destination String?
  startDate   DateTime
  endDate     DateTime
  phase       TripPhase @default(PLANNING)
  version     Int      @default(0)    // bumped on every write; lets polls skip unchanged state
  createdAt   DateTime @default(now())
  members     Member[]
  wishes      Wish[]
  slots       PlanSlot[]
}

enum TripPhase { PLANNING  LOCKED  ON_TRIP  JOURNAL }

model Member {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  name      String
  color     String               // avatar color, assigned on join
  isHost    Boolean  @default(false)
  token     String   @unique     // random secret stored in a cookie to identify the member
  wishes    Wish[]
  reactions Reaction[]
  @@unique([tripId, name])
}

model Wish {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  authorId    String
  author      Member   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  title       String
  notes       String?
  kind        WishKind             // ACTIVITY or CONSTRAINT
  priority    Priority             // only meaningful for ACTIVITY
  timeOfDay   TimeOfDay @default(ANY)
  durationHrs Float     @default(2)
  costLevel   Int       @default(1) // 0=free .. 3=expensive
  energy      Int       @default(1) // 0=chill .. 3=intense
  tags        String    @default("") // comma-separated
  done        Boolean   @default(false)
  memory      String?               // post-trip one-liner
  photoUrl    String?               // post-trip, R2 object key
  reactions   Reaction[]
  slots       PlanSlot[]
  createdAt   DateTime  @default(now())
}

enum WishKind  { ACTIVITY  CONSTRAINT }
enum Priority  { MUST  LOVE  NICE }
enum TimeOfDay { EARLY_MORNING  MORNING  AFTERNOON  EVENING  NIGHT  ANY }

model Reaction {
  id       String   @id @default(cuid())
  wishId   String
  wish     Wish     @relation(fields: [wishId], references: [id], onDelete: Cascade)
  memberId String
  member   Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  value    ReactionValue
  @@unique([wishId, memberId])
}

enum ReactionValue { IN  MAYBE  SKIP }

model PlanSlot {
  id        String    @id @default(cuid())
  tripId    String
  trip      Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  wishId    String
  wish      Wish      @relation(fields: [wishId], references: [id], onDelete: Cascade)
  dayIndex  Int                  // 0-based day of trip
  timeOfDay TimeOfDay
  track     SlotTrack            // GROUP or SPLINTER
  pinned    Boolean   @default(false) // manually placed; the generator must not move it
}

enum SlotTrack { GROUP  SPLINTER }
```

**Identity model:** No passwords. Joining a trip with a code + display name creates a `Member` and sets an httpOnly cookie with that member's `token`. The trip creator is the host. Rejoining from a new device: the host can generate a one-time rejoin link for a member.

**Constraints:** Wishes of kind `CONSTRAINT` (e.g. "no early mornings", "budget under $50/day", "vegetarian food only") are not scheduled; they are used for conflict detection.

---

## 4. Plan Generation Algorithm

Implement as a **pure function** in `lib/planner.ts` so it is easy to unit test:

```ts
generatePlan(input: {
  days: number;
  members: Member[];
  wishes: Wish[];          // with reactions
  pinnedSlots: PlanSlot[];
}): { slots: PlanSlotDraft[]; unscheduled: Wish[]; warnings: Warning[] }
```

### Step 1 — Score each activity wish
- Author counts as IN.
- `support = count(IN) + 0.5 * count(MAYBE)`
- Priority weight: MUST = 3, LOVE = 2, NICE = 1
- `score = support * priorityWeight`

### Step 2 — Classify
- **GROUP** if `count(IN) >= ceil(0.6 * memberCount)`
- **SPLINTER** if `count(IN) >= 2` but below the group threshold
- **SOLO** if only the author is IN → still schedulable as a splinter slot, but lowest priority

### Step 3 — Place
- Each day has 5 time blocks: EARLY_MORNING, MORNING, AFTERNOON, EVENING, NIGHT.
- Respect pinned slots first; never move them.
- Place GROUP wishes by descending score into their preferred time block (or any free block if `ANY`). At most one GROUP activity per block. Wishes longer than 4 hours take two adjacent blocks.
- Spread intensity: avoid more than one `energy >= 3` group activity per day.
- Place SPLINTER/SOLO wishes into blocks alongside group activities only when none of the splinter's IN members are needed elsewhere at that time.
- Leave at least one free block per day (rest time).

### Step 4 — Fairness pass ("nobody's wish left behind")
- For each member, check whether at least one of their MUST wishes is scheduled.
- If not, try to swap it in for the lowest-scoring scheduled item it could replace without breaking another member's only scheduled MUST.
- Anyone still without a MUST scheduled produces a warning.

### Step 5 — Conflict detection (produces warnings, never blocks)
Rule-based checks, each in its own small function:
- Time conflict: a member's constraint mentions mornings / early (keyword match: "early", "morning", "sunrise", "before 9") and they reacted IN to an EARLY_MORNING slot.
- Budget conflict: a member's constraint contains a budget keyword and a scheduled day's total `costLevel` sum exceeds 4.
- Energy conflict: a member's constraint mentions "chill", "relax", "rest", or "easy" and their scheduled days average `energy >= 2`.
- Double-booking: a member is IN on two slots in the same block.
- Unscheduled MUST (from Step 4).

Each warning: `{ type, memberIds, wishIds, message }`. Keep messages human, e.g. *"Priya said no early mornings but is down for the Day 2 sunrise hike — worth a chat?"*

The generator must be **deterministic** (same input → same output; break ties by `createdAt`).

---

## 5. Pages & UI

All pages mobile-first. Each member is shown with their name and color dot everywhere.

1. **`/`** — Landing: "Start a trip" (name, destination, dates, your name) or "Join a trip" (code + your name).
2. **`/t/[code]`** — Trip home with tabs:
   - **Wishes board:** cards grouped by author, filterable by priority/tag. Each card shows IN / MAYBE / SKIP buttons and live reaction avatars. A sticky "Add a wish" button opens a form (title, kind, priority, time of day, duration, cost, energy, tags, notes).
   - **Plan:** day tabs; each day shows the 5 time blocks with GROUP activities as large cards and SPLINTER activities as smaller cards labelled with who's going. Host sees "Regenerate plan" and can drag cards between blocks (dragging pins them).
   - **Heads-up:** list of warnings from the generator, plus the "nobody's wish left behind" checklist with a ✅ or ⚠️ per member.
   - **Group:** member list, share code + copy link button, host controls (rejoin links, change phase).
3. **Journal mode** (when phase = JOURNAL): Plan tab becomes a timeline where members mark wishes done and add a one-line memory and an optional photo (resized client-side to ≤ 800px, uploaded to R2; the wish stores only the object key).

Live updates: the trip page polls the state endpoint every 5 seconds and merges changes without losing open form input.

---

## 6. API Routes

All routes validate input with Zod and check the member cookie belongs to the trip.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/trips` | Create trip + host member |
| POST | `/api/trips/[code]/join` | Join as a new member |
| GET | `/api/trips/[code]/state?since=<version>` | Full trip state (trip, members, wishes, reactions, slots, warnings), or `{ unchanged: true }` if `version` hasn't moved |
| POST | `/api/trips/[code]/wishes` | Add wish |
| PATCH | `/api/trips/[code]/wishes/[id]` | Edit wish (author only), or mark done / add memory (any member in journal mode) |
| DELETE | `/api/trips/[code]/wishes/[id]` | Delete wish (author or host) |
| PUT | `/api/trips/[code]/wishes/[id]/reaction` | Set own reaction |
| POST | `/api/trips/[code]/plan/generate` | Host only: rerun generator, keeping pinned slots |
| PATCH | `/api/trips/[code]/plan/slots/[id]` | Host only: move a slot (sets `pinned = true`) |
| PATCH | `/api/trips/[code]/phase` | Host only: change trip phase |

---

## 7. Phases

### Phase 1 — Project setup
- Scaffold Next.js + TypeScript + Tailwind + ESLint + Prettier.
- Set up the OpenNext Cloudflare adapter and `wrangler.jsonc` with a `DB` D1 binding.
- Add Prisma with the D1 adapter, write the schema above, and apply the first migration to the local D1 database with `wrangler d1 migrations apply --local`.
- Add Vitest and Playwright configs, plus a `seed` script that creates a demo trip with 10 members and ~30 wishes with varied reactions.
- **Done when:** `npm run dev`, `npm run preview`, `npm run lint`, `npm test`, and `npm run db:seed` all succeed.

### Phase 2 — Trips, joining, identity
- Landing page, create trip, join trip, member cookie, Group tab.
- **Done when:** two browsers can join the same trip under different names and both see each other in the member list within 5 seconds.

### Phase 3 — Wishes and reactions
- Wishes board, add/edit/delete wish, reactions, polling.
- **Done when:** a wish added in one browser appears in another, and reactions update live.

### Phase 4 — Planner engine
- Implement `lib/planner.ts` exactly per Section 4, with no database access inside it.
- Unit tests covering: group vs. splinter classification, pinned slots respected, at most one intense group activity per day, a free block per day, fairness swap, each conflict type, and determinism.
- **Done when:** all planner tests pass and the seeded trip produces a plan with no double-bookings.

### Phase 5 — Plan & Heads-up UI
- Plan tab with day tabs and blocks, host regenerate button, drag-to-move (pins slot), Heads-up tab with warnings and fairness checklist.
- **Done when:** regenerating the seeded trip shows a full plan, moving a card survives a regenerate, and warnings display readable messages.

### Phase 6 — Journal mode
- Phase switching, done toggles, memories, photo upload with client-side resize to an R2 bucket (add an `R2` binding).
- **Done when:** in JOURNAL phase a member can mark a wish done with a memory and photo, and others see it.

### Phase 7 — Polish & ship
- Empty states, loading states, error toasts, accessibility pass (labels, focus states, color not the only signal for reaction state).
- One Playwright test: create trip → second user joins → both add wishes → react → host generates plan → plan visible to both.
- README with setup, scripts, deploying to Cloudflare, and how to switch to Postgres.
- Deploy: apply migrations to the remote D1 database, then `npm run deploy`.
- **Done when:** the Playwright test passes, the app works well on a 375px-wide screen, and two phones on mobile data can use the same trip at the `*.workers.dev` URL.

---

## 8. Conventions

- Keep business logic in `lib/` (pure, tested); route handlers stay thin.
- No `any` types. Shared types live in `lib/types.ts`.
- Small components in `components/`; one component per file.
- Commit after each phase with a message like `feat(phase-3): wishes and reactions`.
