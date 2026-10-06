"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/TextField";
import { api } from "@/lib/api";
import { DESTINATION_MAX, NAME_MAX, TRIP_NAME_MAX } from "@/lib/limits";

type Errors = Record<string, string[] | undefined>;

export function StartTripForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    yourName: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    const res = await api<{ code: string }>("/api/trips", "POST", form);
    if (res.ok) {
      router.push(`/t/${res.data.code}`);
      return;
    }
    setErrors(res.details);
    setFormError(Object.keys(res.details).length ? null : res.error);
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate className="card flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Start a trip</h2>
        <p className="mt-1 text-sm text-muted">You&rsquo;ll get a code to share with the group.</p>
      </div>
      <TextField
        label="Trip name"
        name="name"
        placeholder="Lisbon long weekend"
        value={form.name}
        onChange={set("name")}
        error={errors.name?.[0]}
        maxLength={TRIP_NAME_MAX}
        required
      />
      <TextField
        label="Destination (optional)"
        name="destination"
        placeholder="Lisbon, Portugal"
        value={form.destination}
        onChange={set("destination")}
        error={errors.destination?.[0]}
        maxLength={DESTINATION_MAX}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="First day"
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={set("startDate")}
          error={errors.startDate?.[0]}
          required
        />
        <TextField
          label="Last day"
          name="endDate"
          type="date"
          min={form.startDate || undefined}
          value={form.endDate}
          onChange={set("endDate")}
          error={errors.endDate?.[0]}
          required
        />
      </div>
      <TextField
        label="Your name"
        name="yourName"
        autoComplete="given-name"
        placeholder="How the group knows you"
        value={form.yourName}
        onChange={set("yourName")}
        error={errors.yourName?.[0]}
        maxLength={NAME_MAX}
        required
      />
      {formError && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {formError}
        </p>
      )}
      <button type="submit" className="btn btn-primary mt-1" disabled={pending}>
        {pending ? "Creating trip…" : "Create trip"}
      </button>
    </form>
  );
}
