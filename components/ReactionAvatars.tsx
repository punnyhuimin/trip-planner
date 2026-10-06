import { MemberDot } from "@/components/MemberDot";
import type { MemberDTO } from "@/lib/types";

type Props = { going: MemberDTO[]; maybe: MemberDTO[] };

function stack(label: string, members: MemberDTO[]) {
  if (members.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-muted">
        {label} {members.length}
      </span>
      <ul
        className="flex -space-x-1.5"
        aria-label={`${label}: ${members.map((m) => m.name).join(", ")}`}
      >
        {members.map((m) => (
          <li key={m.id}>
            <MemberDot member={m} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Who's in (including the author) and who's a maybe. */
export function ReactionAvatars({ going, maybe }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {stack("In", going)}
      {stack("Maybe", maybe)}
    </div>
  );
}
