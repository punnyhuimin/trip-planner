import { describe, expect, it } from "vitest";
import {
  budgetConflicts,
  detectWarnings,
  doubleBookings,
  energyConflicts,
  timeConflicts,
  unscheduledMusts,
} from "@/lib/planner/conflicts";
import type { PlannerMember, PlannerWish, TimeBlock } from "@/lib/types";
import { wish } from "./fixtures";

const people: PlannerMember[] = [
  { id: "m0", name: "Alex" },
  { id: "m1", name: "Priya" },
  { id: "m2", name: "Sam" },
];
const constraint = (author: string, title: string, notes: string | null = null) =>
  wish(author, { kind: "CONSTRAINT", title, notes });
const at = (w: PlannerWish, dayIndex: number, timeOfDay: TimeBlock) => ({
  wishId: w.id,
  dayIndex,
  timeOfDay,
});

describe("timeConflicts", () => {
  const noMornings = constraint("m1", "No EARLY mornings please");
  const hike = wish("m0", { title: "sunrise hike", in: ["m1"] });

  it("flags a member IN on an early-morning slot despite their constraint", () => {
    const warnings = timeConflicts({ members: people, wishes: [noMornings, hike] }, [
      at(hike, 1, "EARLY_MORNING"),
      at(hike, 1, "MORNING"), // long wish: still one warning
    ]);
    expect(warnings).toEqual([
      {
        type: "TIME",
        memberIds: ["m1"],
        wishIds: [noMornings.id, hike.id],
        message:
          "Priya said “No EARLY mornings please” but is down for the Day 2 sunrise hike — worth a chat?",
      },
    ]);
  });

  it("stays quiet when they aren't IN, or it isn't early", () => {
    const notIn = wish("m0", { title: "dawn yoga", maybe: ["m1"] });
    const input = { members: people, wishes: [noMornings, hike, notIn] };
    expect(timeConflicts(input, [at(hike, 0, "MORNING"), at(notIn, 0, "EARLY_MORNING")])).toEqual(
      [],
    );
  });

  it("matches keywords in the notes too", () => {
    const c = constraint("m1", "Sleep matters", "nothing before 9 please");
    expect(
      timeConflicts({ members: people, wishes: [c, hike] }, [at(hike, 0, "EARLY_MORNING")]),
    ).toHaveLength(1);
  });
});

describe("budgetConflicts", () => {
  const budget = constraint("m2", "Budget under $50/day");
  const dive = wish("m0", { title: "Diving", costLevel: 3, in: ["m2"] });
  const bar = wish("m0", { title: "Bar", costLevel: 2, in: ["m2"] });
  const free = wish("m0", { title: "Beach", costLevel: 0, in: ["m2"] });

  it("flags a day whose cost for the member is over 4", () => {
    const warnings = budgetConflicts({ members: people, wishes: [budget, dive, bar, free] }, [
      at(dive, 2, "MORNING"),
      at(bar, 2, "NIGHT"),
      at(free, 2, "AFTERNOON"),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toBe(
      "Sam said “Budget under $50/day”, but Day 3 adds up for them (Diving and Bar) — maybe swap in something cheaper?",
    );
  });

  it("stays quiet at 4 or less, or on other days", () => {
    const cheaper = wish("m0", { costLevel: 1, in: ["m2"] });
    const input = { members: people, wishes: [budget, dive, bar, cheaper] };
    expect(budgetConflicts(input, [at(dive, 0, "MORNING"), at(cheaper, 0, "NIGHT")])).toEqual([]);
    expect(budgetConflicts(input, [at(dive, 0, "MORNING"), at(bar, 1, "NIGHT")])).toEqual([]);
  });
});

describe("energyConflicts", () => {
  const chill = constraint("m0", "Keep it chill");
  const surf = wish("m1", { title: "Surf", energy: 3, in: ["m0"] });
  const bike = wish("m1", { title: "Bike", energy: 2, in: ["m0"] });
  const tea = wish("m1", { title: "Tea", energy: 0, in: ["m0"] });

  it("flags a day averaging energy 2 or more", () => {
    const warnings = energyConflicts({ members: people, wishes: [chill, surf, bike] }, [
      at(surf, 0, "MORNING"),
      at(bike, 0, "AFTERNOON"),
    ]);
    expect(warnings.map((w) => w.message)).toEqual([
      "Alex said “Keep it chill”, but Day 1 is full-on for them (Surf and Bike) — worth building in a breather?",
    ]);
  });

  it("stays quiet when the day averages below 2", () => {
    const input = { members: people, wishes: [chill, surf, tea] };
    expect(energyConflicts(input, [at(surf, 0, "MORNING"), at(tea, 0, "AFTERNOON")])).toEqual([]);
  });

  it("doesn't match 'rest' inside other words", () => {
    const c = constraint("m0", "Interested in restaurants");
    expect(
      energyConflicts({ members: people, wishes: [c, surf] }, [at(surf, 0, "MORNING")]),
    ).toEqual([]);
  });
});

describe("doubleBookings", () => {
  const a = wish("m0", { title: "Market", in: ["m1"] });
  const b = wish("m2", { title: "Museum", in: ["m1"] });

  it("flags a member IN on two things in the same block", () => {
    const warnings = doubleBookings({ members: people, wishes: [a, b] }, [
      at(a, 1, "EVENING"),
      at(b, 1, "EVENING"),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].memberIds).toEqual(["m1"]);
    expect(warnings[0].message).toBe(
      "Priya is down for both Market and Museum on Day 2 (evening) — they'll need to pick one.",
    );
  });

  it("stays quiet when the blocks differ", () => {
    expect(
      doubleBookings({ members: people, wishes: [a, b] }, [at(a, 1, "EVENING"), at(b, 1, "NIGHT")]),
    ).toEqual([]);
  });
});

describe("unscheduledMusts", () => {
  const must = wish("m2", { title: "Arcade", priority: "MUST" });
  const other = wish("m2", { title: "Karaoke", priority: "MUST" });

  it("flags a member with no MUST in the plan", () => {
    const warnings = unscheduledMusts({ members: people, wishes: [must, other] }, []);
    expect(warnings).toEqual([
      {
        type: "UNSCHEDULED_MUST",
        memberIds: ["m2"],
        wishIds: [must.id, other.id],
        message:
          "None of Sam’s must-dos are in the plan yet (Arcade and Karaoke) — can the group fit one in?",
      },
    ]);
  });

  it("stays quiet once one MUST is scheduled", () => {
    expect(
      unscheduledMusts({ members: people, wishes: [must, other] }, [at(other, 0, "NIGHT")]),
    ).toEqual([]);
  });
});

describe("detectWarnings", () => {
  it("runs every rule", () => {
    const must = wish("m2", { priority: "MUST" });
    const noMornings = constraint("m1", "no mornings");
    const hike = wish("m0", { in: ["m1"] });
    const types = detectWarnings({ members: people, wishes: [must, noMornings, hike] }, [
      at(hike, 0, "EARLY_MORNING"),
    ]).map((w) => w.type);
    expect(types).toEqual(["TIME", "UNSCHEDULED_MUST"]);
  });
});
