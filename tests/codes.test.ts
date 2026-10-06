import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, generateJoinCode, generateToken } from "@/lib/codes";
import { isJoinCodeFormat } from "@/lib/codes-shared";

describe("generateJoinCode", () => {
  it("is 10 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(10);
      for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    }
  });

  it("never uses 0, O, 1 or I", () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[0O1I]/);
  });
});

describe("isJoinCodeFormat", () => {
  it("accepts new 10-character codes", () => {
    expect(isJoinCodeFormat("K7QX2MPW4R")).toBe(true);
    expect(isJoinCodeFormat(generateJoinCode())).toBe(true);
  });

  it("accepts older 6-character codes, including the seed's DEMO42", () => {
    expect(isJoinCodeFormat("K7QX2M")).toBe(true);
    expect(isJoinCodeFormat("DEMO42")).toBe(true);
  });

  it("rejects other lengths and characters", () => {
    for (const code of ["", "K7QX2", "K7QX2MP", "K7QX2MPW4", "K7QX2MPW4RZ", "k7qx2m", "K7QX-M"]) {
      expect(isJoinCodeFormat(code)).toBe(false);
    }
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
