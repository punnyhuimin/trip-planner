import { requireMember } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { createWishSchema } from "@/lib/schemas";

export async function POST(req: Request, ctx: RouteContext<"/api/trips/[code]/wishes">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const { trip, member } = await requireMember(code);
    if (trip.phase !== "PLANNING") {
      throw new HttpError(409, "Wishes can only be added while the trip is being planned");
    }
    const input = createWishSchema.parse(await readJson(req));
    const db = getDb();
    const wish = await db.wish.create({
      data: { ...input, tripId: trip.id, authorId: member.id },
      select: { id: true },
    });
    await bumpVersion(db, trip.id);
    return json({ id: wish.id }, 201);
  });
}
