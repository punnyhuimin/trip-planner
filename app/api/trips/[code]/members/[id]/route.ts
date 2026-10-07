import { requireHost } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json } from "@/lib/http";

type Ctx = RouteContext<"/api/trips/[code]/members/[id]">;

// Host-only. Lets the host remove someone who got in with a guessed or leaked
// code. Their wishes, reactions and plan slots go with them (onDelete: Cascade),
// and their cookie stops working because the member row is gone.
export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip, member } = await requireHost(code);
    if (id === member.id) throw new HttpError(400, "The host can't remove themselves");
    if (trip.phase !== "PLANNING") {
      throw new HttpError(409, "Members can only be removed while the trip is being planned");
    }
    const db = getDb();
    const target = await db.member.findFirst({
      where: { id, tripId: trip.id },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "Member not found");

    await db.member.delete({ where: { id: target.id } });
    await bumpVersion(db, trip.id);
    return json({ id: target.id });
  });
}
