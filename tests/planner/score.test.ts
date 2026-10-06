import { describe, expect, it } from "vitest";
import {
  classify,
  groupThreshold,
  inSet,
  rankActivities,
  score,
  support,
} from "@/lib/planner/score";
import { members, wish } from "./fixtures";

describe("groupThreshold", () => {
  it("is 6 for 10 members and 2 for 3 members", () => {
    expect(groupThreshold(10)).toBe(6);
    expect(groupThreshold(3)).toBe(2);
  });
});

describe("inSet / support", () => {
  it("counts the author as IN and ignores their own reaction", () => {
    const w = wish("m0", { in: ["m0", "m1"], skip: ["m2"] });
    expect([...inSet(w)].sort()).toEqual(["m0", "m1"]);
    expect(support(w)).toBe(2);
  });

  it("counts MAYBE as 0.5", () => {
    expect(support(wish("m0", { in: ["m1"], maybe: ["m2", "m3", "m4"] }))).toBe(3.5);
  });
});

describe("score", () => {
  it("applies the priority weights", () => {
    const base = { in: ["m1"], maybe: ["m2"] }; // support 2.5
    expect(score(wish("m0", { ...base, priority: "MUST" }))).toBe(7.5);
    expect(score(wish("m0", { ...base, priority: "LOVE" }))).toBe(5);
    expect(score(wish("m0", { ...base, priority: "NICE" }))).toBe(2.5);
  });
});

describe("classify", () => {
  it("splits group, splinter and solo for 10 members", () => {
    expect(classify(wish("m0", { in: ["m1", "m2", "m3", "m4", "m5"] }), 10)).toBe("GROUP");
    expect(classify(wish("m0", { in: ["m1", "m2", "m3", "m4"] }), 10)).toBe("SPLINTER");
    expect(classify(wish("m0", { in: ["m1"] }), 10)).toBe("SPLINTER");
    expect(classify(wish("m0", { maybe: ["m1", "m2", "m3", "m4", "m5", "m6"] }), 10)).toBe("SOLO");
  });

  it("uses a threshold of 2 for 3 members", () => {
    expect(classify(wish("m0", { in: ["m1"] }), 3)).toBe("GROUP");
    expect(classify(wish("m0"), 3)).toBe("SOLO");
  });
});

describe("rankActivities", () => {
  it("excludes constraints and sorts best first, ties by createdAt", () => {
    const all = members(4);
    const low = wish("m0", { priority: "NICE" });
    const tieA = wish("m1", { in: ["m2"] });
    const tieB = wish("m2", { in: ["m1"] });
    const constraint = wish("m3", { kind: "CONSTRAINT", priority: "MUST", in: ["m0", "m1"] });
    const ranked = rankActivities([low, tieB, constraint, tieA], all.length);
    expect(ranked.map((r) => r.wish.id)).toEqual([tieA.id, tieB.id, low.id]);
  });
});
