// Client-side fetch wrapper. Never throws: every outcome comes back as a value
// the UI can render.
import type { ApiError } from "@/lib/types";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; details: Record<string, string[] | undefined> };

export async function api<T>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Can't reach TripMaker. Check your connection.",
      details: {},
    };
  }
  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: payload as T };
  const err = (payload ?? {}) as Partial<ApiError>;
  return {
    ok: false,
    status: res.status,
    error: err.error ?? `Request failed (${res.status})`,
    details: err.details ?? {},
  };
}
