import type { Db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { WishKind } from "@/lib/types";

export type WishRef = { id: string; authorId: string; kind: WishKind };

/** The wish, but only if it belongs to this trip; ids from other trips are a 404. */
export async function requireWish(db: Db, tripId: string, wishId: string): Promise<WishRef> {
  const wish = await db.wish.findFirst({
    where: { id: wishId, tripId },
    select: { id: true, authorId: true, kind: true },
  });
  if (!wish) throw new HttpError(404, "Wish not found");
  return wish;
}
