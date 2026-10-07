import { MemberDot } from "@/components/MemberDot";
import { MAX_MEMBERS } from "@/lib/limits";
import type { MemberDTO } from "@/lib/types";

export function MemberList({
  members,
  meId,
  onRemove,
}: {
  members: MemberDTO[];
  meId: string;
  /** Set for the host, who can remove anyone but themselves. */
  onRemove?: (member: MemberDTO) => void;
}) {
  return (
    <div className="card p-5">
      <h2 className="flex items-baseline justify-between font-display text-lg font-semibold">
        Who&rsquo;s going
        <span className="font-sans text-sm font-normal text-muted">
          {members.length} of {MAX_MEMBERS}
        </span>
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <MemberDot member={m} />
            <span className="min-w-0 truncate font-medium">
              {m.name}
              {m.id === meId && <span className="font-normal text-muted"> (you)</span>}
            </span>
            {m.isHost && (
              <span className="ml-auto rounded-full bg-sun-soft px-2 py-0.5 text-xs font-semibold text-ink">
                Host
              </span>
            )}
            {onRemove && m.id !== meId && (
              <button
                type="button"
                onClick={() => onRemove(m)}
                aria-label={`Remove ${m.name}`}
                className="ml-auto rounded-full px-2 py-0.5 text-xs font-semibold text-muted hover:text-ink"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {members.length === 1 && (
        <p className="mt-2 text-sm text-muted">
          Just you so far. Share the code to bring people in.
        </p>
      )}
    </div>
  );
}
