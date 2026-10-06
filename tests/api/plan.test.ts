import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as generate } from "@/app/api/trips/[code]/plan/generate/route";
import { PATCH as patchSlot } from "@/app/api/trips/[code]/plan/slots/[id]/route";
import type { SlotTrack, TimeBlock } from "@/lib/types";
import { type Browser, body, params, request, setupApi, actAs } from "./harness";
import { joinAs, startTrip, wish } from "./flows";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

const t = setupApi();

let code: string;
let tripId: string;
let host: Browser;

beforeEach(async () => {
  ({ code, host } = await startTrip());
  tripId = (await t.db.trip.findUniqueOrThrow({ where: { code } })).id;
});

async function slot(
  wishId: string,
  dayIndex: number,
  timeOfDay: TimeBlock,
  track: SlotTrack = "GROUP",
) {
  return t.db.planSlot.create({ data: { tripId, wishId, dayIndex, timeOfDay, track } });
}

const slotsOf = (wishId: string) =>
  t.db.planSlot.findMany({ where: { wishId }, orderBy: { timeOfDay: "asc" } });

describe("POST /api/trips/[code]/plan/generate", () => {
  it("places wishes, reports unscheduled ones, and bumps the version", async () => {
    const a = await wish(code, { title: "Arashiyama", timeOfDay: "MORNING" });
    await wish(code, { title: "No early starts", kind: "CONSTRAINT" });
    const before = (await t.db.trip.findUniqueOrThrow({ where: { id: tripId } })).version;

    const res = await generate(request("POST"), params({ code }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ unscheduled: [], warnings: [] });
    expect(await slotsOf(a)).toEqual([
      expect.objectContaining({ dayIndex: 0, timeOfDay: "MORNING", pinned: false }),
    ]);
    expect((await t.db.trip.findUniqueOrThrow({ where: { id: tripId } })).version).toBe(before + 1);
  });

  it("keeps pinned slots and replaces the rest", async () => {
    const a = await wish(code, { title: "Pinned", timeOfDay: "EVENING" });
    const b = await wish(code, { title: "Free", timeOfDay: "AFTERNOON" });
    const pinned = await slot(a, 2, "EVENING");
    await t.db.planSlot.update({ where: { id: pinned.id }, data: { pinned: true } });
    const stale = await slot(b, 1, "NIGHT");

    expect((await generate(request("POST"), params({ code }))).status).toBe(200);
    expect(await slotsOf(a)).toEqual([expect.objectContaining({ id: pinned.id, dayIndex: 2 })]);
    const [fresh] = await slotsOf(b);
    expect(fresh.id).not.toBe(stale.id);
    expect(fresh.timeOfDay).toBe("AFTERNOON");
  });

  it("lists the wishes that didn't fit", async () => {
    const short = await startTrip("Ana", { endDate: "2026-11-01" });
    const ids: string[] = [];
    for (const title of ["One", "Two", "Three"]) {
      ids.push(await wish(short.code, { title, timeOfDay: "MORNING" }));
    }
    const res = await generate(request("POST"), params({ code: short.code }));
    const { unscheduled } = await body<{ unscheduled: { id: string; title: string }[] }>(res);
    expect(unscheduled).toEqual([
      { id: ids[1], title: "Two" },
      { id: ids[2], title: "Three" },
    ]);
  });

  it("works with nothing to place", async () => {
    expect(await body(await generate(request("POST"), params({ code })))).toEqual({
      unscheduled: [],
      warnings: [],
    });
  });

  it("is host-only and planning-only", async () => {
    await joinAs(code, "Ben");
    expect((await generate(request("POST"), params({ code }))).status).toBe(403);
    actAs(host);
    await t.db.trip.update({ where: { id: tripId }, data: { phase: "LOCKED" } });
    expect((await generate(request("POST"), params({ code }))).status).toBe(409);
  });
});

