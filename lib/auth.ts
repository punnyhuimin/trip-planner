// Member identity. There are no accounts: each trip has its own cookie,
// `tm_<CODE>`, holding the member's secret token. This is the only module that
// reads `Member.token`.
import { cookies } from "next/headers";
import { type Db, getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { TripPhase } from "@/lib/types";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

export type AuthTrip = { id: string; code: string; phase: TripPhase; version: number };
export type AuthMember = { id: string; name: string; color: string; isHost: boolean };

const tripSelect = { id: true, code: true, phase: true, version: true } as const;
const memberSelect = { id: true, name: true, color: true, isHost: true } as const;

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function cookieName(code: string): string {
  return `tm_${normalizeCode(code)}`;
}

export async function setMemberCookie(code: string, token: string): Promise<void> {
  (await cookies()).set(cookieName(code), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_S,
    secure: process.env.NODE_ENV === "production",
  });
}

async function readToken(code: string): Promise<string | undefined> {
  return (await cookies()).get(cookieName(code))?.value;
}

export async function findTrip(db: Db, code: string): Promise<AuthTrip | null> {
  return db.trip.findUnique({ where: { code: normalizeCode(code) }, select: tripSelect });
}

async function findMember(db: Db, tripId: string, token: string): Promise<AuthMember | null> {
  return db.member.findFirst({ where: { token, tripId }, select: memberSelect });
}

/** The caller's member in this trip, or null if the trip or cookie doesn't match. */
export async function getCurrentMember(
  code: string,
): Promise<{ trip: AuthTrip; member: AuthMember } | null> {
  const token = await readToken(code);
  if (!token) return null;
  const db = getDb();
  const trip = await findTrip(db, code);
  if (!trip) return null;
  const member = await findMember(db, trip.id, token);
  return member ? { trip, member } : null;
}

/** 404 if the trip doesn't exist, 401 if the caller isn't one of its members. */
export async function requireMember(code: string): Promise<{ trip: AuthTrip; member: AuthMember }> {
  const db = getDb();
  const trip = await findTrip(db, code);
  if (!trip) throw new HttpError(404, "Trip not found");
  const token = await readToken(code);
  const member = token ? await findMember(db, trip.id, token) : null;
  if (!member) throw new HttpError(401, "Join this trip first");
  return { trip, member };
}

/** Like requireMember, plus 403 if the caller isn't the host. */
export async function requireHost(code: string): Promise<{ trip: AuthTrip; member: AuthMember }> {
  const result = await requireMember(code);
  if (!result.member.isHost) throw new HttpError(403, "Only the host can do that");
  return result;
}
