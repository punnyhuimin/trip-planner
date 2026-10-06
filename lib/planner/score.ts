// Step 1 (score) and step 2 (classify) of the planner. PLAN.md §4.
import type { PlannerWish, Priority } from "@/lib/types";

export type WishClass = "GROUP" | "SPLINTER" | "SOLO";

export const PRIORITY_WEIGHT: Record<Priority, number> = { MUST: 3, LOVE: 2, NICE: 1 };

/** The author plus everyone who reacted IN. The author's own reaction is ignored. */
export function inSet(wish: PlannerWish): Set<string> {
  const ids = new Set([wish.authorId]);
  for (const r of wish.reactions) {
    if (r.value === "IN" && r.memberId !== wish.authorId) ids.add(r.memberId);
  }
  return ids;
}

function maybeCount(wish: PlannerWish): number {
  return wish.reactions.filter((r) => r.value === "MAYBE" && r.memberId !== wish.authorId).length;
}

/** count(IN) + 0.5 × count(MAYBE), with the author counted as IN. */
export function support(wish: PlannerWish): number {
  return inSet(wish).size + 0.5 * maybeCount(wish);
}

export function score(wish: PlannerWish): number {
  return support(wish) * PRIORITY_WEIGHT[wish.priority];
}

/** IN count needed for a group activity: 60% of the group, rounded up. */
export function groupThreshold(memberCount: number): number {
  return Math.ceil(0.6 * memberCount);
}

export function classify(wish: PlannerWish, memberCount: number): WishClass {
  const ins = inSet(wish).size;
  if (ins >= groupThreshold(memberCount)) return "GROUP";
  if (ins >= 2) return "SPLINTER";
  return "SOLO";
}

export type RankedWish = {
  wish: PlannerWish;
  score: number;
  cls: WishClass;
  inSet: Set<string>;
};

/** Best first: score descending, then createdAt ascending, then id ascending. */
export function compareRanked(a: RankedWish, b: RankedWish): number {
  return (
    b.score - a.score ||
    a.wish.createdAt.getTime() - b.wish.createdAt.getTime() ||
    (a.wish.id < b.wish.id ? -1 : a.wish.id > b.wish.id ? 1 : 0)
  );
}

/** Scores and classifies every ACTIVITY wish (constraints are never scheduled), best first. */
export function rankActivities(wishes: PlannerWish[], memberCount: number): RankedWish[] {
  return wishes
    .filter((w) => w.kind === "ACTIVITY")
    .map((wish) => ({
      wish,
      score: score(wish),
      cls: classify(wish, memberCount),
      inSet: inSet(wish),
    }))
    .sort(compareRanked);
}
