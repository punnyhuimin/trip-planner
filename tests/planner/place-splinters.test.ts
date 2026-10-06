import { describe, expect, it } from "vitest";
import { placeGroups, placeSplinters } from "@/lib/planner/place";
import { TIME_BLOCKS } from "@/lib/types";
import { members, setupGrid, slotsOf, wish } from "./fixtures";

const all = members(5); // group threshold 3

describe("placeSplinters", () => {
  it("never overlaps a splinter with its members' group activity", () => {
    const g = wish("m0", { in: ["m1", "m2"], timeOfDay: "MORNING" });
    const clash = wish("m2", { in: ["m3"], timeOfDay: "MORNING" }); // m2 is in g
    const free = wish("m3", { in: ["m4"], timeOfDay: "MORNING" }); // nobody from g
    const { grid, ranked } = setupGrid(2, all, [g, clash, free]);
    placeGroups(grid, ranked);
    placeSplinters(grid, ranked);
    expect(slotsOf(grid, g.id)).toEqual(["0:MORNING:GROUP"]);
    expect(slotsOf(grid, free.id)).toEqual(["0:MORNING:SPLINTER"]);
    expect(slotsOf(grid, clash.id)).toEqual(["1:MORNING:SPLINTER"]);
  });

  it("doesn't let two splinters share a member in one block", () => {
    const a = wish("m0", { in: ["m1"], timeOfDay: "EVENING", priority: "MUST" });
    const b = wish("m1", { in: ["m2"], timeOfDay: "EVENING" });
    const { grid, ranked } = setupGrid(2, all, [a, b]);
    placeSplinters(grid, ranked);
    expect(slotsOf(grid, a.id)).toEqual(["0:EVENING:SPLINTER"]);
    expect(slotsOf(grid, b.id)).toEqual(["1:EVENING:SPLINTER"]);
  });

  it("places SOLO wishes after SPLINTER ones, even with a higher score", () => {
    const solo = wish("m0", { priority: "MUST", timeOfDay: "MORNING" }); // score 3
    const splinter = wish("m0", { in: ["m1"], priority: "NICE", timeOfDay: "MORNING" }); // score 2
    const { grid, ranked } = setupGrid(1, all, [solo, splinter]);
    const unplaced = placeSplinters(grid, ranked);
    expect(slotsOf(grid, splinter.id)).toEqual(["0:MORNING:SPLINTER"]);
    expect(unplaced.map((r) => r.wish.id)).toEqual([solo.id]);
  });

  it("keeps the rest block empty", () => {
    const g = wish("m0", { in: ["m1", "m2"], timeOfDay: "MORNING" });
    // Every splinter includes m3, so each needs its own block.
    const splinters = Array.from({ length: 5 }, () => wish("m3", { in: ["m4"] }));
    const { grid, ranked } = setupGrid(1, all, [g, ...splinters]);
    placeGroups(grid, ranked);
    const unplaced = placeSplinters(grid, ranked);
    // The first splinter shares the morning with g (no overlap), three more
    // take a block each, and the last one would eat the rest block.
    expect(slotsOf(grid, splinters[0].id)).toEqual(["0:MORNING:SPLINTER"]);
    expect(TIME_BLOCKS.filter((b) => grid.isEmpty(0, b))).toHaveLength(1);
    expect(unplaced.map((r) => r.wish.id)).toEqual([splinters[4].id]);
  });
});
