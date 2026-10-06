"use client";

import Link from "next/link";
import type { SyncState } from "@/lib/sync";

type Props = { code: string; sync: SyncState };

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Tells the user when live updates stop getting through. Sits in normal flow
 * (inside the sticky header), so it pushes content down rather than covering it.
 * The live region is always rendered so screen readers announce changes. It is
 * a bare aria-live region, not role="status", so it doesn't compete with the
 * toast's status role.
 */
export function SyncBanner({ code, sync }: Props) {
  const { status, lastSyncedAt } = sync;
  return (
    <div aria-live="polite" className="mx-auto w-full max-w-4xl">
      {status === "offline" && (
        <p className="mx-4 mb-2 rounded-lg bg-sun-soft px-3 py-2 text-sm text-ink">
          Can&apos;t reach the server — showing data from {formatTime(lastSyncedAt)}.
        </p>
      )}
      {status === "unauthorized" && (
        <p className="mx-4 mb-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-ink">
          You&apos;re no longer signed in to this trip.{" "}
          {/* A full page load, so the server renders the join form for this code. */}
          <a href={`/t/${code}`} className="font-semibold text-danger underline">
            Rejoin {code}
          </a>
        </p>
      )}
      {status === "not-found" && (
        <p className="mx-4 mb-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-ink">
          This trip no longer exists.{" "}
          <Link href="/" className="font-semibold text-danger underline">
            Back to start
          </Link>
        </p>
      )}
    </div>
  );
}
