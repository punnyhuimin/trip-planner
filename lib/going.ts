import type { MemberDTO, WishDTO } from "@/lib/types";

/** Members going on a wish: the author first, then everyone IN, in member order. */
export function goingMembers(
  wish: Pick<WishDTO, "authorId" | "reactions">,
  members: MemberDTO[],
): MemberDTO[] {
  const ins = new Set(wish.reactions.filter((r) => r.value === "IN").map((r) => r.memberId));
  const author = members.find((m) => m.id === wish.authorId);
  return [
    ...(author ? [author] : []),
    ...members.filter((m) => m.id !== wish.authorId && ins.has(m.id)),
  ];
}
