// Join-code facts that are safe to import from client components
// (lib/codes.ts uses node:crypto, which must stay on the server).

/** No 0/O or 1/I, so codes survive being read aloud or typed from a screenshot. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;
