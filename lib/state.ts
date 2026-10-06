import { formatDateOnly, tripDays } from "@/lib/dates";
import { getDb } from "@/lib/db";
import type { SlotDTO, TimeBlock, TripState, WishDTO } from "@/lib/types";

/**
 * True when the client's `?since=` matches the trip's version, so the poll can
 * be answered with `{ unchanged: true }`. A missing or garbled `since` always
 * gets full state.
 */
export function isUnchanged(since: string | null, version: number): boolean {
  if (since === null || !/^\d+$/.test(since)) return false;
  return Number(since) === version;
}

const wishSelect = {
  id: true,
  authorId: true,
  title: true,
  notes: true,
  kind: true,
  priority: true,
  timeOfDay: true,
  durationHrs: true,
  costLevel: true,
  energy: true,
  tags: true,
  done: true,
  memory: true,
  photoUrl: true,
  createdAt: true,
  reactions: { select: { memberId: true, value: true }, orderBy: { memberId: "asc" } },
} as const;

export function splitTags(tags: string): string[] {
  return tags ? tags.split(",").filter(Boolean) : [];
}

/** Everything a member's client needs, in one object. Never includes tokens. */
export async function buildTripState(tripId: string, meId: string): Promise<TripState> {
  const db = getDb();
  const [trip, members, wishes, slots] = await Promise.all([
    db.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: {
        code: true,
        name: true,
        destination: true,
        startDate: true,
        endDate: true,
        phase: true,
        version: true,
      },
    }),
    db.member.findMany({
      where: { tripId },
      select: { id: true, name: true, color: true, isHost: true },
      orderBy: [{ isHost: "desc" }, { id: "asc" }],
    }),
    db.wish.findMany({
      where: { tripId },
      select: wishSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    db.planSlot.findMany({
      where: { tripId },
      select: {
        id: true,
        wishId: true,
        dayIndex: true,
        timeOfDay: true,
        track: true,
        pinned: true,
      },
      orderBy: [{ dayIndex: "asc" }, { id: "asc" }],
    }),
  ]);

  return {
    trip: {
      code: trip.code,
      name: trip.name,
      destination: trip.destination,
      startDate: formatDateOnly(trip.startDate),
      endDate: formatDateOnly(trip.endDate),
      phase: trip.phase,
      days: tripDays(trip.startDate, trip.endDate),
    },
    meId,
    members,
    wishes: wishes.map((w): WishDTO => ({
      ...w,
      tags: splitTags(w.tags),
      createdAt: w.createdAt.toISOString(),
    })),
    // ANY is never stored on a slot; the generator always picks a real block.
    slots: slots.map((s): SlotDTO => ({ ...s, timeOfDay: s.timeOfDay as TimeBlock })),
    warnings: [],
    version: trip.version,
  };
}
