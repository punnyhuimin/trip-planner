import type { NextRequest } from "next/server";
import { requireMember } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { buildTripState, isUnchanged } from "@/lib/state";

// Polled every 5 s by every open trip page. When nothing has changed this
// reads only the Trip and Member rows, which keeps polling inside D1's free tier.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/trips/[code]/state">) {
  return handle(async () => {
    await rateLimit("STATE_LIMITER", req);
    const { code } = await ctx.params;
    const { trip, member } = await requireMember(code);
    if (isUnchanged(req.nextUrl.searchParams.get("since"), trip.version)) {
      return json({ unchanged: true });
    }
    return json(await buildTripState(trip.id, member.id));
  });
}
