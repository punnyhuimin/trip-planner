// Step 5 of the planner: conflict detection. Warnings only; nothing is blocked.
// Each rule is its own function so it can be tested on its own. PLAN.md §4.
import { TIME_LABEL } from "@/lib/labels";
import { inSet } from "@/lib/planner/score";
import {
  type PlanSlotDraft,
  type PlannerMember,
  type PlannerWish,
  TIME_BLOCKS,
  type TimeBlock,
  type Warning,
} from "@/lib/types";

export type ConflictInput = { members: PlannerMember[]; wishes: PlannerWish[] };
export type PlacedSlot = Pick<PlanSlotDraft, "wishId" | "dayIndex" | "timeOfDay">;

// Keyword rules, matched case-insensitively against a constraint's title and notes.
const TIME_WORDS = /\b(early|mornings?|sunrise|before\s*9)\b/i;
const BUDGET_WORDS = /\b(budget|cheap|afford\w*|money|spend\w*|broke)\b|\$/i;
const ENERGY_WORDS = /\b(chill\w*|relax\w*|rest|easy)\b/i;

/** A day's total cost above this triggers a budget warning. */
export const BUDGET_DAY_LIMIT = 4;
/** A day whose average energy reaches this triggers an energy warning. */
export const ENERGY_DAY_LIMIT = 2;

type Context = {
  members: PlannerMember[]; // sorted by id, for stable output
  wishById: Map<string, PlannerWish>;
  going: Map<string, Set<string>>; // wishId → members IN (author included)
  slots: PlacedSlot[];
};

function context(input: ConflictInput, slots: PlacedSlot[]): Context {
  const wishById = new Map(input.wishes.map((w) => [w.id, w]));
  return {
    members: [...input.members].sort((a, b) => (a.id < b.id ? -1 : 1)),
    wishById,
    going: new Map(input.wishes.map((w) => [w.id, inSet(w)])),
    slots: slots.filter((s) => wishById.get(s.wishId)?.kind === "ACTIVITY"),
  };
}

const quote = (text: string) => `“${text}”`;

