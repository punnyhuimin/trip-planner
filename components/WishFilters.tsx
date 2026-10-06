"use client";

import { useId } from "react";
import { PRIORITY_LABEL } from "@/lib/labels";
import { PRIORITIES, type Priority } from "@/lib/types";

export type WishFilter = { priorities: Priority[]; tag: string };

type Props = {
  filter: WishFilter;
  onChange: (filter: WishFilter) => void;
  tags: string[];
};

export function WishFilters({ filter, onChange, tags }: Props) {
  const tagId = useId();
  const toggle = (p: Priority) =>
    onChange({
      ...filter,
      priorities: filter.priorities.includes(p)
        ? filter.priorities.filter((x) => x !== p)
        : [...filter.priorities, p],
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Filter by priority" className="flex flex-wrap gap-1.5">
        {PRIORITIES.map((p) => {
          const on = filter.priorities.includes(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p)}
              className={`min-h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon ${
                on
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-muted hover:text-ink"
              }`}
            >
              {on && <span aria-hidden>✓ </span>}
              {PRIORITY_LABEL[p]}
            </button>
          );
        })}
      </div>
      {tags.length > 0 && (
        <>
          <label htmlFor={tagId} className="sr-only">
            Filter by tag
          </label>
          <select
            id={tagId}
            value={filter.tag}
            onChange={(e) => onChange({ ...filter, tag: e.target.value })}
            className="input min-h-9 w-auto py-1 text-sm"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
