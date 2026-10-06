import { setMemberCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handle, json, readJson } from "@/lib/http";
import { createTripSchema } from "@/lib/schemas";
import { createTripWithHost } from "@/lib/trips";

export async function POST(req: Request) {
  return handle(async () => {
    const input = createTripSchema.parse(await readJson(req));
    const { code, token } = await createTripWithHost(getDb(), input);
    await setMemberCookie(code, token);
    return json({ code }, 201);
  });
}
