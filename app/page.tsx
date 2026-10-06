import { JoinTripForm } from "@/components/JoinTripForm";
import { StartTripForm } from "@/components/StartTripForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-16 sm:pt-16">
      <header className="mb-8 max-w-xl sm:mb-12">
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">TripMaker</h1>
        <p className="mt-3 text-lg text-muted">
          Everyone adds what they want to do. TripMaker turns it into a day-by-day plan, so
          nobody&rsquo;s wish gets left behind.
        </p>
      </header>
      <div className="grid items-start gap-6 sm:grid-cols-[1.25fr_1fr]">
        <StartTripForm />
        <JoinTripForm />
      </div>
    </main>
  );
}
