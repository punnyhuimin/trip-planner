// Shared types for the API, the client and the planner.
// Deliberately independent of Prisma: the planner and client components must
// never import the generated client. The string unions match the Prisma enums.

export type TripPhase = "PLANNING" | "LOCKED" | "ON_TRIP" | "JOURNAL";
export type WishKind = "ACTIVITY" | "CONSTRAINT";
export type Priority = "MUST" | "LOVE" | "NICE";
export type TimeOfDay = "EARLY_MORNING" | "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "ANY";
export type ReactionValue = "IN" | "MAYBE" | "SKIP";
export type SlotTrack = "GROUP" | "SPLINTER";

/** The 5 schedulable blocks of a day, in chronological order. */
export const TIME_BLOCKS = ["EARLY_MORNING", "MORNING", "AFTERNOON", "EVENING", "NIGHT"] as const;
export type TimeBlock = (typeof TIME_BLOCKS)[number];

export const TIME_OF_DAY_VALUES = [...TIME_BLOCKS, "ANY"] as const;
export const PRIORITIES = ["MUST", "LOVE", "NICE"] as const;
export const WISH_KINDS = ["ACTIVITY", "CONSTRAINT"] as const;
export const REACTION_VALUES = ["IN", "MAYBE", "SKIP"] as const;
export const TRIP_PHASES = ["PLANNING", "LOCKED", "ON_TRIP", "JOURNAL"] as const;

export type TripDTO = {
  code: string;
  name: string;
  destination: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  phase: TripPhase;
  days: number;
};

export type MemberDTO = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
};

export type ReactionDTO = {
  memberId: string;
  value: ReactionValue;
};

export type WishDTO = {
  id: string;
  authorId: string;
  title: string;
  notes: string | null;
  kind: WishKind;
  priority: Priority;
  timeOfDay: TimeOfDay;
  durationHrs: number;
  costLevel: number;
  energy: number;
  tags: string[];
  done: boolean;
  memory: string | null;
  photoUrl: string | null;
  createdAt: string; // ISO timestamp
  reactions: ReactionDTO[];
};

export type SlotDTO = {
  id: string;
  wishId: string;
  dayIndex: number;
  timeOfDay: TimeBlock;
  track: SlotTrack;
  pinned: boolean;
};

export type WarningType = "TIME" | "BUDGET" | "ENERGY" | "DOUBLE_BOOKING" | "UNSCHEDULED_MUST";

export type Warning = {
  type: WarningType;
  memberIds: string[];
  wishIds: string[];
  message: string;
};

export type TripState = {
  trip: TripDTO;
  meId: string;
  members: MemberDTO[];
  wishes: WishDTO[];
  slots: SlotDTO[];
  warnings: Warning[];
  version: number; // Trip.version; the client sends it back as ?since=
};

export type StateResponse = TripState | { unchanged: true };

/** Every error response from the API has this shape. */
export type ApiError = {
  error: string;
  details?: Record<string, string[] | undefined>;
};

// ---- Planner (lib/planner) ----------------------------------------------
// Planner-specific shapes, so the planner never touches Prisma.

export type PlannerMember = { id: string; name: string };

export type PlannerWish = {
  id: string;
  authorId: string;
  kind: WishKind;
  priority: Priority;
  timeOfDay: TimeOfDay;
  durationHrs: number;
  costLevel: number;
  energy: number;
  title: string;
  notes: string | null;
  createdAt: Date;
  reactions: { memberId: string; value: ReactionValue }[];
};

export type PlanSlotDraft = {
  wishId: string;
  dayIndex: number;
  timeOfDay: TimeBlock;
  track: SlotTrack;
  pinned: boolean;
};

export type PlannerInput = {
  days: number;
  members: PlannerMember[];
  wishes: PlannerWish[]; // with reactions; constraints included
  pinnedSlots: PlanSlotDraft[];
};

export type PlanResult = {
  slots: PlanSlotDraft[];
  unscheduled: PlannerWish[];
  warnings: Warning[];
};
