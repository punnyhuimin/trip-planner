import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/lib/generated/prisma/client";

export type Db = PrismaClient;

/**
 * Prisma client for the current request. On Workers the D1 binding belongs to
 * the request, so there's no global singleton; `cache()` reuses one client for
 * the duration of a server render.
 */
export const getDb = cache((): Db => {
  const { env } = getCloudflareContext();
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
});

/** Every write to a trip calls this last, so pollers see the change. */
export async function bumpVersion(db: Db, tripId: string): Promise<number> {
  const trip = await db.trip.update({
    where: { id: tripId },
    data: { version: { increment: 1 } },
    select: { version: true },
  });
  return trip.version;
}

/**
 * True for a unique-constraint violation (Prisma P2002), optionally on a given
 * field. The D1 adapter reports the field under `meta.driverAdapterError`
 * rather than the classic `meta.target`, so check both.
 */
export function isUniqueViolation(err: unknown, field?: string): boolean {
  if (typeof err !== "object" || err === null || !("code" in err) || err.code !== "P2002") {
    return false;
  }
  if (!field) return true;
  const meta = (err as { meta?: Record<string, unknown> }).meta ?? {};
  const target = meta.target;
  const adapterFields = (
    meta.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined
  )?.cause?.constraint?.fields;
  const fields = [target, adapterFields].flat().filter((f): f is string => typeof f === "string");
  return fields.length === 0 || fields.includes(field);
}
