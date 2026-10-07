import { requireHost } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { handle, json } from "@/lib/http";
import { removeMember } from "@/lib/trips";

type Ctx = RouteContext<"/api/trips/[code]/members/[id]">;

// Host-only, in any phase: lets the host remove someone who got in with a
// guessed or leaked code.
export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const { code, id } = await ctx.params;
    const { trip } = await requireHost(code);
    const db = getDb();
    await removeMember(db, trip.id, id);
    await bumpVersion(db, trip.id);
    return json({ id });
  });
}
