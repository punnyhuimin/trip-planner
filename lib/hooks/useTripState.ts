"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StateResponse, TripState } from "@/lib/types";

const POLL_MS = 5_000;

/**
 * Live trip state. Polls `/state?since=<version>` every 5 s while the tab is
 * visible; an unchanged trip costs the server a single row read.
 *
 * - `refresh()` fetches right away; call it after every mutation.
 * - `update()` applies an optimistic local change. The next newer server
 *   version replaces it.
 */
export function useTripState(code: string, initial: TripState) {
  const [state, setState] = useState(initial);
  const version = useRef(initial.version);
  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${code}/state?since=${version.current}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as StateResponse;
      if ("unchanged" in data || data.version < version.current) return;
      version.current = data.version;
      setState(data);
    } catch {
      // Offline or a blip: the next poll tries again.
    }
  }, [code]);

  const refresh = useCallback(async (): Promise<void> => {
    // A refresh requested mid-request runs once more afterwards, so a
    // mutation's result is never missed by an older in-flight poll.
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    inFlight.current = (async () => {
      do {
        again.current = false;
        await fetchOnce();
      } while (again.current);
      inFlight.current = null;
    })();
    return inFlight.current;
  }, [fetchOnce]);

  const update = useCallback((fn: (s: TripState) => TripState) => setState(fn), []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => void refresh(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        void refresh();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { state, refresh, update };
}
