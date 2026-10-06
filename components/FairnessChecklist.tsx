import { MemberDot } from "@/components/MemberDot";
import type { TripState } from "@/lib/types";

/** "Nobody's wish left behind": does everyone have a must-do in the plan? */
export function FairnessChecklist({ state }: { state: TripState }) {
  const scheduled = new Set(state.slots.map((s) => s.wishId));
  const rows = state.members.map((m) => {
    const musts = state.wishes.filter(
      (w) => w.kind === "ACTIVITY" && w.priority === "MUST" && w.authorId === m.id,
    );
    const ok = musts.some((w) => scheduled.has(w.id));
    const why = ok
      ? musts
          .filter((w) => scheduled.has(w.id))
          .map((w) => w.title)
          .join(", ")
      : musts.length === 0
        ? "Hasn’t added a must-do"
        : "Not in the plan yet";
    return { member: m, ok, why };
  });
  const done = rows.filter((r) => r.ok).length;

  return (
    <section aria-labelledby="fairness-heading" className="card p-5">
      <h2 id="fairness-heading" className="font-display text-lg font-semibold">
        Nobody&rsquo;s wish left behind
      </h2>
      <p className="text-sm text-muted">
        {done} of {rows.length} have a must-do in the plan.
      </p>
      <ul className="mt-3 divide-y divide-line">
        {rows.map(({ member, ok, why }) => (
          <li key={member.id} className="flex items-center gap-3 py-2.5">
            <MemberDot member={member} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted">{why}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                ok ? "bg-lagoon-soft text-ink" : "bg-sun-soft text-ink"
              }`}
            >
              <span aria-hidden>{ok ? "✅ " : "⚠️ "}</span>
              {ok ? "MUST scheduled" : "No MUST yet"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
