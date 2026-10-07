import { describe, expect, it, vi } from "vitest";
import { DELETE as removeMember } from "@/app/api/trips/[code]/members/[id]/route";
import { GET as getState } from "@/app/api/trips/[code]/state/route";
import { PUT as react } from "@/app/api/trips/[code]/wishes/[id]/reaction/route";
import { MAX_MEMBERS } from "@/lib/limits";
import { joinAs, startTrip, wish } from "./flows";
import { actAs, params, request, setupApi } from "./harness";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

const t = setupApi();

describe("DELETE /api/trips/[code]/members/[id]", () => {
  it("lets the host remove a member, taking their wishes, reactions and access with them", async () => {
    const { code, host } = await startTrip();
    const hostWishId = await wish(code);
    const guest = await joinAs(code, "Ben");
    const wishId = await wish(code);
    await react(request("PUT", { value: "IN" }), params({ code, id: hostWishId }));
    const before = await t.db.trip.findUniqueOrThrow({ where: { code } });

    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: guest.id }));
    expect(res.status).toBe(200);
    expect(await t.db.member.findUnique({ where: { id: guest.id } })).toBeNull();
    expect(await t.db.wish.findUnique({ where: { id: wishId } })).toBeNull();
    expect(await t.db.reaction.count({ where: { memberId: guest.id } })).toBe(0);
    expect((await t.db.trip.findUniqueOrThrow({ where: { code } })).version).toBe(
      before.version + 1,
    );

    actAs(guest.browser);
    const state = await getState(request("GET"), params({ code }));
    expect(state.status).toBe(401);
  });

  it("frees a place in a full trip", async () => {
    const { code, host } = await startTrip();
    let last = { id: "" };
    for (let i = 2; i <= MAX_MEMBERS; i++) last = await joinAs(code, `Member ${i}`);
    await expect(joinAs(code, "One too many")).rejects.toThrow(/409/);

    actAs(host);
    await removeMember(request("DELETE"), params({ code, id: last.id }));
    await expect(joinAs(code, "Latecomer")).resolves.toMatchObject({ id: expect.any(String) });
  });

  it("works after planning is over", async () => {
    const { code, host } = await startTrip();
    const guest = await joinAs(code, "Ben");
    await t.db.trip.update({ where: { code }, data: { phase: "LOCKED" } });

    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: guest.id }));
    expect(res.status).toBe(200);
  });

  it("is host-only", async () => {
    const { code } = await startTrip();
    const ben = await joinAs(code, "Ben");
    const cat = await joinAs(code, "Cat");
    actAs(cat.browser);
    const res = await removeMember(request("DELETE"), params({ code, id: ben.id }));
    expect(res.status).toBe(403);
  });

  it("won't remove the host", async () => {
    const { code, host } = await startTrip();
    const me = await t.db.member.findFirstOrThrow({ where: { trip: { code }, isHost: true } });
    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: me.id }));
    expect(res.status).toBe(400);
  });

  it("404s for a member of another trip", async () => {
    const other = await startTrip();
    const stranger = await joinAs(other.code, "Zed");
    const { code, host } = await startTrip();
    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: stranger.id }));
    expect(res.status).toBe(404);
    expect(await t.db.member.findUnique({ where: { id: stranger.id } })).not.toBeNull();
  });
});
