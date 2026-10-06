// Step 3 of the planner: placing wishes on a days × 5 grid. PLAN.md §4,
// with the interpretations settled in TASKS.md Phase 4.
import type { RankedWish } from "@/lib/planner/score";
import { type PlanSlotDraft, type SlotTrack, TIME_BLOCKS, type TimeBlock } from "@/lib/types";

/** Order in which ANY-time wishes try blocks. */
export const ANY_ORDER: TimeBlock[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "EARLY_MORNING"];

/** Wishes longer than this take two adjacent blocks. */
export const LONG_WISH_HOURS = 4;
/** Energy at or above this counts as intense (max one intense group activity a day). */
export const INTENSE_ENERGY = 3;

const blockIndex = (b: TimeBlock) => TIME_BLOCKS.indexOf(b);

/** Two adjacent blocks for a long wish starting at `b` (or ending at it, for NIGHT). */
function pairFor(b: TimeBlock): TimeBlock[] {
  const i = blockIndex(b);
  return i + 1 < TIME_BLOCKS.length ? [b, TIME_BLOCKS[i + 1]] : [TIME_BLOCKS[i - 1], b];
}

/** The block spans a wish may occupy, in the order they should be tried. */
export function candidateSpans(rw: RankedWish): TimeBlock[][] {
  const { timeOfDay, durationHrs } = rw.wish;
  const blocks = timeOfDay === "ANY" ? ANY_ORDER : [timeOfDay];
  const long = durationHrs > LONG_WISH_HOURS;
  const spans: TimeBlock[][] = [];
  for (const b of blocks) {
    const span = long ? pairFor(b) : [b];
    if (!spans.some((s) => s.join() === span.join())) spans.push(span);
  }
  return spans;
}

export function trackFor(rw: RankedWish): SlotTrack {
  return rw.cls === "GROUP" ? "GROUP" : "SPLINTER";
}

/** Sorts slots by day, block, GROUP before SPLINTER, then wish id. */
export function compareSlots(a: PlanSlotDraft, b: PlanSlotDraft): number {
  return (
    a.dayIndex - b.dayIndex ||
    blockIndex(a.timeOfDay) - blockIndex(b.timeOfDay) ||
    (a.track === b.track ? 0 : a.track === "GROUP" ? -1 : 1) ||
    (a.wishId < b.wishId ? -1 : a.wishId > b.wishId ? 1 : 0)
  );
}

/**
 * The plan being built. Rules enforced by `canPlace`:
 * - at most one GROUP activity per block;
 * - nobody is in two things in the same block;
 * - at most one intense GROUP activity per day;
 * - every day keeps at least one block with no slots at all (rest).
 */
export class Grid {
  readonly slots: PlanSlotDraft[] = [];

  constructor(
    readonly days: number,
    private readonly ranked: Map<string, RankedWish>,
  ) {}

  private inCell(day: number, block: TimeBlock): PlanSlotDraft[] {
    return this.slots.filter((s) => s.dayIndex === day && s.timeOfDay === block);
  }

  isEmpty(day: number, block: TimeBlock): boolean {
    return this.inCell(day, block).length === 0;
  }

  emptyBlocks(day: number): number {
    return TIME_BLOCKS.filter((b) => this.isEmpty(day, b)).length;
  }

  /** Members already committed to something in this block. */
  busy(day: number, block: TimeBlock): Set<string> {
    const ids = new Set<string>();
    for (const s of this.inCell(day, block)) {
      for (const m of this.ranked.get(s.wishId)?.inSet ?? []) ids.add(m);
    }
    return ids;
  }

  private intenseGroups(day: number): number {
    const ids = new Set(
      this.slots
        .filter(
          (s) =>
            s.dayIndex === day &&
            s.track === "GROUP" &&
            (this.ranked.get(s.wishId)?.wish.energy ?? 0) >= INTENSE_ENERGY,
        )
        .map((s) => s.wishId),
    );
    return ids.size;
  }

  isScheduled(wishId: string): boolean {
    return this.slots.some((s) => s.wishId === wishId);
  }

  canPlace(rw: RankedWish, day: number, span: TimeBlock[], track: SlotTrack): boolean {
    for (const block of span) {
      const cell = this.inCell(day, block);
      if (track === "GROUP" && cell.some((s) => s.track === "GROUP")) return false;
      const busy = this.busy(day, block);
      for (const m of rw.inSet) if (busy.has(m)) return false;
    }
    if (track === "GROUP" && rw.wish.energy >= INTENSE_ENERGY && this.intenseGroups(day) > 0) {
      return false;
    }
    const filled = span.filter((b) => this.isEmpty(day, b)).length;
    return this.emptyBlocks(day) - filled >= 1;
  }

  add(slot: PlanSlotDraft): void {
    this.slots.push(slot);
  }

  /** Places a wish in the first span that fits, filling days in order. */
  place(rw: RankedWish, track: SlotTrack = trackFor(rw)): boolean {
    for (let day = 0; day < this.days; day++) {
      for (const span of candidateSpans(rw)) {
        if (this.canPlace(rw, day, span, track)) {
          for (const timeOfDay of span) {
            this.add({ wishId: rw.wish.id, dayIndex: day, timeOfDay, track, pinned: false });
          }
          return true;
        }
      }
    }
    return false;
  }

  /** Removes a wish's slots and returns them, so the removal can be undone. */
  remove(wishId: string): PlanSlotDraft[] {
    const removed = this.slots.filter((s) => s.wishId === wishId);
    for (const s of removed) this.slots.splice(this.slots.indexOf(s), 1);
    return removed;
  }
}

/** Fixed-time wishes before ANY-time ones; rank order within each. */
export function placementOrder(ranked: RankedWish[]): RankedWish[] {
  return [
    ...ranked.filter((r) => r.wish.timeOfDay !== "ANY"),
    ...ranked.filter((r) => r.wish.timeOfDay === "ANY"),
  ];
}

/** Adds pinned slots exactly as given. Returns the ids of pinned wishes. */
export function applyPins(grid: Grid, pins: PlanSlotDraft[], known: Set<string>): Set<string> {
  const pinned = new Set<string>();
  for (const pin of [...pins].sort(compareSlots)) {
    if (!known.has(pin.wishId) || pin.dayIndex < 0 || pin.dayIndex >= grid.days) continue;
    grid.add({ ...pin, pinned: true });
    pinned.add(pin.wishId);
  }
  return pinned;
}

/** Places GROUP wishes by score; returns the ones that didn't fit. */
export function placeGroups(grid: Grid, ranked: RankedWish[]): RankedWish[] {
  const unplaced: RankedWish[] = [];
  for (const rw of placementOrder(ranked.filter((r) => r.cls === "GROUP"))) {
    if (grid.isScheduled(rw.wish.id)) continue;
    if (!grid.place(rw, "GROUP")) unplaced.push(rw);
  }
  return unplaced;
}
