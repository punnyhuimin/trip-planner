import { describe, expect, it } from "vitest";
import { withReaction } from "@/lib/optimistic";
import type { TripState, WishDTO } from "@/lib/types";

const wish = (id: string, reactions: WishDTO["reactions"]) => ({ id, reactions }) as WishDTO;
const state = {
  wishes: [wish("a", [{ memberId: "m1", value: "SKIP" }]), wish("b", [])],
} as TripState;

describe("withReaction", () => {
  it("replaces an existing reaction", () => {
    const next = withReaction("a", "m1", "IN")(state);
    expect(next.wishes[0].reactions).toEqual([{ memberId: "m1", value: "IN" }]);
    expect(next.wishes[1]).toBe(state.wishes[1]);
  });

  it("adds and clears reactions without mutating the input", () => {
    expect(withReaction("b", "m2", "MAYBE")(state).wishes[1].reactions).toEqual([
      { memberId: "m2", value: "MAYBE" },
    ]);
    expect(withReaction("a", "m1", null)(state).wishes[0].reactions).toEqual([]);
    expect(state.wishes[0].reactions).toHaveLength(1);
  });
});
