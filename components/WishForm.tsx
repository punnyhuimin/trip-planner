"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { ScaleField } from "@/components/ScaleField";
import { TextField } from "@/components/TextField";
import { api } from "@/lib/api";
import { COST_LABEL, ENERGY_LABEL, PRIORITY_LABEL, TIME_LABEL } from "@/lib/labels";
import {
  PRIORITIES,
  TIME_OF_DAY_VALUES,
  type Priority,
  type TimeOfDay,
  type WishDTO,
  type WishKind,
} from "@/lib/types";

type Props = {
  code: string;
  /** Present when editing; absent when adding. */
  wish?: WishDTO;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type FormState = {
  title: string;
  kind: WishKind;
  priority: Priority;
  timeOfDay: TimeOfDay;
  durationHrs: string;
  costLevel: number;
  energy: number;
  tags: string;
  notes: string;
};

function initialForm(wish?: WishDTO): FormState {
  return {
    title: wish?.title ?? "",
    kind: wish?.kind ?? "ACTIVITY",
    priority: wish?.priority ?? "LOVE",
    timeOfDay: wish?.timeOfDay ?? "ANY",
    durationHrs: String(wish?.durationHrs ?? 2),
    costLevel: wish?.costLevel ?? 1,
    energy: wish?.energy ?? 1,
    tags: wish?.tags.join(", ") ?? "",
    notes: wish?.notes ?? "",
  };
}

/**
 * Add or edit a wish. A bottom sheet on phones, a modal on wider screens.
 * Its state is seeded once from props, so polling never resets what you've typed.
 */
export function WishForm({ code, wish, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(() => initialForm(wish));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ids = { title: useId(), time: useId(), duration: useId(), notes: useId() };

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const isActivity = form.kind === "ACTIVITY";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    const body = {
      title: form.title,
      kind: form.kind,
      priority: isActivity ? form.priority : "NICE",
      timeOfDay: isActivity ? form.timeOfDay : "ANY",
      durationHrs: Number(form.durationHrs),
      costLevel: form.costLevel,
      energy: form.energy,
      tags: form.tags.split(","),
      notes: form.notes,
    };
    const res = wish
      ? await api(`/api/trips/${code}/wishes/${wish.id}`, "PATCH", body)
      : await api(`/api/trips/${code}/wishes`, "POST", body);
    setPending(false);
    if (res.ok) {
      onSaved(wish ? "Wish saved" : "Wish added");
      return;
    }
    setErrors(res.details);
    setFormError(Object.keys(res.details).length ? "Check the highlighted fields." : res.error);
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby={ids.title}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl bg-card p-0 text-ink backdrop:bg-ink/50 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 id={ids.title} className="font-display text-xl font-semibold">
            {wish ? "Edit wish" : "Add a wish"}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="btn btn-ghost min-h-9 px-3"
          >
            Cancel
          </button>
        </div>

        <fieldset>
          <legend className="label">What kind of wish?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["ACTIVITY", "Something to do", "Goes into the plan"],
                ["CONSTRAINT", "Heads-up", "e.g. no early mornings"],
              ] as const
            ).map(([kind, label, hint]) => (
              <label
                key={kind}
                className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm has-focus-visible:outline-2 has-focus-visible:outline-lagoon ${
                  form.kind === kind ? "border-lagoon bg-lagoon-soft" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={kind}
                  checked={form.kind === kind}
                  onChange={() => set("kind", kind)}
                  className="sr-only"
                />
                <span className="font-semibold">
                  {form.kind === kind && <span aria-hidden>✓ </span>}
                  {label}
                </span>
                <span className="text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label={isActivity ? "What do you want to do?" : "What should the group know?"}
          name="title"
          placeholder={isActivity ? "Sunrise hike up the volcano" : "No early mornings please"}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title?.[0]}
          maxLength={80}
          required
          autoFocus
        />

        {isActivity && (
          <>
            <fieldset>
              <legend className="label">How much do you want it?</legend>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <label
                    key={p}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-lagoon ${
                      form.priority === p ? "border-lagoon bg-lagoon-soft" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={form.priority === p}
                      onChange={() => set("priority", p)}
                      className="sr-only"
                    />
                    {form.priority === p && <span aria-hidden>✓&nbsp;</span>}
                    {PRIORITY_LABEL[p]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.time} className="label">
                  Time of day
                </label>
                <select
                  id={ids.time}
                  className="input"
                  value={form.timeOfDay}
                  onChange={(e) => set("timeOfDay", e.target.value as TimeOfDay)}
                >
                  {TIME_OF_DAY_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {TIME_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label="Hours"
                name="durationHrs"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={12}
                step={0.5}
                value={form.durationHrs}
                onChange={(e) => set("durationHrs", e.target.value)}
                error={errors.durationHrs?.[0]}
              />
            </div>

            <ScaleField
              legend="Cost"
              labels={COST_LABEL}
              value={form.costLevel}
              onChange={(v) => set("costLevel", v)}
            />
            <ScaleField
              legend="Energy"
              labels={ENERGY_LABEL}
              value={form.energy}
              onChange={(v) => set("energy", v)}
            />

            <TextField
              label="Tags (optional)"
              name="tags"
              placeholder="food, views"
              hint="Separate tags with commas."
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              error={errors.tags?.[0]}
            />
          </>
        )}

        <div>
          <label htmlFor={ids.notes} className="label">
            Notes (optional)
          </label>
          <textarea
            id={ids.notes}
            className="input min-h-20"
            maxLength={500}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            aria-invalid={errors.notes ? true : undefined}
          />
          {errors.notes && <p className="field-error">{errors.notes[0]}</p>}
        </div>

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : wish ? "Save wish" : "Add wish"}
        </button>
      </form>
    </dialog>
  );
}
