"use client";

import { type ReactNode, useMemo, useState } from "react";
import { DayTabs } from "@/components/DayTabs";
import { SlotCard } from "@/components/SlotCard";
import { TimeBlock } from "@/components/TimeBlock";
import { goingMembers } from "@/lib/going";
import { type SlotDTO, TIME_BLOCKS, type TripState, type WishDTO } from "@/lib/types";

type Props = {
  state: TripState;
  isHost: boolean;
  onRegenerate: () => Promise<void>;
  /** Host controls rendered on each slot card (move / unpin). */
  slotActions?: (slot: SlotDTO, wish: WishDTO) => ReactNode;
};

export function PlanView({ state, isHost, onRegenerate, slotActions }: Props) {
  const { trip, slots, wishes, members } = state;
  // Local, so polling never resets the selected day.
  const [day, setDay] = useState(0);
  const [pending, setPending] = useState(false);
  const activeDay = Math.min(day, trip.days - 1);

  const wishById = useMemo(() => new Map(wishes.map((w) => [w.id, w])), [wishes]);
  const scheduled = new Set(slots.map((s) => s.wishId));
  const leftOut = wishes.filter((w) => w.kind === "ACTIVITY" && !scheduled.has(w.id));
  const canRegenerate = isHost && trip.phase === "PLANNING";

  async function regenerate() {
    setPending(true);
    await onRegenerate();
    setPending(false);
  }

  const regenerateButton = canRegenerate && (
    <button type="button" className="btn btn-primary" onClick={regenerate} disabled={pending}>
      {pending ? "Generating…" : slots.length ? "Regenerate plan" : "Generate plan"}
    </button>
  );

  if (slots.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="font-display text-xl font-semibold">No plan yet</p>
        <p className="max-w-sm text-muted">
          {isHost
            ? "Once people have added wishes and reacted, generate a day-by-day plan. You can regenerate it as often as you like."
            : "The host will generate a plan once everyone has added wishes and reacted."}
        </p>
        {regenerateButton}
      </div>
    );
  }

  const daySlots = slots.filter((s) => s.dayIndex === activeDay);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isHost
            ? "Regenerating keeps pinned cards where they are."
            : "The host can regenerate and adjust the plan."}
        </p>
        {regenerateButton}
      </div>

      <DayTabs days={trip.days} startDate={trip.startDate} active={activeDay} onSelect={setDay} />

      <div role="tabpanel" aria-label={`Day ${activeDay + 1}`} className="card px-4 py-1">
        {TIME_BLOCKS.map((block, i) => {
          const here = daySlots
            .filter((s) => s.timeOfDay === block)
            .sort((a, b) => (a.track === b.track ? 0 : a.track === "GROUP" ? -1 : 1));
          const prev = TIME_BLOCKS[i - 1];
          return (
            <TimeBlock key={block} block={block} empty={here.length === 0}>
              {here.map((slot) => {
                const wish = wishById.get(slot.wishId);
                if (!wish) return null;
                const continued =
                  !!prev && daySlots.some((s) => s.wishId === slot.wishId && s.timeOfDay === prev);
                return (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    wish={wish}
                    going={goingMembers(wish, members)}
                    continued={continued}
                    actions={slotActions?.(slot, wish)}
                  />
                );
              })}
            </TimeBlock>
          );
        })}
      </div>

      {leftOut.length > 0 && (
        <section aria-labelledby="left-out" className="text-sm">
          <h3 id="left-out" className="font-semibold">
            Didn&rsquo;t fit ({leftOut.length})
          </h3>
          <p className="text-muted">{leftOut.map((w) => w.title).join(" · ")}</p>
        </section>
      )}
    </div>
  );
}
