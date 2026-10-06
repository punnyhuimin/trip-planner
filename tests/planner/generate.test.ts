import { describe, expect, it } from "vitest";
import { generatePlan } from "@/lib/planner";
import type { PlannerInput, PlannerWish } from "@/lib/types";
import {
  SEED_MEMBERS,
  SEED_TRIP,
  SEED_WISHES,
  seedWishCreatedAt,
  seedWishId,
} from "../../prisma/seed-data";

/** The DEMO42 seed trip as planner input. */
function seedInput(): PlannerInput {
  const wishes: PlannerWish[] = SEED_WISHES.map((w, i) => ({
    id: seedWishId(i),
    authorId: SEED_MEMBERS[w.author].id,
    kind: w.kind,
    priority: w.priority,
    timeOfDay: w.timeOfDay,
    durationHrs: w.durationHrs,
    costLevel: w.costLevel,
    energy: w.energy,
    title: w.title,
    notes: w.notes ?? null,
    createdAt: seedWishCreatedAt(i),
    reactions: (["in", "maybe", "skip"] as const).flatMap((key) =>
      (w[key] ?? []).map((m) => ({
        memberId: SEED_MEMBERS[m].id,
        value: key.toUpperCase() as "IN" | "MAYBE" | "SKIP",
      })),
    ),
  }));
  const days = (SEED_TRIP.endDate.getTime() - SEED_TRIP.startDate.getTime()) / 86_400_000 + 1;
  return {
    days,
    members: SEED_MEMBERS.map((m) => ({ id: m.id, name: m.name })),
    wishes,
    pinnedSlots: [],
  };
}

/** Deterministic Fisher–Yates with a tiny LCG, so the test itself is reproducible. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The planner's decisions; unscheduled wishes are compared by id since they pass through as given. */
function decisions(input: PlannerInput) {
  const { slots, warnings, unscheduled } = generatePlan(input);
  return { slots, warnings, unscheduled: unscheduled.map((w) => w.id) };
}

describe("generatePlan", () => {
  it("gives the same output when run twice", () => {
    expect(generatePlan(seedInput())).toEqual(generatePlan(seedInput()));
  });

  it("gives the same output whatever order the input is in", () => {
    const base = decisions(seedInput());
    for (const seed of [1, 7, 42]) {
      const input = seedInput();
      const shuffled: PlannerInput = {
        ...input,
        members: shuffle(input.members, seed),
        wishes: shuffle(input.wishes, seed + 1).map((w) => ({
          ...w,
          reactions: shuffle(w.reactions, seed + 2),
        })),
      };
      expect(decisions(shuffled)).toEqual(base);
    }
  });

  it("plans the seeded trip with no double-bookings and a rest block every day", () => {
    const input = seedInput();
    const { slots, warnings, unscheduled } = generatePlan(input);
    expect(warnings.filter((w) => w.type === "DOUBLE_BOOKING")).toEqual([]);
    expect(slots.length).toBeGreaterThan(0);
    for (let day = 0; day < input.days; day++) {
      const used = new Set(slots.filter((s) => s.dayIndex === day).map((s) => s.timeOfDay));
      expect(used.size).toBeLessThan(5);
    }
    // Every activity is either scheduled or reported as unscheduled, never both.
    const scheduled = new Set(slots.map((s) => s.wishId));
    const activities = input.wishes.filter((w) => w.kind === "ACTIVITY");
    expect(scheduled.size + unscheduled.length).toBe(activities.length);
    // Constraints are never scheduled.
    const constraints = input.wishes.filter((w) => w.kind === "CONSTRAINT").map((w) => w.id);
    expect(slots.some((s) => constraints.includes(s.wishId))).toBe(false);
  });

  it("keeps pinned slots exactly where they are", () => {
    const input = seedInput();
    const pin = {
      wishId: input.wishes[1].id,
      dayIndex: 4,
      timeOfDay: "NIGHT" as const,
      track: "GROUP" as const,
      pinned: true,
    };
    const { slots } = generatePlan({ ...input, pinnedSlots: [pin] });
    expect(slots.filter((s) => s.wishId === pin.wishId)).toEqual([pin]);
  });
});
