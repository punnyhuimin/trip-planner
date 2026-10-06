import type { ReactNode } from "react";
import { MemberDot } from "@/components/MemberDot";
import type { MemberDTO, WishDTO } from "@/lib/types";

/** A constraint ("no early mornings") with its author. */
export function ConstraintChip({
  wish,
  author,
  actions,
}: {
  wish: WishDTO;
  author?: MemberDTO;
  actions: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 text-sm">
      {author && <MemberDot member={author} size="sm" />}
      <span>
        <span className="sr-only">{author?.name}: </span>
        {wish.title}
      </span>
      {actions}
    </li>
  );
}
