import { generateJoinCode, generateToken } from "@/lib/codes";
import { MEMBER_COLORS, nextColor } from "@/lib/colors";
import { parseDateOnly } from "@/lib/dates";
import { type Db, isUniqueViolation } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { MAX_MEMBERS } from "@/lib/limits";
import type { CreateTripInput } from "@/lib/schemas";

const CODE_ATTEMPTS = 5;

/**
 * Creates a trip and its host. D1 has no transactions, so if the host can't be
 * created the trip is deleted again rather than left without a host.
 */
export async function createTripWithHost(
  db: Db,
  input: CreateTripInput,
): Promise<{ code: string; token: string }> {
  const data = {
    name: input.name,
    destination: input.destination ?? null,
    startDate: parseDateOnly(input.startDate)!,
    endDate: parseDateOnly(input.endDate)!,
  };

  let trip: { id: string; code: string } | undefined;
  for (let attempt = 1; !trip; attempt++) {
    try {
      trip = await db.trip.create({
        data: { ...data, code: generateJoinCode() },
        select: { id: true, code: true },
      });
    } catch (err) {
      if (attempt >= CODE_ATTEMPTS || !isUniqueViolation(err, "code")) throw err;
    }
  }

  const token = generateToken();
  try {
    await db.member.create({
      data: { tripId: trip.id, name: input.yourName, color: MEMBER_COLORS[0], isHost: true, token },
    });
  } catch (err) {
    await db.trip.delete({ where: { id: trip.id } }).catch(() => {});
    throw err;
  }
  return { code: trip.code, token };
}

/** Adds a new member with the next free color. Names are unique per trip, ignoring case. */
export async function addMember(
  db: Db,
  tripId: string,
  name: string,
): Promise<{ id: string; token: string }> {
  const existing = await db.member.findMany({
    where: { tripId },
    select: { name: true, color: true },
  });
  if (existing.length >= MAX_MEMBERS) {
    throw new HttpError(409, `This trip is full (${MAX_MEMBERS} people max)`);
  }
  const taken = () => new HttpError(409, "That name is taken in this trip");
  if (existing.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw taken();

  const token = generateToken();
  try {
    const member = await db.member.create({
      data: { tripId, name, token, color: nextColor(existing.map((m) => m.color)) },
      select: { id: true },
    });
    return { id: member.id, token };
  } catch (err) {
    // Someone with the same name joined between the check and the insert.
    if (isUniqueViolation(err)) throw taken();
    throw err;
  }
}

/**
 * Removes a member of this trip; ids from other trips are a 404 and the host
 * can't be removed. Their wishes, reactions and plan slots go with them
 * (onDelete: Cascade), and their cookie stops working because the row is gone.
 */
export async function removeMember(db: Db, tripId: string, memberId: string): Promise<void> {
  const member = await db.member.findFirst({
    where: { id: memberId, tripId },
    select: { id: true, isHost: true },
  });
  if (!member) throw new HttpError(404, "Member not found");
  if (member.isHost) throw new HttpError(400, "The host can't be removed");
  await db.member.delete({ where: { id: member.id } });
}
