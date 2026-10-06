import { describe, expect, it } from "vitest";
import { dayDate, formatDayLabel, parseDateOnly, tripDays } from "@/lib/dates";

describe("dates", () => {
  it("parses only real calendar dates", () => {
    expect(parseDateOnly("2026-11-02")?.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(parseDateOnly("2026-02-29")).toBeNull();
    expect(parseDateOnly("2028-02-29")).not.toBeNull();
    expect(parseDateOnly("nope")).toBeNull();
  });

  it("counts both the first and last day", () => {
    const d = (s: string) => parseDateOnly(s)!;
    expect(tripDays(d("2026-11-02"), d("2026-11-02"))).toBe(1);
    expect(tripDays(d("2026-11-02"), d("2026-11-06"))).toBe(5);
    expect(tripDays(d("2026-12-30"), d("2027-01-02"))).toBe(4);
  });

  it("finds the date of a trip day", () => {
    expect(dayDate("2026-12-30", 3)).toBe("2027-01-02");
    expect(formatDayLabel("2026-11-02")).toBe("Mon 2 Nov");
  });
});
