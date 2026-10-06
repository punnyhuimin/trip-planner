import { describe, expect, it } from "vitest";
import { slotPatchSchema } from "@/lib/schemas";
import { groupClash, moveTargets } from "@/lib/slots";

const slot = (wishId: string, dayIndex: number, timeOfDay: string, track = "GROUP") => ({
  id: `${wishId}-${timeOfDay}`,
  wishId,
  dayIndex,
  timeOfDay,
  track,
});

describe("moveTargets", () => {
  it("moves a one-block wish to the target", () => {
    expect(moveTargets([slot("a", 0, "MORNING")], "NIGHT")).toEqual(["NIGHT"]);
  });

  it("keeps a two-block wish together", () => {
    const pair = [slot("a", 0, "MORNING"), slot("a", 0, "AFTERNOON")];
    expect(moveTargets(pair, "EVENING")).toEqual(["EVENING", "NIGHT"]);
    expect(moveTargets(pair, "NIGHT")).toEqual(["EVENING", "NIGHT"]);
  });
});

describe("groupClash", () => {
  const day = [slot("a", 1, "MORNING"), slot("b", 1, "EVENING", "SPLINTER")];

  it("detects another group activity in a target block", () => {
    expect(groupClash(day, "x", 1, ["MORNING"])).toBe(true);
  });

  it("ignores the wish's own slots, splinters and other days", () => {
    expect(groupClash(day, "a", 1, ["MORNING"])).toBe(false);
    expect(groupClash(day, "x", 1, ["EVENING"])).toBe(false);
    expect(groupClash(day, "x", 2, ["MORNING"])).toBe(false);
  });
});

describe("slotPatchSchema", () => {
  it("accepts a move or an unpin, nothing else", () => {
    expect(slotPatchSchema.safeParse({ dayIndex: 2, timeOfDay: "NIGHT" }).success).toBe(true);
    expect(slotPatchSchema.safeParse({ pinned: false }).success).toBe(true);
    expect(slotPatchSchema.safeParse({ pinned: true }).success).toBe(false);
    expect(slotPatchSchema.safeParse({ dayIndex: -1, timeOfDay: "NIGHT" }).success).toBe(false);
    expect(slotPatchSchema.safeParse({ dayIndex: 0, timeOfDay: "ANY" }).success).toBe(false);
  });
});
