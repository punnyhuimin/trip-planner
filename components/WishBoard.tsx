"use client";

import { type ReactNode, useMemo, useState } from "react";
import { ConstraintChip } from "@/components/ConstraintChip";
import { MemberDot } from "@/components/MemberDot";
import { WishCard } from "@/components/WishCard";
import { type WishFilter, WishFilters } from "@/components/WishFilters";
import type { ReactionValue, TripState, WishDTO } from "@/lib/types";

type Props = {
  state: TripState;
  onReact: (wishId: string, value: ReactionValue | null) => void;
  /** Rendered on your own cards (edit / delete). */
  ownerActions?: (wish: WishDTO) => ReactNode;
  /** Shown when there are no wishes at all. */
  emptyAction?: ReactNode;
};

export function WishBoard({ state, onReact, ownerActions, emptyAction }: Props) {
  const { members, wishes, meId } = state;
  // Filter state is local and never reset by polling.
  const [filter, setFilter] = useState<WishFilter>({ priorities: [], tag: "" });

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const activities = wishes.filter((w) => w.kind === "ACTIVITY");
  const constraints = wishes.filter((w) => w.kind === "CONSTRAINT");
  const tags = useMemo(() => [...new Set(activities.flatMap((w) => w.tags))].sort(), [activities]);

  const visible = activities.filter(
    (w) =>
      (filter.priorities.length === 0 || filter.priorities.includes(w.priority)) &&
      (!filter.tag || w.tags.includes(filter.tag)),
  );
  // Your own wishes first, then everyone else in member order.
  const groups = [...members]
    .sort((a, b) => Number(b.id === meId) - Number(a.id === meId))
    .map((m) => ({ author: m, wishes: visible.filter((w) => w.authorId === m.id) }))
    .filter((g) => g.wishes.length > 0);

  if (wishes.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="font-display text-xl font-semibold">No wishes yet</p>
        <p className="max-w-sm text-muted">
          Add the things you&rsquo;d love to do on this trip, plus anything the group should know,
          like &ldquo;no early mornings&rdquo;.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {constraints.length > 0 && (
        <section aria-labelledby="constraints-heading" className="rounded-2xl bg-sun-soft p-4">
          <h2 id="constraints-heading" className="text-sm font-semibold">
            Heads-up from the group
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {constraints.map((c) => (
              <ConstraintChip
                key={c.id}
                wish={c}
                author={membersById.get(c.authorId)}
                actions={c.authorId === meId ? ownerActions?.(c) : null}
              />
            ))}
          </ul>
        </section>
      )}

      {activities.length > 0 && <WishFilters filter={filter} onChange={setFilter} tags={tags} />}

      {groups.length === 0 && activities.length > 0 && (
        <p className="text-muted">No wishes match these filters.</p>
      )}

      {groups.map(({ author, wishes: authored }) => (
        <section key={author.id} aria-labelledby={`author-${author.id}`}>
          <h2
            id={`author-${author.id}`}
            className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"
          >
            <MemberDot member={author} />
            {author.id === meId ? "Your wishes" : `${author.name}’s wishes`}
            <span className="font-sans text-sm font-normal text-muted">{authored.length}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {authored.map((w) => (
              <WishCard
                key={w.id}
                wish={w}
                author={author}
                membersById={membersById}
                meId={meId}
                onReact={onReact}
                ownerActions={ownerActions?.(w)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
