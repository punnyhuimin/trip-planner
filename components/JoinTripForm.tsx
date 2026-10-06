"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { TextField } from "@/components/TextField";
import { api } from "@/lib/api";
import { JOIN_CODE_LENGTH } from "@/lib/codes-shared";
import { NAME_MAX } from "@/lib/limits";

type Props = {
  /** Set when the code is already known (the trip page). The code field is then fixed. */
  code?: string;
  tripName?: string;
};

export function JoinTripForm({ code: fixedCode, tripName }: Props) {
  const router = useRouter();
  const codeId = useId();
  const [code, setCode] = useState(fixedCode ?? "");
  const [yourName, setYourName] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== JOIN_CODE_LENGTH) {
      setErrors({ code: [`Codes are ${JOIN_CODE_LENGTH} characters`] });
      return;
    }
    setPending(true);
    setFormError(null);
    setErrors({});
    const res = await api<{ code: string }>(`/api/trips/${cleanCode}/join`, "POST", { yourName });
    if (res.ok) {
      if (fixedCode) router.refresh();
      else router.push(`/t/${res.data.code}`);
      return;
    }
    setPending(false);
    if (res.status === 404) setErrors({ code: [res.error] });
    else if (res.status === 409 && res.error.includes("name")) setErrors({ yourName: [res.error] });
    else if (Object.keys(res.details).length) setErrors(res.details);
    else setFormError(res.error);
  }

  const codeError = errors.code?.[0];

  return (
    <form onSubmit={submit} noValidate className="ticket flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <h2 className="font-display text-2xl font-semibold">
          {tripName ? `Join ${tripName}` : "Join a trip"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {fixedCode
            ? "Pick the name the group will see."
            : "Got a code from a friend? Enter it here."}
        </p>
      </div>
      <div className="perforation mx-5" aria-hidden />
      <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
        <div>
          <label htmlFor={codeId} className="label">
            Trip code
          </label>
          <input
            id={codeId}
            name="code"
            className="input text-center font-mono text-2xl font-semibold tracking-[0.35em] uppercase read-only:bg-paper"
            placeholder="K7QX2M"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={JOIN_CODE_LENGTH}
            value={code}
            readOnly={!!fixedCode}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? `${codeId}-error` : undefined}
          />
          {codeError && (
            <p id={`${codeId}-error`} className="field-error" role="alert">
              {codeError}
            </p>
          )}
        </div>
        <TextField
          label="Your name"
          name="yourName"
          autoComplete="given-name"
          placeholder="How the group knows you"
          value={yourName}
          onChange={(e) => setYourName(e.target.value)}
          error={errors.yourName?.[0]}
          maxLength={NAME_MAX}
          required
        />
        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Joining…" : "Join trip"}
        </button>
      </div>
    </form>
  );
}
