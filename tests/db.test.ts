import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "@/lib/db";

// Shape reported by @prisma/adapter-d1 (captured from a real D1 error).
const d1Error = {
  code: "P2002",
  meta: {
    modelName: "Trip",
    driverAdapterError: {
      name: "DriverAdapterError",
      cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["code"] } },
    },
  },
};

describe("isUniqueViolation", () => {
  it("recognises the D1 adapter's error shape", () => {
    expect(isUniqueViolation(d1Error)).toBe(true);
    expect(isUniqueViolation(d1Error, "code")).toBe(true);
    expect(isUniqueViolation(d1Error, "name")).toBe(false);
  });

  it("recognises the classic meta.target shape", () => {
    const err = { code: "P2002", meta: { target: ["tripId", "name"] } };
    expect(isUniqueViolation(err, "name")).toBe(true);
    expect(isUniqueViolation(err, "code")).toBe(false);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
