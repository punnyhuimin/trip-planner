import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/labels";

describe("formatDuration", () => {
  it("uses minutes under an hour and hours otherwise", () => {
    expect(formatDuration(0.5)).toBe("30 min");
    expect(formatDuration(2)).toBe("2h");
    expect(formatDuration(1.5)).toBe("1.5h");
  });
});
