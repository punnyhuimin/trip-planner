import type { ReactNode } from "react";
import { TIME_LABEL } from "@/lib/labels";
import type { TimeBlock as Block } from "@/lib/types";

type Props = { block: Block; children?: ReactNode; empty: boolean };

/** One of the day's five blocks, labelled down the left edge. */
export function TimeBlock({ block, children, empty }: Props) {
  return (
    <section
      aria-label={TIME_LABEL[block]}
      className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-line py-3 first:border-t-0 sm:grid-cols-[8rem_1fr]"
    >
      <h3 className="pt-1 text-sm font-semibold text-muted">{TIME_LABEL[block]}</h3>
      <div className="flex min-w-0 flex-col gap-2">
        {empty ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
            Rest / free time
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
