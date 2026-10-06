// Wipes and recreates the DEMO42 trip in the local D1 database.
//   npm run db:seed
import { PrismaD1 } from "@prisma/adapter-d1";
import { getPlatformProxy } from "wrangler";
import { MEMBER_COLORS } from "../lib/colors";
import { PrismaClient } from "../lib/generated/prisma-node/client";
import { SEED_MEMBERS, SEED_TRIP, SEED_WISHES, seedWishCreatedAt, seedWishId } from "./seed-data";

async function main() {
  const proxy = await getPlatformProxy<CloudflareEnv>();
  const db = new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });

  try {
    // Cascades remove members, wishes, reactions and slots.
    await db.trip.deleteMany({ where: { code: SEED_TRIP.code } });

    await db.trip.create({ data: { ...SEED_TRIP, version: 1 } });

    await db.member.createMany({
      data: SEED_MEMBERS.map((m, i) => ({ ...m, tripId: SEED_TRIP.id, color: MEMBER_COLORS[i] })),
    });

    await db.wish.createMany({
      data: SEED_WISHES.map((w, i) => ({
        id: seedWishId(i),
        tripId: SEED_TRIP.id,
        authorId: SEED_MEMBERS[w.author].id,
        title: w.title,
        notes: w.notes ?? null,
        kind: w.kind,
        priority: w.priority,
        timeOfDay: w.timeOfDay,
        durationHrs: w.durationHrs,
        costLevel: w.costLevel,
        energy: w.energy,
        tags: w.tags.join(","),
        createdAt: seedWishCreatedAt(i),
      })),
    });

    const reactions = SEED_WISHES.flatMap((w, i) =>
      (["in", "maybe", "skip"] as const).flatMap((key) =>
        (w[key] ?? []).map((m) => ({
          wishId: seedWishId(i),
          memberId: SEED_MEMBERS[m].id,
          value: key.toUpperCase() as "IN" | "MAYBE" | "SKIP",
        })),
      ),
    );
    await db.reaction.createMany({ data: reactions });

    console.log(
      `Seeded trip ${SEED_TRIP.code}: ${SEED_MEMBERS.length} members, ` +
        `${SEED_WISHES.length} wishes, ${reactions.length} reactions.`,
    );
  } finally {
    await db.$disconnect();
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
