import { requireMember } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { updateWishSchema } from "@/lib/schemas";
import { requireWish } from "@/lib/wishes";

type Ctx = RouteContext<"/api/trips/[code]/wishes/[id]">;

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip, member } = await requireMember(code);
    const db = getDb();
    const wish = await requireWish(db, trip.id, id);
    if (wish.authorId !== member.id) throw new HttpError(403, "Only the author can edit this wish");
    if (trip.phase !== "PLANNING") {
      throw new HttpError(409, "Wishes can only be edited while the trip is being planned");
    }
    const input = updateWishSchema.parse(await readJson(req));
    if (Object.keys(input).length === 0) return json({ id: wish.id });

    await db.wish.update({ where: { id: wish.id }, data: input, select: { id: true } });
    // A constraint is never reacted to or scheduled. Clean up after the update,
    // so stopping halfway only leaves stale rows the next edit would clear.
    if (input.kind === "CONSTRAINT" && wish.kind !== "CONSTRAINT") {
      await db.reaction.deleteMany({ where: { wishId: wish.id } });
      await db.planSlot.deleteMany({ where: { wishId: wish.id } });
    }
    await bumpVersion(db, trip.id);
    return json({ id: wish.id });
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip, member } = await requireMember(code);
    const db = getDb();
    const wish = await requireWish(db, trip.id, id);
    if (wish.authorId !== member.id && !member.isHost) {
      throw new HttpError(403, "Only the author or the host can delete this wish");
    }
    // Reactions and plan slots go with it (onDelete: Cascade).
    await db.wish.delete({ where: { id: wish.id } });
    await bumpVersion(db, trip.id);
    return json({ id: wish.id });
  });
}
