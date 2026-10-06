import { describe, expect, it } from "vitest";
import { dayDate } from "@/lib/dates";
import {
  DESTINATION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  LEVEL_MAX,
  MAX_TAGS,
  MAX_TRIP_DAYS,
  NAME_MAX,
  NOTE_MAX,
  TAG_MAX,
  TRIP_NAME_MAX,
  WISH_TITLE_MAX,
} from "@/lib/limits";
import {
  createTripSchema,
  createWishSchema,
  joinSchema,
  normalizeTags,
  reactionSchema,
  updateWishSchema,
} from "@/lib/schemas";

const valid = {
  name: "Bali",
  destination: "Indonesia",
  startDate: "2026-11-02",
  endDate: "2026-11-06",
  yourName: "Alex",
};

describe("createTripSchema", () => {
  it("accepts a valid trip", () => {
    expect(createTripSchema.parse(valid)).toEqual(valid);
  });

  it("trims names and drops an empty destination", () => {
    const parsed = createTripSchema.parse({
      ...valid,
      name: "  Bali  ",
      yourName: " Alex ",
      destination: "  ",
    });
    expect(parsed.name).toBe("Bali");
    expect(parsed.yourName).toBe("Alex");
    expect(parsed.destination).toBeUndefined();
  });

  it("allows a one-day trip", () => {
    expect(createTripSchema.safeParse({ ...valid, endDate: valid.startDate }).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = createTripSchema.safeParse({ ...valid, endDate: "2026-11-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["endDate"]);
  });

  it(`allows ${MAX_TRIP_DAYS} days but not ${MAX_TRIP_DAYS + 1}`, () => {
    const lastDay = dayDate(valid.startDate, MAX_TRIP_DAYS - 1);
    const dayAfter = dayDate(valid.startDate, MAX_TRIP_DAYS);
    expect(createTripSchema.safeParse({ ...valid, endDate: lastDay }).success).toBe(true);
    expect(createTripSchema.safeParse({ ...valid, endDate: dayAfter }).success).toBe(false);
  });

  it("rejects impossible dates", () => {
    expect(createTripSchema.safeParse({ ...valid, startDate: "2026-02-30" }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...valid, startDate: "02/11/2026" }).success).toBe(false);
  });

  it("enforces length limits", () => {
    const ok = (input: Partial<typeof valid>) =>
      createTripSchema.safeParse({ ...valid, ...input }).success;
    expect(ok({ name: "x".repeat(TRIP_NAME_MAX) })).toBe(true);
    expect(ok({ name: "x".repeat(TRIP_NAME_MAX + 1) })).toBe(false);
    expect(ok({ name: "   " })).toBe(false);
    expect(ok({ destination: "x".repeat(DESTINATION_MAX) })).toBe(true);
    expect(ok({ destination: "x".repeat(DESTINATION_MAX + 1) })).toBe(false);
    expect(ok({ yourName: "x".repeat(NAME_MAX) })).toBe(true);
    expect(ok({ yourName: "x".repeat(NAME_MAX + 1) })).toBe(false);
  });
});

describe("joinSchema", () => {
  it("trims the name", () => {
    expect(joinSchema.parse({ yourName: "  Priya " })).toEqual({ yourName: "Priya" });
  });

  it("rejects empty and over-long names", () => {
    expect(joinSchema.safeParse({ yourName: "  " }).success).toBe(false);
    expect(joinSchema.safeParse({ yourName: "x".repeat(NAME_MAX) }).success).toBe(true);
    expect(joinSchema.safeParse({ yourName: "x".repeat(NAME_MAX + 1) }).success).toBe(false);
  });
});

describe("normalizeTags", () => {
  it("trims, lowercases, strips commas and de-duplicates", () => {
    expect(normalizeTags([" Food ", "food", "Night,Life", "", "  "])).toEqual([
      "food",
      "night life",
    ]);
  });
});

describe("createWishSchema", () => {
  it("fills defaults and stores tags as a comma list", () => {
    expect(
      createWishSchema.parse({ title: " Surf ", kind: "ACTIVITY", tags: ["Beach", "beach"] }),
    ).toEqual({
      title: "Surf",
      notes: null,
      kind: "ACTIVITY",
      priority: "NICE",
      timeOfDay: "ANY",
      durationHrs: 2,
      costLevel: 1,
      energy: 1,
      tags: "beach",
    });
  });

  it("enforces ranges", () => {
    const base = { title: "x", kind: "ACTIVITY" };
    const ok = (input: Record<string, unknown>) =>
      createWishSchema.safeParse({ ...base, ...input }).success;
    expect(ok({ title: "x".repeat(WISH_TITLE_MAX) })).toBe(true);
    expect(ok({ title: "x".repeat(WISH_TITLE_MAX + 1) })).toBe(false);
    expect(ok({ notes: "x".repeat(NOTE_MAX) })).toBe(true);
    expect(ok({ notes: "x".repeat(NOTE_MAX + 1) })).toBe(false);
    expect(ok({ durationHrs: DURATION_MIN })).toBe(true);
    expect(ok({ durationHrs: DURATION_MIN - DURATION_STEP / 2 })).toBe(false);
    expect(ok({ durationHrs: DURATION_MAX })).toBe(true);
    expect(ok({ durationHrs: DURATION_MAX + DURATION_STEP })).toBe(false);
    expect(ok({ durationHrs: DURATION_MIN + DURATION_STEP * 8 })).toBe(true);
    expect(ok({ durationHrs: DURATION_MIN + DURATION_STEP / 2 })).toBe(false);
    expect(ok({ costLevel: LEVEL_MAX })).toBe(true);
    expect(ok({ costLevel: LEVEL_MAX + 1 })).toBe(false);
    expect(ok({ tags: ["x".repeat(TAG_MAX)] })).toBe(true);
    expect(ok({ tags: ["x".repeat(TAG_MAX + 1)] })).toBe(false);
    expect(createWishSchema.safeParse({ ...base, energy: -1 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, energy: 1.5 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, timeOfDay: "LUNCH" }).success).toBe(false);
    expect(createWishSchema.safeParse({ title: "x", kind: "WISH" }).success).toBe(false);
  });

  it("caps the number of tags", () => {
    const tags = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
    const parse = (n: number) =>
      createWishSchema.safeParse({ title: "x", kind: "ACTIVITY", tags: tags(n) }).success;
    expect(parse(MAX_TAGS)).toBe(true);
    expect(parse(MAX_TAGS + 1)).toBe(false);
  });
});

describe("updateWishSchema", () => {
  it("leaves unset fields out", () => {
    expect(updateWishSchema.parse({ title: "New" })).toEqual({ title: "New" });
    expect(updateWishSchema.parse({ notes: "" })).toEqual({ notes: null });
  });
});

describe("createWishSchema tags default", () => {
  it("stores an empty string when tags are omitted", () => {
    expect(createWishSchema.parse({ title: "x", kind: "ACTIVITY" }).tags).toBe("");
  });
});

describe("reactionSchema", () => {
  it("accepts the three values and null", () => {
    for (const value of ["IN", "MAYBE", "SKIP", null]) {
      expect(reactionSchema.parse({ value })).toEqual({ value });
    }
    expect(reactionSchema.safeParse({ value: "YES" }).success).toBe(false);
    expect(reactionSchema.safeParse({}).success).toBe(false);
  });
});
