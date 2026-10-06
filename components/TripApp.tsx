"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { MemberDot } from "@/components/MemberDot";
import { MemberList } from "@/components/MemberList";
import { ShareCode } from "@/components/ShareCode";
import { TABS, TabBar, type TabId } from "@/components/TabBar";
import { Toast, type ToastMessage } from "@/components/Toast";
import { WishBoard } from "@/components/WishBoard";
import { api } from "@/lib/api";
import { formatDayLabel } from "@/lib/dates";
import { useTripState } from "@/lib/hooks/useTripState";
import { withReaction } from "@/lib/optimistic";
import type { ReactionValue, TripState } from "@/lib/types";

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function TripApp({ initialState }: { initialState: TripState }) {
  const { state, refresh, update } = useTripState(initialState.trip.code, initialState);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = useCallback(
    (text: string, tone: ToastMessage["tone"] = "error") =>
      setToast({ id: Date.now(), text, tone }),
    [],
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = isTab(tabParam) ? tabParam : "wishes";

  const { trip, members, meId } = state;
  const me = members.find((m) => m.id === meId);

  async function react(wishId: string, value: ReactionValue | null) {
    const previous =
      state.wishes.find((w) => w.id === wishId)?.reactions.find((r) => r.memberId === meId)
        ?.value ?? null;
    update(withReaction(wishId, meId, value));
    const res = await api(`/api/trips/${trip.code}/wishes/${wishId}/reaction`, "PUT", { value });
    if (!res.ok) {
      update(withReaction(wishId, meId, previous));
      notify(`Couldn't save your reaction. ${res.error}`);
      return;
    }
    void refresh();
  }

  const panels: Record<TabId, ReactNode> = {
    wishes: <WishBoard state={state} onReact={react} />,
    plan: <p className="text-muted">Plan coming soon.</p>,
    headsup: <p className="text-muted">Heads-up coming soon.</p>,
    group: (
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <MemberList members={members} meId={meId} />
        <ShareCode code={trip.code} />
      </div>
    ),
  };

  const selectTab = (next: TabId) => {
    // Native history keeps the back button working without a server round trip.
    window.history.pushState(null, "", `?tab=${next}`);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight">{trip.name}</h1>
            <p className="truncate text-sm text-muted">
              {trip.destination && <>{trip.destination} · </>}
              {formatDayLabel(trip.startDate)} – {formatDayLabel(trip.endDate)} · {trip.days}{" "}
              {trip.days === 1 ? "day" : "days"}
            </p>
          </div>
          {me && (
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-card py-1 pr-3 pl-1 text-sm">
              <MemberDot member={me} />
              <span className="max-w-24 truncate font-medium">{me.name}</span>
            </div>
          )}
        </div>
        <nav className="mx-auto mt-2 w-full max-w-4xl px-2">
          <TabBar active={tab} onSelect={selectTab} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">
        {TABS.map((t) => (
          <section
            key={t.id}
            id={`panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${t.id}`}
            hidden={t.id !== tab}
          >
            {panels[t.id]}
          </section>
        ))}
      </main>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
