import { z } from "zod";
import { parseDateOnly, tripDays } from "@/lib/dates";
import {
  DESTINATION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  LEVEL_MAX,
  MAX_TAGS,
  MAX_TRIP_DAYS,
  NAME_MAX,
  NOTE_MAX,
  TAG_MAX,
  TRIP_NAME_MAX,
  WISH_TITLE_MAX,
} from "@/lib/limits";
import {
  PRIORITIES,
  REACTION_VALUES,
  TIME_BLOCKS,
  TIME_OF_DAY_VALUES,
  WISH_KINDS,
} from "@/lib/types";

const dateOnly = z
  .string()
  .refine((v) => parseDateOnly(v) !== null, { message: "Use a valid date (YYYY-MM-DD)" });

const personName = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(NAME_MAX, `Names can be at most ${NAME_MAX} characters`);

export const createTripSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the trip a name")
      .max(TRIP_NAME_MAX, `Trip names can be at most ${TRIP_NAME_MAX} characters`),
    destination: z
      .string()
      .trim()
      .max(DESTINATION_MAX, `Destinations can be at most ${DESTINATION_MAX} characters`)
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

/** Trimmed, lowercased, comma-free, de-duplicated tags, in first-seen order. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/,/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

const level = z.number().int().min(0).max(LEVEL_MAX);

// No defaults here, so the partial (PATCH) schema leaves unset fields alone.
const wishFields = {
  title: z
    .string()
    .trim()
    .min(1, "Give your wish a title")
    .max(WISH_TITLE_MAX, `Titles can be at most ${WISH_TITLE_MAX} characters`),
  notes: z
    .string()
    .trim()
    .max(NOTE_MAX, `Notes can be at most ${NOTE_MAX} characters`)
    .nullable()
    .transform((v) => v || null),
  kind: z.enum(WISH_KINDS),
  priority: z.enum(PRIORITIES),
  timeOfDay: z.enum(TIME_OF_DAY_VALUES),
  durationHrs: z
    .number()
    .min(DURATION_MIN, `At least ${DURATION_MIN} hours`)
    .max(DURATION_MAX, `At most ${DURATION_MAX} hours`)
    .multipleOf(DURATION_STEP, `Use steps of ${DURATION_STEP} hours`),
  costLevel: level,
  energy: level,
  tags: z
    .array(z.string().max(TAG_MAX, `Tags can be at most ${TAG_MAX} characters`))
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

/** Move a slot (which pins it), or `{ pinned: false }` to let the generator move it again. */
export const slotPatchSchema = z.union([
  z.object({ dayIndex: z.number().int().min(0), timeOfDay: z.enum(TIME_BLOCKS) }).strict(),
  z.object({ pinned: z.literal(false) }).strict(),
]);
export type SlotPatch = z.infer<typeof slotPatchSchema>;
