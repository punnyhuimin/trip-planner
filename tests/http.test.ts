import { describe, expect, it, vi } from "vitest";
import { HttpError, handle, json } from "@/lib/http";
import { joinSchema } from "@/lib/schemas";
import type { ApiError } from "@/lib/types";

describe("handle", () => {
  it("passes successful responses through", async () => {
    const res = await handle(async () => json({ ok: true }, 201));
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("maps ZodError to 400 with field details", async () => {
    const res = await handle(async () => json(joinSchema.parse({ yourName: "" })));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiError;
    expect(body.error).toBe("Invalid input");
    expect(body.details?.yourName).toEqual(["Enter your name"]);
  });

  it("maps HttpError to its status", async () => {
    const res = await handle(async () => {
      throw new HttpError(409, "That name is taken in this trip");
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "That name is taken in this trip" });
  });

  it("maps anything else to a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => {
      throw new Error("db exploded");
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong" });
  });
});
