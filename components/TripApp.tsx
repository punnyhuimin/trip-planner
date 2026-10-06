"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { FairnessChecklist } from "@/components/FairnessChecklist";
import { HeadsUp } from "@/components/HeadsUp";
import { MemberDot } from "@/components/MemberDot";
import { MemberList } from "@/components/MemberList";
import { PlanView } from "@/components/PlanView";
import { ShareCode } from "@/components/ShareCode";
import { TABS, TabBar, type TabId } from "@/components/TabBar";
import { Toast, type ToastMessage } from "@/components/Toast";
import { WishBoard } from "@/components/WishBoard";
import { WishForm } from "@/components/WishForm";
import { api } from "@/lib/api";
import { formatDayLabel } from "@/lib/dates";
import { useTripState } from "@/lib/hooks/useTripState";
import { withReaction } from "@/lib/optimistic";
import type { ReactionValue, TripState, WishDTO } from "@/lib/types";

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
  // The open form is keyed by `formKey`, never by state version, so polls can't reset it.
  const [form, setForm] = useState<{ key: number; wish?: WishDTO } | null>(null);
  const openForm = (wish?: WishDTO) => setForm({ key: Date.now(), wish });
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

  async function deleteWish(wish: WishDTO) {
    if (!window.confirm(`Delete "${wish.title}"? Reactions to it will be lost too.`)) return;
    const res = await api(`/api/trips/${trip.code}/wishes/${wish.id}`, "DELETE");
    if (!res.ok) {
      notify(`Couldn't delete the wish. ${res.error}`);
      return;
    }
    notify("Wish deleted", "info");
    void refresh();
  }

  async function regenerate() {
    const res = await api<{ unscheduled: { id: string; title: string }[] }>(
      `/api/trips/${trip.code}/plan/generate`,
      "POST",
    );
    if (!res.ok) {
      notify(`Couldn't generate the plan. ${res.error}`);
      return;
    }
    const left = res.data.unscheduled.length;
    notify(
      left ? `Plan updated. ${left} ${left === 1 ? "wish" : "wishes"} didn't fit.` : "Plan updated",
      "info",
    );
    await refresh();
  }

  const selectTab = (next: TabId) => {
    // Native history keeps the back button working without a server round trip.
    window.history.pushState(null, "", `?tab=${next}`);
  };

  function showWish(wishId: string) {
    selectTab("wishes");
    // Wait for the wishes panel to be shown before scrolling to the card.
    requestAnimationFrame(() => {
      const el = document.getElementById(`wish-${wishId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.closest("article")?.focus({ preventScroll: true });
    });
  }

  const planning = trip.phase === "PLANNING";
  const addButton = (
    <button type="button" className="btn btn-primary" onClick={() => openForm()}>
      <span aria-hidden>+</span> Add a wish
    </button>
  );
  const ownerActions = (wish: WishDTO) =>
    planning ? (
      <span className="flex gap-1">
        <button
          type="button"
          className="btn btn-ghost min-h-8 px-2.5 py-1 text-xs"
          onClick={() => openForm(wish)}
          aria-label={`Edit ${wish.title}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-danger min-h-8 px-2.5 py-1 text-xs"
          onClick={() => deleteWish(wish)}
          aria-label={`Delete ${wish.title}`}
        >
          Delete
        </button>
      </span>
    ) : null;

  const panels: Record<TabId, ReactNode> = {
    wishes: (
      <WishBoard
        state={state}
        onReact={react}
        ownerActions={ownerActions}
        emptyAction={planning ? addButton : null}
      />
    ),
    plan: <PlanView state={state} isHost={!!me?.isHost} onRegenerate={regenerate} />,
    headsup: (
      <div className="grid items-start gap-5 sm:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <HeadsUp state={state} onShowWish={showWish} />
        <FairnessChecklist state={state} />
      </div>
    ),
    group: (
      <div className="grid items-start gap-5 sm:grid-cols-2 [&>*]:min-w-0">
        <MemberList members={members} meId={meId} />
        <ShareCode code={trip.code} />
      </div>
    ),
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
          <TabBar active={tab} onSelect={selectTab} badges={{ headsup: state.warnings.length }} />
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
      {tab === "wishes" && planning && state.wishes.length > 0 && (
        <div className="pointer-events-none sticky bottom-0 z-10 flex justify-end px-4 pb-4 sm:mx-auto sm:w-full sm:max-w-4xl">
          <div className="pointer-events-auto shadow-lg">{addButton}</div>
        </div>
      )}
      {form && (
        <WishForm
          key={form.key}
          code={trip.code}
          wish={form.wish}
          onClose={() => setForm(null)}
          onSaved={(message) => {
            setForm(null);
            notify(message, "info");
            void refresh();
          }}
        />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
