import { describe, expect, it } from "vitest";
import { MEMBER_COLORS, nextColor } from "@/lib/colors";

describe("nextColor", () => {
  it("starts with the first palette color", () => {
    expect(nextColor([])).toBe(MEMBER_COLORS[0]);
  });

  it("skips colors already in use, case-insensitively", () => {
    expect(nextColor([MEMBER_COLORS[0], MEMBER_COLORS[1].toUpperCase()])).toBe(MEMBER_COLORS[2]);
  });

  it("fills gaps left by members who are gone", () => {
    expect(nextColor([MEMBER_COLORS[0], MEMBER_COLORS[2]])).toBe(MEMBER_COLORS[1]);
  });

  it("gives 10 members 10 different colors", () => {
    const used: string[] = [];
    for (let i = 0; i < 10; i++) used.push(nextColor(used));
    expect(new Set(used).size).toBe(10);
  });

  it("still returns a palette color when all are taken", () => {
    expect(MEMBER_COLORS).toContain(nextColor([...MEMBER_COLORS]));
  });
});
