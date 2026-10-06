import { ZodError, z } from "zod";
import type { ApiError } from "@/lib/types";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** JSON response that is never cached: every API response reflects live trip data. */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
}

/** Runs a route handler body and maps thrown errors to `{ error }` responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) {
      const body: ApiError = { error: "Invalid input", details: z.flattenError(err).fieldErrors };
      return json(body, 400);
    }
    if (err instanceof HttpError) {
      return json({ error: err.message } satisfies ApiError, err.status);
    }
    console.error(err);
    return json({ error: "Something went wrong" } satisfies ApiError, 500);
  }
}
