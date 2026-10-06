import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JoinTripForm } from "@/components/JoinTripForm";
import { TripApp } from "@/components/TripApp";
import { getCurrentMember, normalizeCode } from "@/lib/auth";
import { isJoinCodeFormat } from "@/lib/codes-shared";
import { getDb } from "@/lib/db";
import { buildTripState } from "@/lib/state";

// Only members learn anything about the trip here. Anyone else gets the same
// join page whether or not the code exists, so this page can't be used to test
// codes; POST /join answers that, behind a strict per-IP rate limit.

export async function generateMetadata(props: PageProps<"/t/[code]">): Promise<Metadata> {
  const current = await getCurrentMember((await props.params).code);
  if (!current) return { title: "Join a trip · TripMaker" };
  const trip = await getDb().trip.findUnique({
    where: { id: current.trip.id },
    select: { name: true },
  });
  return { title: trip ? `${trip.name} · TripMaker` : "TripMaker" };
}

export default async function TripPage(props: PageProps<"/t/[code]">) {
  const { code } = await props.params;
  const canonical = normalizeCode(code);
  // Rejecting malformed codes reveals nothing about which trips exist.
  if (!isJoinCodeFormat(canonical)) notFound();
  if (code !== canonical) redirect(`/t/${canonical}`);

  const current = await getCurrentMember(canonical);
  if (!current) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-10 pb-16">
        <p className="mb-6 font-display text-xl font-bold tracking-tight">TripMaker</p>
        <JoinTripForm code={canonical} />
      </main>
    );
  }

  return <TripApp initialState={await buildTripState(current.trip.id, current.member.id)} />;
}
