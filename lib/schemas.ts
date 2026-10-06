import { z } from "zod";
import { parseDateOnly, tripDays } from "@/lib/dates";

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
