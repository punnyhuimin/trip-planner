// Whether the trip page's live updates are getting through. Pure, so the
// polling hook stays thin and the mapping is unit-tested.

/**
 * - `ok`: the last poll succeeded.
 * - `offline`: no response, a 5xx, or anything else unexpected; the data is stale.
 * - `unauthorized`: 401, the `tm_<CODE>` cookie no longer matches a member.
 * - `not-found`: 404, the trip was deleted.
 */
export type SyncStatus = "ok" | "offline" | "unauthorized" | "not-found";

/**
 * `lastSyncedAt` (epoch ms) is when the server last confirmed the data shown.
 * It is captured when the status changes, so it's exact whenever the status
 * isn't `ok`, which is the only time it's shown.
 */
export type SyncState = { status: SyncStatus; lastSyncedAt: number };

/**
 * Maps the HTTP status of `GET /api/trips/[code]/state` to a sync status.
 * Pass `null` when the request never got a response (offline, DNS, CORS) or the
 * body couldn't be read.
 */
export function syncStatusOf(httpStatus: number | null): SyncStatus {
  if (httpStatus === null) return "offline";
  if (httpStatus >= 200 && httpStatus < 300) return "ok";
  if (httpStatus === 401) return "unauthorized";
  if (httpStatus === 404) return "not-found";
  return "offline";
}

/**
 * The next sync state after a poll. Returns `prev` unchanged while the status
 * holds, so a run of successful polls doesn't re-render the page.
 *
 * @param lastOkAt when the most recent successful poll finished (epoch ms).
 */
export function nextSync(prev: SyncState, status: SyncStatus, lastOkAt: number): SyncState {
  if (prev.status === status) return prev;
  return { status, lastSyncedAt: lastOkAt };
}
