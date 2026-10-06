// Join-code facts that are safe to import from client components
// (lib/codes.ts uses node:crypto, which must stay on the server).

/** No 0/O or 1/I, so codes survive being read aloud or typed from a screenshot. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Length of newly generated codes: 32^10 ≈ 10^15, too many to guess. */
export const JOIN_CODE_LENGTH = 10;

/** Trips created before codes grew keep their 6-character codes (and the seed's DEMO42). */
export const LEGACY_JOIN_CODE_LENGTH = 6;

/**
 * True if `code` (already trimmed and upper-cased) is shaped like a join code
 * of either length. It doesn't check the alphabet: older codes such as DEMO42
 * predate it.
 */
export function isJoinCodeFormat(code: string): boolean {
  return (
    /^[A-Z0-9]+$/.test(code) &&
    (code.length === JOIN_CODE_LENGTH || code.length === LEGACY_JOIN_CODE_LENGTH)
  );
}
