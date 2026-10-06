import { MemberDot } from "@/components/MemberDot";
import type { MemberDTO, TripState, WarningType } from "@/lib/types";

const GROUPS: { type: WarningType; title: string }[] = [
  { type: "UNSCHEDULED_MUST", title: "Must-dos left out" },
  { type: "DOUBLE_BOOKING", title: "Double-booked" },
  { type: "TIME", title: "Early starts" },
  { type: "BUDGET", title: "Budget" },
  { type: "ENERGY", title: "Energy" },
];

type Props = { state: TripState; onShowWish: (wishId: string) => void };

/** The planner's warnings, grouped by type, each linking to the wishes involved. */
export function HeadsUp({ state, onShowWish }: Props) {
  const { warnings, members, wishes, slots } = state;
  const memberById = new Map(members.map((m) => [m.id, m]));
  const wishById = new Map(wishes.map((w) => [w.id, w]));

  if (warnings.length === 0) {
    return (
      <section className="card px-5 py-6">
        <h2 className="font-display text-lg font-semibold">Heads-up</h2>
        <p className="mt-1 text-muted">
          {slots.length
            ? "No conflicts spotted in the current plan."
            : "Once there’s a plan, clashes like early starts or budget squeezes show up here."}
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(({ type, title }) => {
        const items = warnings.filter((w) => w.type === type);
        if (items.length === 0) return null;
        return (
          <section key={type} aria-labelledby={`warn-${type}`} className="card p-5">
            <h2 id={`warn-${type}`} className="font-display text-lg font-semibold">
              {title}{" "}
              <span className="font-sans text-sm font-normal text-muted">{items.length}</span>
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((w, i) => (
                <li key={`${type}-${i}`} className="flex gap-3">
                  <span className="flex shrink-0 -space-x-1.5 pt-0.5">
                    {w.memberIds
                      .map((id) => memberById.get(id))
                      .filter((m): m is MemberDTO => !!m)
                      .map((m) => (
                        <MemberDot key={m.id} member={m} />
                      ))}
                  </span>
                  <div className="min-w-0">
                    <p>{w.message}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
                      {w.wishIds.map((id) => {
                        const wish = wishById.get(id);
                        if (!wish || wish.kind === "CONSTRAINT") return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onShowWish(id)}
                            className="font-medium text-lagoon underline underline-offset-2 hover:no-underline"
                          >
                            See {wish.title}
                          </button>
                        );
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
