import { generateJoinCode, generateToken } from "@/lib/codes";
import { MEMBER_COLORS } from "@/lib/colors";
import { parseDateOnly } from "@/lib/dates";
import { type Db, isUniqueViolation } from "@/lib/db";
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
