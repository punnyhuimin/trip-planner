"use client";

import { dayDate, formatDayLabel } from "@/lib/dates";

type Props = {
  days: number;
  startDate: string;
  active: number;
  onSelect: (day: number) => void;
};

export function DayTabs({ days, startDate, active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Trip days"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {Array.from({ length: days }, (_, i) => {
        const selected = i === active;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(i)}
            className={`flex shrink-0 flex-col items-start rounded-xl border px-3 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon ${
              selected
                ? "border-ink bg-ink text-paper"
                : "border-line bg-card text-ink hover:border-lagoon"
            }`}
          >
            <span className="text-sm font-semibold">Day {i + 1}</span>
            <span className={`text-xs ${selected ? "opacity-80" : "text-muted"}`}>
              {formatDayLabel(dayDate(startDate, i))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
