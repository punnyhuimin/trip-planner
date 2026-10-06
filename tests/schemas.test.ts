import { describe, expect, it } from "vitest";
import {
  createTripSchema,
  createWishSchema,
  joinSchema,
  normalizeTags,
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

  it("allows 30 days but not 31", () => {
    expect(createTripSchema.safeParse({ ...valid, endDate: "2026-12-01" }).success).toBe(true);
    expect(createTripSchema.safeParse({ ...valid, endDate: "2026-12-02" }).success).toBe(false);
  });

  it("rejects impossible dates", () => {
    expect(createTripSchema.safeParse({ ...valid, startDate: "2026-02-30" }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...valid, startDate: "02/11/2026" }).success).toBe(false);
  });

  it("enforces length limits", () => {
    expect(createTripSchema.safeParse({ ...valid, name: "x".repeat(60) }).success).toBe(true);
    expect(createTripSchema.safeParse({ ...valid, name: "x".repeat(61) }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...valid, yourName: "x".repeat(31) }).success).toBe(false);
  });
});

describe("joinSchema", () => {
  it("trims the name", () => {
    expect(joinSchema.parse({ yourName: "  Priya " })).toEqual({ yourName: "Priya" });
  });

  it("rejects empty and over-long names", () => {
    expect(joinSchema.safeParse({ yourName: "  " }).success).toBe(false);
    expect(joinSchema.safeParse({ yourName: "x".repeat(30) }).success).toBe(true);
    expect(joinSchema.safeParse({ yourName: "x".repeat(31) }).success).toBe(false);
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
    expect(createWishSchema.safeParse({ ...base, title: "x".repeat(81) }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, durationHrs: 0.25 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, durationHrs: 12.5 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, durationHrs: 4.5 }).success).toBe(true);
    expect(createWishSchema.safeParse({ ...base, costLevel: 4 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, energy: -1 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, energy: 1.5 }).success).toBe(false);
    expect(createWishSchema.safeParse({ ...base, timeOfDay: "LUNCH" }).success).toBe(false);
    expect(createWishSchema.safeParse({ title: "x", kind: "WISH" }).success).toBe(false);
  });

  it("caps the number of tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
    expect(createWishSchema.safeParse({ title: "x", kind: "ACTIVITY", tags }).success).toBe(false);
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
