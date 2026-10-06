import { requireHost } from "@/lib/auth";
import { tripDays } from "@/lib/dates";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { slotPatchSchema } from "@/lib/schemas";
import { moveSlot, unpinSlot } from "@/lib/slots";

/** Host only: move a slot (pinning it), or unpin it with `{ pinned: false }`. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/trips/[code]/plan/slots/[id]">) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip } = await requireHost(code);
    if (trip.phase !== "PLANNING") {
      throw new HttpError(409, "The plan can only be changed while the trip is being planned");
    }
    const input = slotPatchSchema.parse(await readJson(req));
    const db = getDb();
    if ("pinned" in input) {
      await unpinSlot(db, trip.id, id);
    } else {
      const { startDate, endDate } = await db.trip.findUniqueOrThrow({
        where: { id: trip.id },
        select: { startDate: true, endDate: true },
      });
      await moveSlot(db, trip.id, tripDays(startDate, endDate), id, input);
    }
    await bumpVersion(db, trip.id);
    return json({ id });
  });
}
