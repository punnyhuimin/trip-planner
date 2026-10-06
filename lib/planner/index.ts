// The trip planner: a pure function from wishes to a day-by-day plan.
// No database access and no I/O, so it's easy to test. PLAN.md §4.
import { detectWarnings } from "@/lib/planner/conflicts";
import { fairnessPass } from "@/lib/planner/fairness";
import { Grid, applyPins, compareSlots, placeGroups, placeSplinters } from "@/lib/planner/place";
import { rankActivities } from "@/lib/planner/score";
import type { PlanResult, PlannerInput } from "@/lib/types";

export { detectWarnings } from "@/lib/planner/conflicts";

/**
 * Deterministic: the same input (in any order) always gives the same plan.
 * Ties break by score, then createdAt, then id.
 */
export function generatePlan(input: PlannerInput): PlanResult {
  const members = [...input.members].sort((a, b) => (a.id < b.id ? -1 : 1));
  const ranked = rankActivities(input.wishes, members.length);
  const grid = new Grid(input.days, new Map(ranked.map((r) => [r.wish.id, r])));

  applyPins(grid, input.pinnedSlots, new Set(ranked.map((r) => r.wish.id))); // pinned first
  placeGroups(grid, ranked); // step 3: group activities
  placeSplinters(grid, ranked); // step 3: splinters, then solo wishes
  fairnessPass(grid, ranked, members); // step 4: nobody's wish left behind

  const slots = [...grid.slots].sort(compareSlots);
  return {
    slots,
    unscheduled: ranked.filter((r) => !grid.isScheduled(r.wish.id)).map((r) => r.wish),
    warnings: detectWarnings({ members, wishes: input.wishes }, slots), // step 5
  };
}
