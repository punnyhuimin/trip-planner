"use client";

import type { ReactNode } from "react";
import { ReactionAvatars } from "@/components/ReactionAvatars";
import { ReactionButtons } from "@/components/ReactionButtons";
import { goingMembers } from "@/lib/going";
import { COST_LABEL, ENERGY_LABEL, PRIORITY_LABEL, TIME_LABEL, formatDuration } from "@/lib/labels";
import type { MemberDTO, Priority, ReactionValue, WishDTO } from "@/lib/types";

const PRIORITY_STYLE: Record<Priority, string> = {
  MUST: "bg-sun text-[#13203a]",
  LOVE: "bg-lagoon-soft text-ink",
  NICE: "border border-line text-muted",
};

type Props = {
  wish: WishDTO;
  author: MemberDTO;
  membersById: Map<string, MemberDTO>;
  meId: string;
  onReact: (wishId: string, value: ReactionValue | null) => void;
  /** Extra actions for your own wishes (edit / delete). */
  ownerActions?: ReactNode;
};

export function WishCard({ wish, author, membersById, meId, onReact, ownerActions }: Props) {
  const mine = wish.authorId === meId;
  const myReaction = wish.reactions.find((r) => r.memberId === meId)?.value ?? null;
  const pick = (value: ReactionValue) =>
    wish.reactions
      .filter((r) => r.value === value)
      .map((r) => membersById.get(r.memberId))
      .filter((m): m is MemberDTO => !!m);
  const going = goingMembers(wish, [...membersById.values()]);

  return (
    <article
      className="card flex flex-col gap-3 overflow-hidden border-t-4 p-4"
      style={{ borderTopColor: author.color }}
      aria-labelledby={`wish-${wish.id}`}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={`wish-${wish.id}`} className="font-semibold leading-snug">
          {wish.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[wish.priority]}`}
        >
          {PRIORITY_LABEL[wish.priority]}
        </span>
      </div>

      <p className="text-sm text-muted">
        {TIME_LABEL[wish.timeOfDay]} · {formatDuration(wish.durationHrs)} ·{" "}
        <span title="Cost">{COST_LABEL[wish.costLevel]}</span> ·{" "}
        <span title="Energy">{ENERGY_LABEL[wish.energy]}</span>
      </p>

      {wish.notes && <p className="line-clamp-3 text-sm">{wish.notes}</p>}

      {wish.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {wish.tags.map((t) => (
            <li key={t} className="rounded-md bg-paper px-1.5 py-0.5 text-xs text-muted">
              #{t}
            </li>
          ))}
        </ul>
      )}

      <ReactionAvatars going={going} maybe={pick("MAYBE")} />

      {mine ? (
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-sm font-medium text-muted">Your wish</span>
          {ownerActions}
        </div>
      ) : (
        <ReactionButtons
          value={myReaction}
          wishTitle={wish.title}
          onChange={(v) => onReact(wish.id, v)}
        />
      )}
    </article>
  );
}
