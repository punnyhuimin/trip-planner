import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("GETs without a body and returns the data", async () => {
    const fetch = stubFetch(async () => Response.json({ hello: "world" }));
    expect(await api("/api/x")).toEqual({ ok: true, status: 200, data: { hello: "world" } });
    expect(fetch).toHaveBeenCalledWith("/api/x", {
      method: "GET",
      cache: "no-store",
      headers: undefined,
      body: undefined,
    });
  });

  it("sends a JSON body", async () => {
    const fetch = stubFetch(async () => Response.json({ id: "w1" }, { status: 201 }));
    expect(await api("/api/x", "POST", { title: "Tea" })).toMatchObject({ ok: true, status: 201 });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"title":"Tea"}',
    });
  });

  it("passes the server's error and field details through", async () => {
    stubFetch(async () =>
      Response.json({ error: "Invalid input", details: { title: ["Too long"] } }, { status: 400 }),
    );
    expect(await api("/api/x", "POST", {})).toEqual({
      ok: false,
      status: 400,
      error: "Invalid input",
      details: { title: ["Too long"] },
    });
  });

  it("describes a failure with no readable body", async () => {
    stubFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(await api("/api/x")).toEqual({
      ok: false,
      status: 502,
      error: "Request failed (502)",
      details: {},
    });
  });

  it("never throws when the network is down", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await api("/api/x")).toMatchObject({
      ok: false,
      status: 0,
      error: expect.stringMatching(/connection/),
    });
  });
});
