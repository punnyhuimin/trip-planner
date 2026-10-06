import { requireHost } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json } from "@/lib/http";
import { generatePlan } from "@/lib/planner";
import { loadTripData, toPlannerInput } from "@/lib/state";

/** Host only: reruns the planner, keeping pinned slots where they are. */
export async function POST(_req: Request, ctx: RouteContext<"/api/trips/[code]/plan/generate">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const { trip } = await requireHost(code);
    if (trip.phase !== "PLANNING") {
      throw new HttpError(409, "The plan can only be regenerated while the trip is being planned");
    }
    const db = getDb();
    const result = generatePlan(toPlannerInput(await loadTripData(db, trip.id)));

    // D1 has no transactions. If the insert fails after the delete, the trip
    // just has no unpinned slots until the host regenerates again.
    await db.planSlot.deleteMany({ where: { tripId: trip.id, pinned: false } });
    const fresh = result.slots.filter((s) => !s.pinned);
    if (fresh.length > 0) {
      await db.planSlot.createMany({ data: fresh.map((s) => ({ ...s, tripId: trip.id })) });
    }
    await bumpVersion(db, trip.id);

    return json({
      unscheduled: result.unscheduled.map((w) => ({ id: w.id, title: w.title })),
      warnings: result.warnings,
    });
  });
}
