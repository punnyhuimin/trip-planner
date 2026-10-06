import { requireMember } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { reactionSchema } from "@/lib/schemas";
import { requireWish } from "@/lib/wishes";

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/trips/[code]/wishes/[id]/reaction">,
) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip, member } = await requireMember(code);
    const { value } = reactionSchema.parse(await readJson(req));
    const db = getDb();
    const wish = await requireWish(db, trip.id, id);
    if (wish.authorId === member.id) {
      throw new HttpError(400, "You can't react to your own wish; you already count as in");
    }
    if (wish.kind === "CONSTRAINT") throw new HttpError(400, "Constraints don't take reactions");

    const key = { wishId_memberId: { wishId: wish.id, memberId: member.id } };
    if (value === null) {
      await db.reaction.deleteMany({ where: { wishId: wish.id, memberId: member.id } });
    } else {
      await db.reaction.upsert({
        where: key,
        create: { wishId: wish.id, memberId: member.id, value },
        update: { value },
        select: { id: true },
      });
    }
    await bumpVersion(db, trip.id);
    return json({ wishId: wish.id, value });
  });
}
