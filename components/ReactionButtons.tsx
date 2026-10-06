"use client";

import { REACTION_LABEL } from "@/lib/labels";
import { REACTION_VALUES, type ReactionValue } from "@/lib/types";

const ICON: Record<ReactionValue, string> = { IN: "✓", MAYBE: "?", SKIP: "✕" };

const SELECTED: Record<ReactionValue, string> = {
  IN: "border-lagoon bg-lagoon text-on-lagoon",
  MAYBE: "border-sun bg-sun text-[#13203a]",
  SKIP: "border-muted bg-muted text-card",
};

type Props = {
  value: ReactionValue | null;
  onChange: (value: ReactionValue | null) => void;
  wishTitle: string;
};

/**
 * IN / MAYBE / SKIP. The selected state shows as text, icon and color together.
 * Tapping the selected button again clears your reaction.
 */
export function ReactionButtons({ value, onChange, wishTitle }: Props) {
  return (
    <div
      role="group"
      aria-label={`Your reaction to ${wishTitle}`}
      className="grid grid-cols-3 gap-1.5"
    >
      {REACTION_VALUES.map((v) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : v)}
            className={`flex min-h-10 items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon ${
              selected
                ? SELECTED[v]
                : "border-line bg-card text-muted hover:border-lagoon hover:text-ink"
            }`}
          >
            <span aria-hidden>{ICON[v]}</span>
            {REACTION_LABEL[v]}
          </button>
        );
      })}
    </div>
  );
}
