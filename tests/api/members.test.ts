import { describe, expect, it, vi } from "vitest";
import { DELETE as removeMember } from "@/app/api/trips/[code]/members/[id]/route";
import { GET as getState } from "@/app/api/trips/[code]/state/route";
import { joinAs, startTrip, wish } from "./flows";
import { actAs, params, request, setupApi } from "./harness";

vi.mock("@opennextjs/cloudflare", async () => (await import("./harness")).cloudflareMock);
vi.mock("next/headers", async () => (await import("./harness")).headersMock);

const t = setupApi();

describe("DELETE /api/trips/[code]/members/[id]", () => {
  it("lets the host remove a member, taking their wishes and access with them", async () => {
    const { code, host } = await startTrip();
    const guest = await joinAs(code, "Ben");
    const wishId = await wish(code);

    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: guest.id }));
    expect(res.status).toBe(200);
    expect(await t.db.member.findUnique({ where: { id: guest.id } })).toBeNull();
    expect(await t.db.wish.findUnique({ where: { id: wishId } })).toBeNull();

    actAs(guest.browser);
    const state = await getState(request("GET"), params({ code }));
    expect(state.status).toBe(401);
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
    const me = await t.db.member.findFirstOrThrow({ where: { isHost: true } });
    actAs(host);
    const res = await removeMember(request("DELETE"), params({ code, id: me.id }));
    expect(res.status).toBe(400);
  });
});
