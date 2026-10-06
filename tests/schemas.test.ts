import { describe, expect, it } from "vitest";
import { createTripSchema, joinSchema } from "@/lib/schemas";

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
