/**
 * Member avatar colors, one per member (trips cap at 10). Chosen to stay
 * distinguishable from each other and to carry white initials legibly.
 * Never rely on color alone: always render it next to a name or initial.
 */
export const MEMBER_COLORS = [
  "#e11d48", // rose
  "#2563eb", // blue
  "#059669", // emerald
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#65a30d", // lime
  "#ea580c", // orange
  "#475569", // slate
] as const;
