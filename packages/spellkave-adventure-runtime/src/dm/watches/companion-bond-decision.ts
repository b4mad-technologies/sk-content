/**
 * The DM's companion-bond decision - the DETERMINISTIC half of
 * `./companion-bond-watch.ts`, offline-testable without a node (the kill-xp /
 * xp-threshold extraction pattern).
 *
 * Inputs are live `readObjectStateInt` reads off the HERO (NPC-tool surface,
 * BL-23): `stoneCarried` is written by the companion's gift consequence,
 * `bondRecorded` by the DM's own latch.
 */
export interface ObservedBondMarkers {
	/** Hero's `<bundle>/companion/stone-carried` value. */
	stoneCarried: number | null;
	/** Hero's `<bundle>/companion/bond-recorded` value. */
	bondRecorded: number | null;
}

export type CompanionBondDecision = { kind: "record" } | { kind: "skip"; reason: string };

/** The skip reason that means the bond latch is spent for good. The watch
 * keys its "never look again" flag on this exact string. */
export const COMPANION_BOND_ALREADY_RECORDED_REASON = "bond already recorded";

/**
 * Decide whether the DM records the bond this step.
 *
 * Record only when the stone has been gifted (marker >= 1) and the bond is not
 * yet recorded. The apply itself is idempotent twice over (MF-APPLY-012 digest
 * dedup for a byte-identical delta, ADR-0085 D-1 upsert for a re-rendered
 * one), so a crash between apply and latch - or a host restart before the
 * latch lands - simply re-runs this decision.
 */
export function decideCompanionBond(markers: ObservedBondMarkers): CompanionBondDecision {
	if (markers.stoneCarried === null) {
		return { kind: "skip", reason: "hero stone-carried marker not visible" };
	}
	if (markers.stoneCarried < 1) {
		return { kind: "skip", reason: "stone not gifted yet" };
	}
	if (markers.bondRecorded !== null && markers.bondRecorded >= 1) {
		return { kind: "skip", reason: COMPANION_BOND_ALREADY_RECORDED_REASON };
	}
	return { kind: "record" };
}
