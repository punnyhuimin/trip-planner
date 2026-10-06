import { describe, expectTypeOf, it } from "vitest";

import type { $Enums } from "@/lib/generated/prisma/client";
import { PRIORITIES, REACTION_VALUES, type TripPhase, WISH_KINDS } from "@/lib/types";

// Type-level checks: `npm run typecheck` fails if lib/types.ts and
// prisma/schema.prisma drift apart. toEqualTypeOf is exact, so a value missing
// from either side is caught.
describe("enum values match the Prisma schema", () => {
  it("Priority", () => {
    expectTypeOf<(typeof PRIORITIES)[number]>().toEqualTypeOf<$Enums.Priority>();
  });

  it("WishKind", () => {
    expectTypeOf<(typeof WISH_KINDS)[number]>().toEqualTypeOf<$Enums.WishKind>();
  });

  it("ReactionValue", () => {
    expectTypeOf<(typeof REACTION_VALUES)[number]>().toEqualTypeOf<$Enums.ReactionValue>();
  });

  it("TripPhase", () => {
    expectTypeOf<TripPhase>().toEqualTypeOf<$Enums.TripPhase>();
  });
});
