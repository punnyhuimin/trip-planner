import { describe, expect, it, vi } from "vitest";
import { POST as joinTrip } from "@/app/api/trips/[code]/join/route";
import { POST as createTrip } from "@/app/api/trips/route";
import { JOIN_CODE_LENGTH } from "@/lib/codes";
import { MAX_MEMBERS } from "@/lib/limits";
import { TRIP, joinAs, startTrip } from "./flows";
import { body, newBrowser, params, request, setupApi, actAs } from "./harness";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

const t = setupApi();

describe("POST /api/trips", () => {
  it("creates the trip and its host, and sets the member cookie", async () => {
    const browser = actAs(newBrowser());
    const res = await createTrip(request("POST", { ...TRIP, yourName: "Ana" }));
    expect(res.status).toBe(201);
    const { code } = await body<{ code: string }>(res);
    expect(code).toHaveLength(JOIN_CODE_LENGTH);

    const cookie = browser.cookies.get(`tm_${code}`);
    expect(cookie?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    const trip = await t.db.trip.findUniqueOrThrow({
      where: { code },
      include: { members: true },
    });
    expect(trip).toMatchObject({ name: "Kyoto", destination: "Japan", phase: "PLANNING" });
    expect(trip.members).toHaveLength(1);
    expect(trip.members[0]).toMatchObject({ name: "Ana", isHost: true, token: cookie?.value });
  });

  it("rejects invalid input with field errors", async () => {
    const res = await createTrip(request("POST", { ...TRIP, endDate: "2026-10-01", yourName: "" }));
    expect(res.status).toBe(400);
    const { details } = await body<{ details: Record<string, string[]> }>(res);
    expect(Object.keys(details).sort()).toEqual(["endDate", "yourName"]);
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await createTrip(request("POST", "{nope"));
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({ error: "Request body must be JSON" });
  });
});

describe("POST /api/trips/[code]/join", () => {
  it("adds a member with the next color and sets their cookie", async () => {
    const { code } = await startTrip();
    const { browser, id } = await joinAs(code, "Ben");

    const ben = await t.db.member.findUniqueOrThrow({ where: { id } });
    expect(ben).toMatchObject({ name: "Ben", isHost: false });
    expect(browser.cookies.get(`tm_${code}`)?.value).toBe(ben.token);

    const host = await t.db.member.findFirstOrThrow({ where: { trip: { code }, isHost: true } });
    expect(ben.color).not.toBe(host.color);
    expect((await t.db.trip.findUniqueOrThrow({ where: { code } })).version).toBe(1);
  });

  it("accepts the code in any case and with spaces", async () => {
    const { code } = await startTrip();
    actAs(newBrowser());
    const res = await joinTrip(
      request("POST", { yourName: "Cy" }),
      params({ code: ` ${code.toLowerCase()} ` }),
    );
    expect(res.status).toBe(201);
    expect((await body(res)).code).toBe(code);
  });

  it("returns the existing member when this browser already joined", async () => {
    const { code } = await startTrip();
    const { id } = await joinAs(code, "Ben");
    const res = await joinTrip(request("POST", { yourName: "Someone else" }), params({ code }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ code, memberId: id });
    expect(await t.db.member.count({ where: { trip: { code } } })).toBe(2);
  });

  it("404s for an unknown code", async () => {
    const res = await joinTrip(request("POST", { yourName: "Ben" }), params({ code: "ZZZZZZ" }));
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({ error: "No trip with that code" });
  });

  it("refuses a name that's taken, ignoring case", async () => {
    const { code } = await startTrip("Ana");
    actAs(newBrowser());
    const res = await joinTrip(request("POST", { yourName: "ANA" }), params({ code }));
    expect(res.status).toBe(409);
    expect(await body(res)).toEqual({ error: "That name is taken in this trip" });
  });

  it(`refuses a member past ${MAX_MEMBERS}`, async () => {
    const { code } = await startTrip("Member 1");
    for (let i = 2; i <= MAX_MEMBERS; i++) await joinAs(code, `Member ${i}`);
    actAs(newBrowser());
    const res = await joinTrip(request("POST", { yourName: "One too many" }), params({ code }));
    expect(res.status).toBe(409);
    expect((await body(res)).error).toMatch(/full/);
  });

  it("validates the name", async () => {
    const { code } = await startTrip();
    actAs(newBrowser());
    const res = await joinTrip(request("POST", { yourName: "   " }), params({ code }));
    expect(res.status).toBe(400);
  });
});
