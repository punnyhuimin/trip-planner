import { describe, expect, it } from "vitest";
import { goingMembers } from "@/lib/going";
import type { MemberDTO } from "@/lib/types";

const m = (id: string): MemberDTO => ({ id, name: id, color: "#000", isHost: false });
const members = [m("a"), m("b"), m("c"), m("d")];

describe("goingMembers", () => {
  it("lists the author first, then IN reactions in member order", () => {
    const wish = {
      authorId: "c",
      reactions: [
        { memberId: "d", value: "IN" as const },
        { memberId: "a", value: "IN" as const },
        { memberId: "b", value: "MAYBE" as const },
        { memberId: "c", value: "SKIP" as const },
      ],
    };
    expect(goingMembers(wish, members).map((x) => x.id)).toEqual(["c", "a", "d"]);
  });
});
