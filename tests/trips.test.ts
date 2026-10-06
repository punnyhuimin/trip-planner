// Failure paths of lib/trips.ts that a real database can't easily be pushed
// into. The happy paths run against D1 in tests/api/trips.test.ts.
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { addMember, createTripWithHost } from "@/lib/trips";

const uniqueCode = { code: "P2002", meta: { target: ["code"] } };
const uniqueName = { code: "P2002", meta: { target: ["tripId", "name"] } };

const input = {
  name: "Kyoto",
  destination: undefined,
  startDate: "2026-11-01",
  endDate: "2026-11-03",
  yourName: "Ana",
};

function fakeDb(overrides: {
  tripCreate?: (args: { data: { code: string } }) => Promise<unknown>;
  memberCreate?: () => Promise<unknown>;
  members?: { name: string; color: string }[];
}) {
  const tripDelete = vi.fn(async () => ({}));
  const db = {
    trip: {
      create: vi.fn(
        overrides.tripCreate ??
          (async ({ data }: { data: { code: string } }) => ({ id: "t1", code: data.code })),
      ),
      delete: tripDelete,
    },
    member: {
      create: vi.fn(overrides.memberCreate ?? (async () => ({ id: "m1" }))),
      findMany: vi.fn(async () => overrides.members ?? []),
    },
  };
  return { db: db as unknown as Db, raw: db };
}

describe("createTripWithHost", () => {
  it("retries with a new code when the code is taken", async () => {
    let calls = 0;
    const { db, raw } = fakeDb({
      tripCreate: async ({ data }) => {
        if (++calls < 3) throw uniqueCode;
        return { id: "t1", code: data.code };
      },
    });
    const { code, token } = await createTripWithHost(db, input);
    expect(raw.trip.create).toHaveBeenCalledTimes(3);
    expect(code).toBe(raw.trip.create.mock.calls[2][0].data.code);
    expect(token).toBeTruthy();
  });

  it("gives up after five collisions", async () => {
    const { db, raw } = fakeDb({
      tripCreate: async () => {
        throw uniqueCode;
      },
    });
    await expect(createTripWithHost(db, input)).rejects.toBe(uniqueCode);
    expect(raw.trip.create).toHaveBeenCalledTimes(5);
  });

  it("doesn't retry other errors", async () => {
    const boom = new Error("D1 down");
    const { db, raw } = fakeDb({
      tripCreate: async () => {
        throw boom;
      },
    });
    await expect(createTripWithHost(db, input)).rejects.toBe(boom);
    expect(raw.trip.create).toHaveBeenCalledTimes(1);
  });

  it("deletes the trip again if the host can't be created", async () => {
    const boom = new Error("insert failed");
    const { db, raw } = fakeDb({
      memberCreate: async () => {
        throw boom;
      },
    });
    raw.trip.delete.mockRejectedValueOnce(new Error("delete failed too"));
    await expect(createTripWithHost(db, input)).rejects.toBe(boom);
    expect(raw.trip.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});

describe("addMember", () => {
  it("reports a same-name join that raced the check as a taken name", async () => {
    const { db } = fakeDb({
      memberCreate: async () => {
        throw uniqueName;
      },
    });
    const err = await addMember(db, "t1", "Ben").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 409, message: "That name is taken in this trip" });
  });

  it("rethrows other insert errors", async () => {
    const boom = new Error("D1 down");
    const { db } = fakeDb({
      memberCreate: async () => {
        throw boom;
      },
    });
    await expect(addMember(db, "t1", "Ben")).rejects.toBe(boom);
  });
});
