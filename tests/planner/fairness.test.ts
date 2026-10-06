import { describe, expect, it } from "vitest";
import { fairnessPass } from "@/lib/planner/fairness";
import { placeGroups, placeSplinters } from "@/lib/planner/place";
import type { PlanSlotDraft, PlannerWish } from "@/lib/types";
import { members, setupGrid, slotsOf, wish } from "./fixtures";

const all = members(3); // group threshold 2

/** Runs placement and the fairness pass on a one-day trip. */
function run(wishes: PlannerWish[], pins: PlanSlotDraft[] = []) {
  const { grid, ranked } = setupGrid(1, all, wishes, pins);
  placeGroups(grid, ranked);
  placeSplinters(grid, ranked);
  const lacking = fairnessPass(grid, ranked, all);
  return { grid, lacking };
}

// m2's only MUST: solo, and m2 is busy in every block but the rest block.
const lonelyMust = () => wish("m2", { priority: "MUST" });

describe("fairnessPass", () => {
  it("swaps a member's MUST in for the lowest-scoring item", () => {
    const groups = [
      wish("m0", { in: ["m1", "m2"], priority: "MUST" }),
      wish("m0", { in: ["m1", "m2"] }),
      wish("m0", { in: ["m1", "m2"] }),
      wish("m0", { in: ["m1", "m2"], priority: "NICE" }), // lowest score
    ];
    const must = lonelyMust();
    const { grid, lacking } = run([...groups, must]);
    expect(lacking).toEqual([]);
    expect(slotsOf(grid, groups[3].id)).toEqual([]);
    expect(slotsOf(grid, must.id)).toEqual(["0:NIGHT:SPLINTER"]);
  });

  it("won't bump another member's only scheduled MUST", () => {
    const m1OnlyMust = wish("m1", { in: ["m2"], priority: "MUST" }); // score 6, lowest
    const groups = [
      wish("m0", { in: ["m1", "m2"], priority: "MUST" }), // score 9
      wish("m0", { in: ["m1", "m2"], priority: "MUST" }),
      wish("m0", { in: ["m1", "m2"], priority: "MUST" }),
    ];
    const must = lonelyMust();
    const { grid, lacking } = run([m1OnlyMust, ...groups, must]);
    expect(lacking).toEqual([]);
    expect(slotsOf(grid, m1OnlyMust.id)).toHaveLength(1);
    // m0 still has two MUSTs scheduled, so their latest one gives way.
    expect(slotsOf(grid, groups[2].id)).toEqual([]);
    expect(slotsOf(grid, must.id)).toHaveLength(1);
  });

  it("reports the member when no swap is possible", () => {
    const groups = [1, 2, 3, 4].map(() => wish("m0", { in: ["m1", "m2"] }));
    const pins = groups.map((g, i) => ({
      wishId: g.id,
      dayIndex: 0,
      timeOfDay: (["MORNING", "AFTERNOON", "EVENING", "NIGHT"] as const)[i],
      track: "GROUP" as const,
      pinned: true,
    }));
    const must = lonelyMust();
    const { grid, lacking } = run([...groups, must], pins);
    expect(lacking).toEqual(["m2"]);
    expect(slotsOf(grid, must.id)).toEqual([]);
  });

  it("ignores members without MUST wishes", () => {
    const { lacking } = run([wish("m0", { in: ["m1"] })]);
    expect(lacking).toEqual([]);
  });
});
