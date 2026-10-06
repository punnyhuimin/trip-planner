// Small builders for planner tests.
import type { PlannerMember, PlannerWish, ReactionValue } from "@/lib/types";

export function members(n: number): PlannerMember[] {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `Member ${i}` }));
}

let seq = 0;

/** A wish by `author` with the given members reacting. Defaults: LOVE, ANY, 2h, cost 1, energy 1. */
export function wish(
  author: string,
  opts: Partial<Omit<PlannerWish, "reactions">> & {
    in?: string[];
    maybe?: string[];
    skip?: string[];
  } = {},
): PlannerWish {
  seq += 1;
  const { in: ins = [], maybe = [], skip = [], ...rest } = opts;
  const react = (ids: string[], value: ReactionValue) =>
    ids.map((memberId) => ({ memberId, value }));
  return {
    id: `w${String(seq).padStart(3, "0")}`,
    authorId: author,
    kind: "ACTIVITY",
    priority: "LOVE",
    timeOfDay: "ANY",
    durationHrs: 2,
    costLevel: 1,
    energy: 1,
    title: `Wish ${seq}`,
    notes: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, seq)),
    reactions: [...react(ins, "IN"), ...react(maybe, "MAYBE"), ...react(skip, "SKIP")],
    ...rest,
  };
}

/** Ids m1..mN-1 except the author, for "everyone else is IN". */
export function others(all: PlannerMember[], author: string): string[] {
  return all.map((m) => m.id).filter((id) => id !== author);
}
