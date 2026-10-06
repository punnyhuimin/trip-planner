"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { dayDate, formatDayLabel } from "@/lib/dates";
import { TIME_LABEL } from "@/lib/labels";
import { type SlotDTO, TIME_BLOCKS, type TimeBlock, type WishDTO } from "@/lib/types";

type Props = {
  code: string;
  slot: SlotDTO;
  wish: WishDTO;
  days: number;
  startDate: string;
  onClose: () => void;
  onMoved: () => void;
};

/** Pick a day and time block for a slot. Moving pins it. Works well on touch screens. */
export function MoveSlotPicker({ code, slot, wish, days, startDate, onClose, onMoved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dayIndex, setDayIndex] = useState(slot.dayIndex);
  const [timeOfDay, setTimeOfDay] = useState<TimeBlock>(slot.timeOfDay);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ids = { title: useId(), day: useId(), time: useId() };

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await api(`/api/trips/${code}/plan/slots/${slot.id}`, "PATCH", {
      dayIndex,
      timeOfDay,
    });
    setPending(false);
    if (res.ok) onMoved();
    else setError(res.error);
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby={ids.title}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-card p-0 text-ink backdrop:bg-ink/50 sm:m-auto sm:max-w-sm sm:rounded-2xl"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <div>
          <h2 id={ids.title} className="font-display text-xl font-semibold">
            Move {wish.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Moving pins it, so regenerating the plan won&rsquo;t move it back.
            {wish.durationHrs > 4 && " Long activities keep both of their blocks together."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids.day} className="label">
              Day
            </label>
            <select
              id={ids.day}
              className="input"
              value={dayIndex}
              onChange={(e) => setDayIndex(Number(e.target.value))}
            >
              {Array.from({ length: days }, (_, i) => (
                <option key={i} value={i}>
                  Day {i + 1} · {formatDayLabel(dayDate(startDate, i))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.time} className="label">
              Time
            </label>
            <select
              id={ids.time}
              className="input"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value as TimeBlock)}
            >
              {TIME_BLOCKS.map((b) => (
                <option key={b} value={b}>
                  {TIME_LABEL[b]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Moving…" : "Move and pin"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