describe("PATCH /api/trips/[code]/plan/slots/[id]", () => {
  const patch = (id: string, input: unknown) =>
    patchSlot(request("PATCH", input), params({ code, id }));

  it("moves a slot and pins it", async () => {
    const a = await wish(code);
    const s = await slot(a, 0, "MORNING");
    const res = await patch(s.id, { dayIndex: 2, timeOfDay: "NIGHT" });
    expect(await body(res)).toEqual({ id: s.id });
    expect(await slotsOf(a)).toEqual([
      expect.objectContaining({ dayIndex: 2, timeOfDay: "NIGHT", pinned: true }),
    ]);
  });

  it("moves both halves of a long wish together", async () => {
    const a = await wish(code, { durationHrs: 6 });
    await slot(a, 0, "AFTERNOON");
    const first = await slot(a, 0, "MORNING");
    expect((await patch(first.id, { dayIndex: 1, timeOfDay: "NIGHT" })).status).toBe(200);
    const moved = await slotsOf(a);
    expect(moved.map((s) => [s.dayIndex, s.timeOfDay, s.pinned])).toEqual([
      [1, "EVENING", true],
      [1, "NIGHT", true],
    ]);
  });

  it("refuses to stack two group activities", async () => {
    const a = await wish(code, { title: "A" });
    const b = await wish(code, { title: "B" });
    const c = await wish(code, { title: "C" });
    const sa = await slot(a, 0, "MORNING");
    await slot(b, 1, "EVENING");
    await slot(c, 1, "AFTERNOON", "SPLINTER");

    const res = await patch(sa.id, { dayIndex: 1, timeOfDay: "EVENING" });
    expect(res.status).toBe(409);
    // A splinter slot doesn't block a group one, and nor does the wish itself.
    expect((await patch(sa.id, { dayIndex: 1, timeOfDay: "AFTERNOON" })).status).toBe(200);
    expect((await patch(sa.id, { dayIndex: 1, timeOfDay: "AFTERNOON" })).status).toBe(200);
  });

  it("lets a splinter slot share a block", async () => {
    const a = await wish(code, { title: "A" });
    const b = await wish(code, { title: "B" });
    await slot(a, 0, "MORNING");
    const sb = await slot(b, 0, "EVENING", "SPLINTER");
    expect((await patch(sb.id, { dayIndex: 0, timeOfDay: "MORNING" })).status).toBe(200);
  });

  it("unpins every slot of the wish", async () => {
    const a = await wish(code, { durationHrs: 6 });
    const s = await slot(a, 0, "MORNING");
    await slot(a, 0, "AFTERNOON");
    await t.db.planSlot.updateMany({ where: { wishId: a }, data: { pinned: true } });
    expect((await patch(s.id, { pinned: false })).status).toBe(200);
    expect((await slotsOf(a)).map((x) => x.pinned)).toEqual([false, false]);
  });

  it("rejects days past the end of the trip and bad input", async () => {
    const s = await slot(await wish(code), 0, "MORNING");
    const res = await patch(s.id, { dayIndex: 3, timeOfDay: "MORNING" });
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({ error: "This trip has 3 days" });
    expect((await patch(s.id, { dayIndex: 0, timeOfDay: "ANY" })).status).toBe(400);
    expect((await patch(s.id, { pinned: true })).status).toBe(400);
  });

  it("404s for an unknown slot", async () => {
    expect((await patch("nope", { dayIndex: 0, timeOfDay: "MORNING" })).status).toBe(404);
    expect((await patch("nope", { pinned: false })).status).toBe(404);
  });

  it("is host-only and planning-only", async () => {
    const s = await slot(await wish(code), 0, "MORNING");
    await joinAs(code, "Ben");
    expect((await patch(s.id, { pinned: false })).status).toBe(403);
    actAs(host);
    await t.db.trip.update({ where: { id: tripId }, data: { phase: "JOURNAL" } });
    expect((await patch(s.id, { pinned: false })).status).toBe(409);
  });
});
