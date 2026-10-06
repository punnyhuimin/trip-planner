// Pure local updates applied before the server confirms a change.
import type { ReactionValue, TripState } from "@/lib/types";

/** Sets (or with `null`, clears) one member's reaction to one wish. */
export function withReaction(
  wishId: string,
  memberId: string,
  value: ReactionValue | null,
): (state: TripState) => TripState {
  return (state) => ({
    ...state,
    wishes: state.wishes.map((w) =>
      w.id !== wishId
        ? w
        : {
            ...w,
            reactions: [
              ...w.reactions.filter((r) => r.memberId !== memberId),
              ...(value ? [{ memberId, value }] : []),
            ],
          },
    ),
  });
}
