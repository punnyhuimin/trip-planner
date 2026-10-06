import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, generateJoinCode, generateToken } from "@/lib/codes";

describe("generateJoinCode", () => {
  it("is 6 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    }
  });

  it("never uses 0, O, 1 or I", () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[0O1I]/);
  });
});

describe("generateToken", () => {
  it("is 32 random bytes, base64url-encoded", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("is unique", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateToken));
    expect(tokens.size).toBe(1000);
  });
});
