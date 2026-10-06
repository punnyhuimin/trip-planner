import { describe, expect, it } from "vitest";
import { isUnchanged, splitTags } from "@/lib/state";

describe("isUnchanged", () => {
  it("is true only when since matches the version", () => {
    expect(isUnchanged("4", 4)).toBe(true);
    expect(isUnchanged("3", 4)).toBe(false);
    expect(isUnchanged("0", 0)).toBe(true);
  });

  it("returns full state for a missing or non-numeric since", () => {
    expect(isUnchanged(null, 0)).toBe(false);
    expect(isUnchanged("", 0)).toBe(false);
    expect(isUnchanged("abc", 0)).toBe(false);
    expect(isUnchanged("1.0", 1)).toBe(false);
    expect(isUnchanged("-1", -1)).toBe(false);
  });
});

describe("splitTags", () => {
  it("splits the stored comma list", () => {
    expect(splitTags("")).toEqual([]);
    expect(splitTags("food,culture")).toEqual(["food", "culture"]);
  });
});
