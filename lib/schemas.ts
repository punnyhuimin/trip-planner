import { z } from "zod";
import { parseDateOnly, tripDays } from "@/lib/dates";
import { PRIORITIES, REACTION_VALUES, TIME_OF_DAY_VALUES, WISH_KINDS } from "@/lib/types";

export const MAX_TRIP_DAYS = 30;

const dateOnly = z
  .string()
  .refine((v) => parseDateOnly(v) !== null, { message: "Use a valid date (YYYY-MM-DD)" });

const personName = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(30, "Names can be at most 30 characters");

export const createTripSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the trip a name")
      .max(60, "Trip names can be at most 60 characters"),
    destination: z
      .string()
      .trim()
      .max(80, "Destinations can be at most 80 characters")
      .optional()
      .transform((v) => v || undefined),
    startDate: dateOnly,
    endDate: dateOnly,
    yourName: personName,
  })
  .superRefine((data, ctx) => {
    const start = parseDateOnly(data.startDate);
    const end = parseDateOnly(data.endDate);
    if (!start || !end) return;
    if (end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    } else if (tripDays(start, end) > MAX_TRIP_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: `Trips can be at most ${MAX_TRIP_DAYS} days`,
      });
    }
  });
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const joinSchema = z.object({ yourName: personName });
export type JoinInput = z.infer<typeof joinSchema>;

export const MAX_TAGS = 10;

/** Trimmed, lowercased, comma-free, de-duplicated tags, in first-seen order. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/,/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

const level = z.number().int().min(0).max(3);

// No defaults here, so the partial (PATCH) schema leaves unset fields alone.
const wishFields = {
  title: z
    .string()
    .trim()
    .min(1, "Give your wish a title")
    .max(80, "Titles can be at most 80 characters"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes can be at most 500 characters")
    .nullable()
    .transform((v) => v || null),
  kind: z.enum(WISH_KINDS),
  priority: z.enum(PRIORITIES),
  timeOfDay: z.enum(TIME_OF_DAY_VALUES),
  durationHrs: z
    .number()
    .min(0.5, "At least half an hour")
    .max(12, "At most 12 hours")
    .multipleOf(0.5, "Use half-hour steps"),
  costLevel: level,
  energy: level,
  tags: z
    .array(z.string().max(30, "Tags can be at most 30 characters"))
    .transform(normalizeTags)
    .refine((t) => t.length <= MAX_TAGS, `At most ${MAX_TAGS} tags`)
    .transform((t) => t.join(",")),
};

export const createWishSchema = z.object({
  ...wishFields,
  notes: wishFields.notes.optional().transform((v) => v ?? null),
  priority: wishFields.priority.default("NICE"),
  timeOfDay: wishFields.timeOfDay.default("ANY"),
  durationHrs: wishFields.durationHrs.default(2),
  costLevel: wishFields.costLevel.default(1),
  energy: wishFields.energy.default(1),
  tags: wishFields.tags.prefault([]),
});
export type CreateWishInput = z.input<typeof createWishSchema>;

export const updateWishSchema = z.object(wishFields).partial();
export type UpdateWishInput = z.input<typeof updateWishSchema>;

/** `null` clears your reaction. */
export const reactionSchema = z.object({ value: z.enum(REACTION_VALUES).nullable() });
