import { describe, expect, it, vi } from "vitest";
import { POST as generate } from "@/app/api/trips/[code]/plan/generate/route";
import { GET as getState } from "@/app/api/trips/[code]/state/route";
import { getCurrentMember } from "@/lib/auth";
import type { StateResponse, TripState } from "@/lib/types";
import { joinAs, startTrip, wish } from "./flows";
import { body, newBrowser, params, request, setupApi, actAs } from "./harness";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

setupApi();

async function state(code: string, since?: number) {
  const query = since === undefined ? "" : `?since=${since}`;
  const res = await getState(
    request("GET", undefined, `http://localhost/api/trips/${code}/state${query}`),
    params({ code }),
  );
  return { status: res.status, data: await body<StateResponse>(res) };
}

describe("GET /api/trips/[code]/state", () => {
  it("returns the whole trip for a member, without tokens", async () => {
    const { code, host } = await startTrip();
    await wish(code, { title: "Tea ceremony", tags: ["Culture", "food"] });
    const { id: benId } = await joinAs(code, "Ben");
    actAs(host);

    const { status, data } = await state(code);
    expect(status).toBe(200);
    const s = data as TripState;
    expect(s.trip).toEqual({
      code,
      name: "Kyoto",
      destination: "Japan",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      phase: "PLANNING",
      days: 3,
    });
    expect(s.members.map((m) => m.name)).toEqual(["Ana", "Ben"]);
    expect(s.members.find((m) => m.id === s.meId)?.isHost).toBe(true);
    expect(s.meId).not.toBe(benId);
    expect(s.wishes).toHaveLength(1);
    expect(s.wishes[0]).toMatchObject({ title: "Tea ceremony", tags: ["culture", "food"] });
    expect(typeof s.wishes[0].createdAt).toBe("string");
    expect(s.slots).toEqual([]);
    expect(s.warnings).toEqual([]);
    expect(s.version).toBe(2);
    expect(JSON.stringify(s)).not.toMatch(/token/i);
  });

  it("answers { unchanged } when since matches the version", async () => {
    const { code } = await startTrip();
    const first = (await state(code)).data as TripState;
    expect((await state(code, first.version)).data).toEqual({ unchanged: true });

    await wish(code);
    const after = await state(code, first.version);
    expect((after.data as TripState).version).toBe(first.version + 1);
  });

  it("recomputes warnings from the current plan", async () => {
    const { code, host } = await startTrip();
    await wish(code, { title: "Tea ceremony" });
    const ben = await joinAs(code, "Ben");
    actAs(host);
    expect((await generate(request("POST"), params({ code }))).status).toBe(200);
    expect(((await state(code)).data as TripState).warnings).toEqual([]);

    // Ben's must-do arrives after the plan was generated, so it isn't in it.
    actAs(ben.browser);
    await wish(code, { title: "Sumo", priority: "MUST" });

    const s = (await state(code)).data as TripState;
    expect(s.slots.length).toBeGreaterThan(0);
    expect(s.warnings).toEqual([
      expect.objectContaining({ type: "UNSCHEDULED_MUST", memberIds: [ben.id] }),
    ]);
  });

  it("401s without the member cookie and 404s for an unknown trip", async () => {
    const { code } = await startTrip();
    actAs(newBrowser());
    expect((await state(code)).status).toBe(401);
    expect((await state("NOPE42")).status).toBe(404);
  });
});

describe("getCurrentMember", () => {
  it("is null without a cookie, for an unknown trip, or for a stale token", async () => {
    const { code, host } = await startTrip();
    expect((await getCurrentMember(code))?.member.name).toBe("Ana");
    expect(await getCurrentMember("NOPE42")).toBeNull();

    actAs(newBrowser());
    expect(await getCurrentMember(code)).toBeNull();

    const other = await startTrip("Zed");
    // A token from a different trip doesn't count here.
    other.host.cookies.set(`tm_${code}`, other.host.cookies.get(`tm_${other.code}`)!);
    expect(await getCurrentMember(code)).toBeNull();
    actAs(host);
    expect(await getCurrentMember(code.toLowerCase())).not.toBeNull();
  });
});
