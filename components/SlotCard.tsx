import type { ReactNode } from "react";
import { MemberDot } from "@/components/MemberDot";
import { COST_LABEL, ENERGY_LABEL, PRIORITY_LABEL, formatDuration } from "@/lib/labels";
import type { MemberDTO, SlotDTO, WishDTO } from "@/lib/types";

type Props = {
  slot: SlotDTO;
  wish: WishDTO;
  going: MemberDTO[];
  /** Set on the second block of a wish that spans two. */
  continued?: boolean;
  actions?: ReactNode;
};

/** A planned activity. GROUP slots are large; SPLINTER slots are compact and say who's going. */
export function SlotCard({ slot, wish, going, continued = false, actions }: Props) {
  const group = slot.track === "GROUP";
  return (
    <article
      aria-label={`${wish.title}${slot.pinned ? " (pinned)" : ""}`}
      className={
        group
          ? "rounded-xl border border-lagoon/40 bg-lagoon-soft p-4"
          : "rounded-lg border border-line bg-card px-3 py-2.5"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {group && (
            <p className="text-xs font-semibold tracking-wide text-lagoon uppercase">
              Group activity
            </p>
          )}
          <h4 className={`font-semibold leading-snug ${group ? "text-lg" : "text-sm"}`}>
            {slot.pinned && (
              <span title="Pinned: regenerating won't move it">
                <span aria-hidden>📌 </span>
                <span className="sr-only">Pinned: </span>
              </span>
            )}
            {wish.title}
            {continued && <span className="font-normal text-muted"> (continued)</span>}
          </h4>
          {group && !continued && (
            <p className="mt-0.5 text-sm text-muted">
              {PRIORITY_LABEL[wish.priority]} · {formatDuration(wish.durationHrs)} ·{" "}
              {COST_LABEL[wish.costLevel]} · {ENERGY_LABEL[wish.energy]}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-muted">
          {group ? `${going.length} going:` : "Going:"}
        </span>
        {group ? (
          <span className="flex -space-x-1.5" aria-label={going.map((m) => m.name).join(", ")}>
            {going.map((m) => (
              <MemberDot key={m.id} member={m} size="sm" />
            ))}
          </span>
        ) : (
          going.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1">
              <MemberDot member={m} size="sm" />
              {m.name}
            </span>
          ))
        )}
      </div>
    </article>
  );
}
