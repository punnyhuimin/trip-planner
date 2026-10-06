import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JoinTripForm } from "@/components/JoinTripForm";
import { TripApp } from "@/components/TripApp";
import { getCurrentMember, normalizeCode } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildTripState } from "@/lib/state";

async function loadTrip(code: string) {
  return getDb().trip.findUnique({
    where: { code: normalizeCode(code) },
    select: { id: true, code: true, name: true },
  });
}

export async function generateMetadata(props: PageProps<"/t/[code]">): Promise<Metadata> {
  const trip = await loadTrip((await props.params).code);
  return { title: trip ? `${trip.name} · TripMaker` : "Trip not found · TripMaker" };
}

export default async function TripPage(props: PageProps<"/t/[code]">) {
  const { code } = await props.params;
  const trip = await loadTrip(code);
  if (!trip) notFound();
  if (code !== trip.code) redirect(`/t/${trip.code}`);

  const current = await getCurrentMember(trip.code);
  if (!current) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-10 pb-16">
        <p className="mb-6 font-display text-xl font-bold tracking-tight">TripMaker</p>
        <JoinTripForm code={trip.code} tripName={trip.name} />
      </main>
    );
  }

  return <TripApp initialState={await buildTripState(trip.id, current.member.id)} />;
}
