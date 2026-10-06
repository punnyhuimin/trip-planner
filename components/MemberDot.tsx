import type { MemberDTO } from "@/lib/types";

type Props = {
  member: Pick<MemberDTO, "name" | "color">;
  size?: "sm" | "md" | "lg";
  /** Adds the name as an accessible label; leave off when the name is shown next to it. */
  labelled?: boolean;
  className?: string;
};

const SIZES = {
  sm: "size-5 text-[10px]",
  md: "size-7 text-xs",
  lg: "size-10 text-base",
};

/** A member's color with their initial on it, so color is never the only signal. */
export function MemberDot({ member, size = "md", labelled = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-card select-none ${SIZES[size]} ${className}`}
      style={{ backgroundColor: member.color }}
      title={member.name}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? member.name : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {member.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