/** "a", "a and b", "a, b and c" */
function list(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The first of the member's constraints matching the keywords, if any. */
function constraintMatching(ctx: Context, memberId: string, words: RegExp) {
  return [...ctx.wishById.values()]
    .filter((w) => w.kind === "CONSTRAINT" && w.authorId === memberId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .find((w) => words.test(`${w.title} ${w.notes ?? ""}`));
}

/** Distinct wishes a member is IN on, per day. Long wishes count once. */
function wishesByDay(ctx: Context, memberId: string): Map<number, PlannerWish[]> {
  const byDay = new Map<number, PlannerWish[]>();
  for (const s of ctx.slots) {
    if (!ctx.going.get(s.wishId)?.has(memberId)) continue;
    const day = byDay.get(s.dayIndex) ?? [];
    const wish = ctx.wishById.get(s.wishId)!;
    if (!day.includes(wish)) day.push(wish);
    byDay.set(s.dayIndex, day);
  }
  return new Map([...byDay].sort(([a], [b]) => a - b));
}

/** Said no early mornings, but IN on something in an EARLY_MORNING slot. */
export function timeConflicts(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  const ctx = context(input, slots);
  const warnings: Warning[] = [];
  for (const m of ctx.members) {
    const c = constraintMatching(ctx, m.id, TIME_WORDS);
    if (!c) continue;
    const seen = new Set<string>();
    for (const s of ctx.slots) {
      if (s.timeOfDay !== "EARLY_MORNING" || seen.has(s.wishId)) continue;
      if (!ctx.going.get(s.wishId)?.has(m.id)) continue;
      seen.add(s.wishId);
      const w = ctx.wishById.get(s.wishId)!;
      warnings.push({
        type: "TIME",
        memberIds: [m.id],
        wishIds: [c.id, w.id],
        message: `${m.name} said ${quote(c.title)} but is down for the Day ${s.dayIndex + 1} ${w.title} — worth a chat?`,
      });
    }
  }
  return warnings;
}

/** Set a budget, but a day's activities add up to more than BUDGET_DAY_LIMIT cost points. */
export function budgetConflicts(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  const ctx = context(input, slots);
  const warnings: Warning[] = [];
  for (const m of ctx.members) {
    const c = constraintMatching(ctx, m.id, BUDGET_WORDS);
    if (!c) continue;
    for (const [day, wishes] of wishesByDay(ctx, m.id)) {
      const total = wishes.reduce((sum, w) => sum + w.costLevel, 0);
      if (total <= BUDGET_DAY_LIMIT) continue;
      const pricey = wishes.filter((w) => w.costLevel > 0).map((w) => w.title);
      warnings.push({
        type: "BUDGET",
        memberIds: [m.id],
        wishIds: [c.id, ...wishes.map((w) => w.id)],
        message: `${m.name} said ${quote(c.title)}, but Day ${day + 1} adds up for them (${list(pricey)}) — maybe swap in something cheaper?`,
      });
    }
  }
  return warnings;
}

/**
 * Asked to keep it chill, but a day they're scheduled on averages
 * ENERGY_DAY_LIMIT or more. Checked per day, so the warning names the day.
 */
export function energyConflicts(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  const ctx = context(input, slots);
  const warnings: Warning[] = [];
  for (const m of ctx.members) {
    const c = constraintMatching(ctx, m.id, ENERGY_WORDS);
    if (!c) continue;
    for (const [day, wishes] of wishesByDay(ctx, m.id)) {
      const avg = wishes.reduce((sum, w) => sum + w.energy, 0) / wishes.length;
      if (avg < ENERGY_DAY_LIMIT) continue;
      const busy = wishes.filter((w) => w.energy >= ENERGY_DAY_LIMIT).map((w) => w.title);
      warnings.push({
        type: "ENERGY",
        memberIds: [m.id],
        wishIds: [c.id, ...wishes.map((w) => w.id)],
        message: `${m.name} said ${quote(c.title)}, but Day ${day + 1} is full-on for them (${list(busy)}) — worth building in a breather?`,
      });
    }
  }
  return warnings;
}

/** IN on two different things in the same block. */
export function doubleBookings(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  const ctx = context(input, slots);
  const warnings: Warning[] = [];
  const cells = new Map<string, { day: number; block: TimeBlock; wishIds: string[] }>();
  for (const s of ctx.slots) {
    const key = `${s.dayIndex}:${s.timeOfDay}`;
    const cell = cells.get(key) ?? { day: s.dayIndex, block: s.timeOfDay, wishIds: [] };
    if (!cell.wishIds.includes(s.wishId)) cell.wishIds.push(s.wishId);
    cells.set(key, cell);
  }
  const sortedCells = [...cells.values()].sort(
    (a, b) => a.day - b.day || TIME_BLOCKS.indexOf(a.block) - TIME_BLOCKS.indexOf(b.block),
  );
  for (const m of ctx.members) {
    for (const cell of sortedCells) {
      const mine = cell.wishIds.filter((id) => ctx.going.get(id)?.has(m.id)).sort();
      if (mine.length < 2) continue;
      const titles = mine.map((id) => ctx.wishById.get(id)!.title);
      warnings.push({
        type: "DOUBLE_BOOKING",
        memberIds: [m.id],
        wishIds: mine,
        message: `${m.name} is down for both ${list(titles)} on Day ${cell.day + 1} (${TIME_LABEL[cell.block].toLowerCase()}) — they'll need to pick one.`,
      });
    }
  }
  return warnings;
}

/** Has MUST wishes, but none of them made the plan. */
export function unscheduledMusts(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  const ctx = context(input, slots);
  const scheduled = new Set(ctx.slots.map((s) => s.wishId));
  const warnings: Warning[] = [];
  for (const m of ctx.members) {
    const musts = [...ctx.wishById.values()].filter(
      (w) => w.kind === "ACTIVITY" && w.priority === "MUST" && w.authorId === m.id,
    );
    if (musts.length === 0 || musts.some((w) => scheduled.has(w.id))) continue;
    warnings.push({
      type: "UNSCHEDULED_MUST",
      memberIds: [m.id],
      wishIds: musts.map((w) => w.id),
      message: `None of ${m.name}’s must-dos are in the plan yet (${list(musts.map((w) => w.title))}) — can the group fit one in?`,
    });
  }
  return warnings;
}

/** Every rule, in a fixed order. Used by the generator and by the state endpoint. */
export function detectWarnings(input: ConflictInput, slots: PlacedSlot[]): Warning[] {
  return [
    ...timeConflicts(input, slots),
    ...budgetConflicts(input, slots),
    ...energyConflicts(input, slots),
    ...doubleBookings(input, slots),
    ...unscheduledMusts(input, slots),
  ];
}
