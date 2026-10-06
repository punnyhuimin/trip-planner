import { randomBytes, randomInt } from "node:crypto";

/** No 0/O or 1/I, so codes survive being read aloud or typed from a screenshot. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** Secret that identifies a member; stored in their httpOnly cookie. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
