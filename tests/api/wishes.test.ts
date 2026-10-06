import { describe, expect, it, vi } from "vitest";
import { PUT as react } from "@/app/api/trips/[code]/wishes/[id]/reaction/route";
import { DELETE as deleteWish, PATCH as editWish } from "@/app/api/trips/[code]/wishes/[id]/route";
import { POST as addWish } from "@/app/api/trips/[code]/wishes/route";
import { joinAs, startTrip, wish } from "./flows";
import { body, newBrowser, params, request, setupApi, actAs } from "./harness";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

const t = setupApi();

const version = async (code: string) =>
  (await t.db.trip.findUniqueOrThrow({ where: { code } })).version;

describe("POST /api/trips/[code]/wishes", () => {
  it("creates a wish with defaults and normalized tags", async () => {
    const { code } = await startTrip();
    const before = await version(code);
    const id = await wish(code, { title: "  Ramen crawl ", tags: ["Food", "food", "late,night"] });
    const row = await t.db.wish.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      title: "Ramen crawl",
      priority: "NICE",
      timeOfDay: "ANY",
      durationHrs: 2,
      tags: "food,late night",
      notes: null,
    });
    expect(await version(code)).toBe(before + 1);
  });

  it("is closed once the trip leaves planning", async () => {
    const { code } = await startTrip();
    await t.db.trip.update({ where: { code }, data: { phase: "LOCKED" } });
    const res = await addWish(
      request("POST", { title: "Late", kind: "ACTIVITY" }),
      params({ code }),
    );
    expect(res.status).toBe(409);
  });

  it("needs a member", async () => {
    const { code } = await startTrip();
    actAs(newBrowser());
    const res = await addWish(request("POST", { title: "x", kind: "ACTIVITY" }), params({ code }));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/trips/[code]/wishes/[id]", () => {
  it("lets the author edit", async () => {
    const { code } = await startTrip();
    const id = await wish(code);
    const res = await editWish(
      request("PATCH", { title: "Kinkaku-ji", energy: 2 }),
      params({ code, id }),
    );
    expect(res.status).toBe(200);
    expect(await t.db.wish.findUniqueOrThrow({ where: { id } })).toMatchObject({
      title: "Kinkaku-ji",
      energy: 2,
    });
  });

  it("treats an empty patch as a no-op", async () => {
    const { code } = await startTrip();
    const id = await wish(code);
    const before = await version(code);
    const res = await editWish(request("PATCH", {}), params({ code, id }));
    expect(await body(res)).toEqual({ id });
    expect(await version(code)).toBe(before);
  });

  it("forbids other members, even the host", async () => {
    const { code, host } = await startTrip();
    const ben = await joinAs(code, "Ben");
    const id = await wish(code);
    actAs(host);
    const res = await editWish(request("PATCH", { title: "Mine now" }), params({ code, id }));
    expect(res.status).toBe(403);
    actAs(ben.browser);
    expect((await editWish(request("PATCH", { title: "ok" }), params({ code, id }))).status).toBe(
      200,
    );
  });

  it("is closed once the trip leaves planning", async () => {
    const { code } = await startTrip();
    const id = await wish(code);
    await t.db.trip.update({ where: { code }, data: { phase: "ON_TRIP" } });
    expect((await editWish(request("PATCH", { title: "x" }), params({ code, id }))).status).toBe(
      409,
    );
  });

  it("drops reactions and slots when a wish becomes a constraint", async () => {
    const { code, host } = await startTrip();
    const id = await wish(code);
    const trip = await t.db.trip.findUniqueOrThrow({ where: { code } });
    await joinAs(code, "Ben");
    expect((await react(request("PUT", { value: "IN" }), params({ code, id }))).status).toBe(200);
    await t.db.planSlot.create({
      data: { tripId: trip.id, wishId: id, dayIndex: 0, timeOfDay: "MORNING", track: "GROUP" },
    });

    actAs(host);
    const res = await editWish(request("PATCH", { kind: "CONSTRAINT" }), params({ code, id }));
    expect(res.status).toBe(200);
    expect(await t.db.reaction.count({ where: { wishId: id } })).toBe(0);
    expect(await t.db.planSlot.count({ where: { wishId: id } })).toBe(0);
  });

  it("404s for a wish from another trip", async () => {
    const other = await startTrip("Zed");
    const id = await wish(other.code);
    const { code } = await startTrip();
    const res = await editWish(request("PATCH", { title: "x" }), params({ code, id }));
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({ error: "Wish not found" });
  });
});

describe("DELETE /api/trips/[code]/wishes/[id]", () => {
  it("lets the author or the host delete, nobody else", async () => {
    const { code, host } = await startTrip();
    const ben = await joinAs(code, "Ben");
    const bensWish = await wish(code, { title: "Ben's" });
    const bensOther = await wish(code, { title: "Ben's other" });
    await joinAs(code, "Cy");

    expect((await deleteWish(request("DELETE"), params({ code, id: bensWish }))).status).toBe(403);

    actAs(ben.browser);
    expect((await deleteWish(request("DELETE"), params({ code, id: bensWish }))).status).toBe(200);
    actAs(host);
    expect((await deleteWish(request("DELETE"), params({ code, id: bensOther }))).status).toBe(200);
    expect(await t.db.wish.count({ where: { trip: { code } } })).toBe(0);
  });
});

describe("PUT /api/trips/[code]/wishes/[id]/reaction", () => {
  it("sets, changes and clears a reaction", async () => {
    const { code } = await startTrip();
    const id = await wish(code);
    const ben = await joinAs(code, "Ben");
    const put = (value: string | null) => react(request("PUT", { value }), params({ code, id }));

    expect(await body(await put("MAYBE"))).toEqual({ wishId: id, value: "MAYBE" });
    await put("IN");
    expect(await t.db.reaction.findMany({ where: { wishId: id } })).toEqual([
      expect.objectContaining({ memberId: ben.id, value: "IN" }),
    ]);
    await put(null);
    expect(await t.db.reaction.count({ where: { wishId: id } })).toBe(0);
  });

  it("refuses reactions to your own wish or to a constraint", async () => {
    const { code } = await startTrip();
    const own = await wish(code);
    const constraint = await wish(code, { title: "No early starts", kind: "CONSTRAINT" });
    const put = (id: string) => react(request("PUT", { value: "IN" }), params({ code, id }));

    expect((await put(own)).status).toBe(400);
    await joinAs(code, "Ben");
    const res = await put(constraint);
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({ error: "Constraints don't take reactions" });
  });

  it("validates the value", async () => {
    const { code } = await startTrip();
    const id = await wish(code);
    await joinAs(code, "Ben");
    expect((await react(request("PUT", { value: "YES" }), params({ code, id }))).status).toBe(400);
  });
});
