import { findTrip, getCurrentMember, setMemberCookie } from "@/lib/auth";
import { bumpVersion, getDb } from "@/lib/db";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { joinSchema } from "@/lib/schemas";
import { addMember } from "@/lib/trips";

export async function POST(req: Request, ctx: RouteContext<"/api/trips/[code]/join">) {
  return handle(async () => {
    // Strict per-IP limit: this is where a guessed code would be tried.
    await rateLimit("JOIN_LIMITER", req);
    const { code } = await ctx.params;
    const input = joinSchema.parse(await readJson(req));
    const db = getDb();
    const trip = await findTrip(db, code);
    if (!trip) throw new HttpError(404, "No trip with that code");

    // Already a member from this browser: don't create a duplicate.
    const current = await getCurrentMember(trip.code);
    if (current) return json({ code: trip.code, memberId: current.member.id });

    const member = await addMember(db, trip.id, input.yourName);
    await bumpVersion(db, trip.id);
    await setMemberCookie(trip.code, member.token);
    return json({ code: trip.code, memberId: member.id }, 201);
  });
}
