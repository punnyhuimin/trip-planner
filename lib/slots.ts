import type { Db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { pairFor } from "@/lib/planner/place";
import { TIME_BLOCKS, type TimeBlock } from "@/lib/types";

type SlotRow = { id: string; wishId: string; dayIndex: number; timeOfDay: string; track: string };

/**
 * Where a wish's slots go when one of them is moved to `target`. A wish that
 * spans two blocks moves as a whole, so it keeps both halves.
 */
export function moveTargets(slots: SlotRow[], target: TimeBlock): TimeBlock[] {
  return slots.length > 1 ? pairFor(target) : [target];
}

/** True if another wish already has a GROUP slot in any of the target blocks. */
export function groupClash(
  daySlots: SlotRow[],
  wishId: string,
  dayIndex: number,
  blocks: TimeBlock[],
): boolean {
  return daySlots.some(
    (s) =>
      s.wishId !== wishId &&
      s.dayIndex === dayIndex &&
      s.track === "GROUP" &&
      blocks.includes(s.timeOfDay as TimeBlock),
  );
}

/** Moves a slot (and its wish's other half, if any) and pins it. */
export async function moveSlot(
  db: Db,
  tripId: string,
  days: number,
  slotId: string,
  target: { dayIndex: number; timeOfDay: TimeBlock },
): Promise<void> {
  if (target.dayIndex >= days) throw new HttpError(400, `This trip has ${days} days`);
  const slot = await db.planSlot.findFirst({
    where: { id: slotId, tripId },
    select: { wishId: true, track: true },
  });
  if (!slot) throw new HttpError(404, "Plan slot not found");

  const siblings = await db.planSlot.findMany({
    where: { tripId, wishId: slot.wishId },
    select: { id: true, wishId: true, dayIndex: true, timeOfDay: true, track: true },
  });
  siblings.sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      TIME_BLOCKS.indexOf(a.timeOfDay as TimeBlock) - TIME_BLOCKS.indexOf(b.timeOfDay as TimeBlock),
  );
  const blocks = moveTargets(siblings, target.timeOfDay).slice(0, siblings.length);

  if (slot.track === "GROUP") {
    const dayGroups = await db.planSlot.findMany({
      where: { tripId, dayIndex: target.dayIndex, track: "GROUP" },
      select: { id: true, wishId: true, dayIndex: true, timeOfDay: true, track: true },
    });
    if (groupClash(dayGroups, slot.wishId, target.dayIndex, blocks)) {
      throw new HttpError(409, "There's already a group activity then");
    }
  }

  for (const [i, sibling] of siblings.entries()) {
    await db.planSlot.update({
      where: { id: sibling.id },
      data: { dayIndex: target.dayIndex, timeOfDay: blocks[i], pinned: true },
      select: { id: true },
    });
  }
}

/** Unpins every slot of the slot's wish, so the next regenerate may move it. */
export async function unpinSlot(db: Db, tripId: string, slotId: string): Promise<void> {
  const slot = await db.planSlot.findFirst({
    where: { id: slotId, tripId },
    select: { wishId: true },
  });
  if (!slot) throw new HttpError(404, "Plan slot not found");
  await db.planSlot.updateMany({ where: { tripId, wishId: slot.wishId }, data: { pinned: false } });
}
