// Step 4 of the planner: "nobody's wish left behind". PLAN.md §4.
import type { Grid } from "@/lib/planner/place";
import type { RankedWish } from "@/lib/planner/score";
import type { PlannerMember } from "@/lib/types";

/**
 * For each member with MUST wishes but none scheduled, tries to fit their best
 * MUST in by bumping the lowest-scoring scheduled item it could replace. Pinned
 * items are never bumped, and neither is another member's only scheduled MUST.
 *
 * `ranked` must be best-first. Returns the ids of members still without a MUST.
 */
export function fairnessPass(grid: Grid, ranked: RankedWish[], members: PlannerMember[]): string[] {
  const mustsOf = (memberId: string) =>
    ranked.filter((r) => r.wish.priority === "MUST" && r.wish.authorId === memberId);
  const scheduledMusts = (memberId: string) =>
    mustsOf(memberId).filter((r) => grid.isScheduled(r.wish.id)).length;
  const isPinned = (wishId: string) => grid.slots.some((s) => s.wishId === wishId && s.pinned);

  function swapIn(must: RankedWish): boolean {
    if (grid.place(must)) return true;
    // Worst first, so the lowest-scoring item is bumped.
    const targets = ranked
      .filter((r) => grid.isScheduled(r.wish.id) && !isPinned(r.wish.id))
      .reverse();
    for (const target of targets) {
      const author = target.wish.authorId;
      if (target.wish.priority === "MUST" && scheduledMusts(author) === 1) continue;
      const removed = grid.remove(target.wish.id);
      if (grid.place(must)) return true;
      for (const slot of removed) grid.add(slot);
    }
    return false;
  }

  const lacking: string[] = [];
  for (const id of members.map((m) => m.id).sort()) {
    const musts = mustsOf(id);
    if (musts.length === 0 || scheduledMusts(id) > 0) continue;
    if (!musts.some(swapIn)) lacking.push(id);
  }
  return lacking;
}
