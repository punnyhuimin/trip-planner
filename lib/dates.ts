// Trip dates are calendar days with no time zone: "YYYY-MM-DD" on the wire,
// UTC midnight in the database.

const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses "YYYY-MM-DD" to UTC midnight, or returns null if it isn't a real date. */
export function parseDateOnly(value: string): Date | null {
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return formatDateOnly(date) === value ? date : null;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Number of days in a trip, counting both the start and end day. */
export function tripDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** "YYYY-MM-DD" of the given 0-based day of the trip. */
export function dayDate(startDate: string, dayIndex: number): string {
  const start = parseDateOnly(startDate);
  if (!start) throw new Error(`Invalid date: ${startDate}`);
  return formatDateOnly(new Date(start.getTime() + dayIndex * DAY_MS));
}

/** e.g. "Mon 2 Nov" — formatted in UTC so it never shifts a day. */
export function formatDayLabel(date: string): string {
  const d = parseDateOnly(date);
  if (!d) return date;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
