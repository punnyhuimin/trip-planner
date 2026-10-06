// Human wording for enum values, shared by the UI.
import type { Priority, ReactionValue, TimeOfDay } from "@/lib/types";

export const PRIORITY_LABEL: Record<Priority, string> = {
  MUST: "Must-do",
  LOVE: "Would love",
  NICE: "Nice to have",
};

export const TIME_LABEL: Record<TimeOfDay, string> = {
  EARLY_MORNING: "Early morning",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  NIGHT: "Night",
  ANY: "Any time",
};

export const COST_LABEL = ["Free", "$", "$$", "$$$"] as const;
export const ENERGY_LABEL = ["Chill", "Easy", "Active", "Intense"] as const;

export const REACTION_LABEL: Record<ReactionValue, string> = {
  IN: "I'm in",
  MAYBE: "Maybe",
  SKIP: "Skip",
};

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}
