"use client";

export type TabId = "wishes" | "plan" | "headsup" | "group";

export const TABS: { id: TabId; label: string }[] = [
  { id: "wishes", label: "Wishes" },
  { id: "plan", label: "Plan" },
  { id: "headsup", label: "Heads-up" },
  { id: "group", label: "Group" },
];

type Props = {
  active: TabId;
  onSelect: (tab: TabId) => void;
  badges?: Partial<Record<TabId, number>>;
};

export function TabBar({ active, onSelect, badges = {} }: Props) {
  return (
    <div role="tablist" aria-label="Trip sections" className="flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        const badge = badges[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onSelect(tab.id)}
            className={`relative flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lagoon ${
              selected ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {badge ? (
              <span className="rounded-full bg-sun px-1.5 text-xs leading-5 text-[#13203a]">
                {badge}
                <span className="sr-only"> warnings</span>
              </span>
            ) : null}
            <span
              aria-hidden
              className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${selected ? "bg-lagoon" : "bg-transparent"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
