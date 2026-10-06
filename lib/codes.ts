import { randomBytes, randomInt } from "node:crypto";

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from "@/lib/codes-shared";

export { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH };

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
