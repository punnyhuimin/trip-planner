// Starts and joins trips through the real route handlers. Kept apart from
// harness.ts, which the vi.mock factories import.
import { POST as createTrip } from "@/app/api/trips/route";
import { POST as joinTrip } from "@/app/api/trips/[code]/join/route";
import { POST as addWish } from "@/app/api/trips/[code]/wishes/route";
import type { CreateWishInput } from "@/lib/schemas";
import { type Browser, body, newBrowser, params, request, actAs } from "./harness";

export const TRIP = {
  name: "Kyoto",
  destination: "Japan",
  startDate: "2026-11-01",
  endDate: "2026-11-03",
};

/** A new trip; `host` is left as the current browser. */
export async function startTrip(hostName = "Ana", overrides: Partial<typeof TRIP> = {}) {
  const host = actAs(newBrowser());
  const res = await createTrip(request("POST", { ...TRIP, ...overrides, yourName: hostName }));
  if (res.status !== 201) throw new Error(`createTrip: ${res.status} ${await res.text()}`);
  const { code } = await body<{ code: string }>(res);
  return { code, host };
}

/** Joins in a new browser, which is left as the current one. */
export async function joinAs(
  code: string,
  name: string,
): Promise<{ browser: Browser; id: string }> {
  const browser = actAs(newBrowser());
  const res = await joinTrip(request("POST", { yourName: name }), params({ code }));
  if (res.status !== 201) throw new Error(`join: ${res.status} ${await res.text()}`);
  return { browser, id: (await body<{ memberId: string }>(res)).memberId };
}

/** Adds a wish as the current browser. */
export async function wish(code: string, input: Partial<CreateWishInput> = {}): Promise<string> {
  const res = await addWish(
    request("POST", { title: "Fushimi Inari", kind: "ACTIVITY", ...input }),
    params({ code }),
  );
  if (res.status !== 201) throw new Error(`wish: ${res.status} ${await res.text()}`);
  return (await body<{ id: string }>(res)).id;
}
