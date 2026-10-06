import { setMemberCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createTripSchema } from "@/lib/schemas";
import { createTripWithHost } from "@/lib/trips";

export async function POST(req: Request) {
  return handle(async () => {
    await rateLimit("CREATE_TRIP_LIMITER", req);
    const input = createTripSchema.parse(await readJson(req));
    const { code, token } = await createTripWithHost(getDb(), input);
    await setMemberCookie(code, token);
    return json({ code }, 201);
  });
}
