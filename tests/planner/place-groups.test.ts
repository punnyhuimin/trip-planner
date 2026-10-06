import { describe, expect, it } from "vitest";
import { placeGroups } from "@/lib/planner/place";
import { TIME_BLOCKS } from "@/lib/types";
import { members, others, setupGrid, slotsOf, wish } from "./fixtures";

const all = members(3); // group threshold 2
const group = (opts: Parameters<typeof wish>[1] = {}) => wish("m0", { in: ["m1"], ...opts });

describe("placeGroups", () => {
  it("never moves pinned slots and doesn't place pinned wishes again", () => {
    const pinnedWish = group({ timeOfDay: "MORNING" });
    const pin = {
      wishId: pinnedWish.id,
      dayIndex: 1,
      timeOfDay: "NIGHT" as const,
      track: "GROUP" as const,
      pinned: true,
    };
    const other = group({ timeOfDay: "NIGHT", priority: "MUST" });
    const { grid, ranked } = setupGrid(2, all, [pinnedWish, other], [pin]);
    placeGroups(grid, ranked);
    expect(slotsOf(grid, pinnedWish.id)).toEqual(["1:NIGHT:GROUP:pinned"]);
    // The other NIGHT group wish can't share day 1's night block.
    expect(slotsOf(grid, other.id)).toEqual(["0:NIGHT:GROUP"]);
  });

  it("puts at most one group activity in a block", () => {
    const ws = [1, 2, 3].map(() => group({ timeOfDay: "MORNING" }));
    const { grid, ranked } = setupGrid(2, all, ws);
    const unplaced = placeGroups(grid, ranked);
    expect(ws.map((w) => slotsOf(grid, w.id))).toEqual([
      ["0:MORNING:GROUP"],
      ["1:MORNING:GROUP"],
      [],
    ]);
    expect(unplaced.map((r) => r.wish.id)).toEqual([ws[2].id]);
  });

  it("gives wishes over 4 hours two adjacent blocks on the same day", () => {
    const morning = group({ timeOfDay: "MORNING", durationHrs: 6 });
    const night = group({ timeOfDay: "NIGHT", durationHrs: 4.5 });
    const exactlyFour = group({ timeOfDay: "AFTERNOON", durationHrs: 4 });
    const { grid, ranked } = setupGrid(3, all, [morning, night, exactlyFour]);
    placeGroups(grid, ranked);
    expect(slotsOf(grid, morning.id)).toEqual(["0:MORNING:GROUP", "0:AFTERNOON:GROUP"]);
    expect(slotsOf(grid, night.id)).toEqual(["0:EVENING:GROUP", "0:NIGHT:GROUP"]);
    expect(slotsOf(grid, exactlyFour.id)).toEqual(["1:AFTERNOON:GROUP"]);
  });

  it("allows only one intense group activity per day", () => {
    const a = group({ energy: 3, priority: "MUST" });
    const b = group({ energy: 3 });
    const easy = group({ energy: 2 });
    const { grid, ranked } = setupGrid(2, all, [a, b, easy]);
    placeGroups(grid, ranked);
    expect(slotsOf(grid, a.id)).toEqual(["0:MORNING:GROUP"]);
    expect(slotsOf(grid, easy.id)).toEqual(["0:AFTERNOON:GROUP"]);
    expect(slotsOf(grid, b.id)).toEqual(["1:MORNING:GROUP"]);
  });

  it("leaves at least one block free every day", () => {
    const ws = Array.from({ length: 6 }, () => group());
    const { grid, ranked } = setupGrid(1, all, ws);
    const unplaced = placeGroups(grid, ranked);
    expect(grid.slots).toHaveLength(4);
    expect(unplaced).toHaveLength(2);
    expect(TIME_BLOCKS.filter((b) => grid.isEmpty(0, b))).toEqual(["EARLY_MORNING"]);
  });

  it("places fixed-time wishes before ANY-time ones", () => {
    const anyTime = group({ priority: "MUST", in: others(all, "m0") });
    const morning = group({ timeOfDay: "MORNING", priority: "NICE" });
    const { grid, ranked } = setupGrid(1, all, [anyTime, morning]);
    placeGroups(grid, ranked);
    expect(slotsOf(grid, morning.id)).toEqual(["0:MORNING:GROUP"]);
    expect(slotsOf(grid, anyTime.id)).toEqual(["0:AFTERNOON:GROUP"]);
  });

  it("only places GROUP wishes", () => {
    const splinter = wish("m0"); // SOLO
    const { grid, ranked } = setupGrid(1, all, [splinter]);
    expect(placeGroups(grid, ranked)).toEqual([]);
    expect(grid.slots).toEqual([]);
  });
});
