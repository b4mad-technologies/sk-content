/**
 * // pattern: draft-then-confirm-wizard
 *
 * Creation duty: the pure decisions a DM seat makes about WHEN to serve a
 * creation candidate (generic mechanism; the kavemouth originals lived in
 * `aldwin/seat.ts`). No world reads, no ids — every input is a plain value.
 */

/** sk-0m4.1 — THE WALK RULE's pure decision: a DM's creation duty is only
 * active when the candidate is BOTH claimed AND currently located at the
 * creation station — never location alone. An unclaimed candidate is
 * scenery, no matter where the seed authored it (this was the bug: the
 * candidate is authored at the station in every seed of the world, level-0
 * prequel AND ordinary level-1 hand-play alike, so location alone was
 * always true and the DM walked to an empty limbo forever, sk-0m4.1). */
export function candidateNeedsCreationDuty(
	claimed: boolean,
	candidateNodeId: string | undefined,
	creationStationNodeId: string,
): boolean {
	return claimed && candidateNodeId === creationStationNodeId;
}

/** sk-jay0.3.4.20 — the seat's memory of WHICH claim it is currently serving.
 * `generation` counts unclaimed→claimed transitions on the candidate's public
 * `seat` row; `served` is the generation whose greeting this process has
 * already begun. */
export interface CreationClaimWatch {
	/** The claim state observed on the previous cycle, so a transition (not a
	 * level) is what advances `generation`. */
	claimed: boolean;
	targetRef?: string;
	generation: number;
	served: number;
}

export const INITIAL_CREATION_CLAIM_WATCH: CreationClaimWatch = {
	claimed: false,
	generation: 0,
	served: 0,
};

/** Advance the claim watch by one cycle's observation.
 *
 * `rearm` is the answer to "must the creation dialogue be rebuilt?" — true
 * ONLY for a claim that is not the first one this process has served. The
 * first served claim needs no rebuild whether it was already in place at boot
 * (hosted prequel: the host starts with the candidate bound, and the freshly
 * constructed engine greets exactly once, as today) or arrived later (the
 * sk-jay0.3.4.20 bug: the engine is still unlatched because the DM never had
 * duty, so it greets on the walk without being touched). A SECOND claim —
 * release then re-bind — meets a `hasWelcomed` engine that would never greet
 * again, so that one, and only that one, rebuilds. */
export function advanceCreationClaimWatch(
	previous: CreationClaimWatch,
	claimedNow: boolean,
	targetRef?: string,
): { watch: CreationClaimWatch; rearm: boolean } {
	const generation =
		claimedNow &&
		(!previous.claimed || (targetRef !== undefined && previous.targetRef !== targetRef))
			? previous.generation + 1
			: previous.generation;
	if (generation === previous.served) {
		return {
			watch: {
				...previous,
				claimed: claimedNow,
				generation,
				...(targetRef === undefined ? {} : { targetRef }),
			},
			rearm: false,
		};
	}
	return {
		watch: {
			claimed: claimedNow,
			generation,
			served: generation,
			...(targetRef === undefined ? {} : { targetRef }),
		},
		rearm: previous.served > 0,
	};
}

/** sk-0m4.101 — whether a creation self-act (AlignOpen / AlignPhase) should
 * call `engine.commitLastSelfAct()` after the PLAYER-tool dispatch.
 *
 * `accepted` is the happy path. `unobserved` is a provenance-window miss: the
 * manipulate often still lands under multi-NPC load, but refusing to latch
 * loops AlignOpen forever and the next menu never speaks. `commitLastSelfAct`
 * is a no-op unless `pendingAlign` is set, so ordinary speech is unaffected.
 * A true `rejected` (or any other outcome) stays uncommitted. */
export function creationSelfActShouldCommit(outcome: string | undefined): boolean {
	return outcome === "accepted" || outcome === "unobserved";
}
