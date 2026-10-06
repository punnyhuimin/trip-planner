/**
 * Validation limits shared by the Zod schemas (server) and the form inputs (client).
 * Plain constants with no imports, so this is safe to import from client components.
 */

/** Group size from PLAN.md. */
export const MAX_MEMBERS = 10;

/** Longest trip, in days, counting both the start and end date. */
export const MAX_TRIP_DAYS = 30;

/** Member names ("your name" when starting or joining a trip). */
export const NAME_MAX = 30;
export const TRIP_NAME_MAX = 60;
export const DESTINATION_MAX = 80;

export const WISH_TITLE_MAX = 80;
export const NOTE_MAX = 500;

/** Wish duration in hours. */
export const DURATION_MIN = 0.5;
export const DURATION_MAX = 12;
export const DURATION_STEP = 0.5;

/** Highest cost level / energy level; both scales run from 0. */
export const LEVEL_MAX = 3;

export const MAX_TAGS = 10;
export const TAG_MAX = 30;
