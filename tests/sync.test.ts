import { describe, expect, it } from "vitest";
import { nextSync, type SyncState, syncStatusOf } from "@/lib/sync";

describe("syncStatusOf", () => {
  it("treats 2xx as ok", () => {
    expect(syncStatusOf(200)).toBe("ok");
    expect(syncStatusOf(204)).toBe("ok");
  });

  it("maps the state route's auth errors", () => {
    // requireMember: unknown trip → 404, missing or stale cookie → 401.
    expect(syncStatusOf(401)).toBe("unauthorized");
    expect(syncStatusOf(404)).toBe("not-found");
  });

  it("treats no response and server errors as offline", () => {
    expect(syncStatusOf(null)).toBe("offline");
    expect(syncStatusOf(500)).toBe("offline");
    expect(syncStatusOf(502)).toBe("offline");
    expect(syncStatusOf(503)).toBe("offline");
  });

  it("treats other unexpected statuses as offline", () => {
    expect(syncStatusOf(429)).toBe("offline");
    expect(syncStatusOf(400)).toBe("offline");
  });
});

describe("nextSync", () => {
  const ok: SyncState = { status: "ok", lastSyncedAt: 1_000 };

  it("keeps the same object while the status holds", () => {
    expect(nextSync(ok, "ok", 9_000)).toBe(ok);
    const offline: SyncState = { status: "offline", lastSyncedAt: 1_000 };
    expect(nextSync(offline, "offline", 9_000)).toBe(offline);
  });

  it("records when the data was last confirmed on failure", () => {
    expect(nextSync(ok, "offline", 5_000)).toEqual({ status: "offline", lastSyncedAt: 5_000 });
    expect(nextSync(ok, "unauthorized", 5_000)).toEqual({
      status: "unauthorized",
      lastSyncedAt: 5_000,
    });
    expect(nextSync(ok, "not-found", 5_000)).toEqual({ status: "not-found", lastSyncedAt: 5_000 });
  });

  it("clears the error after a later successful poll", () => {
    const offline: SyncState = { status: "offline", lastSyncedAt: 1_000 };
    expect(nextSync(offline, "ok", 20_000)).toEqual({ status: "ok", lastSyncedAt: 20_000 });
  });

  it("moves between error states", () => {
    const offline: SyncState = { status: "offline", lastSyncedAt: 1_000 };
    expect(nextSync(offline, "unauthorized", 1_000)).toEqual({
      status: "unauthorized",
      lastSyncedAt: 1_000,
    });
  });
});
