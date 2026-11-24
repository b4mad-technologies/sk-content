/**
 * // pattern: kill-xp-grant
 *
 * The DM's kill-time XP grant - the DETERMINISTIC decision, extracted from
 * the live watch so it is offline-testable without a node.
 *
 * The live watcher (`./initiative-watch.ts`) observes a creature reaching
 * `srd/condition/dead` via `visible_target_condition` (the DM's watch
 * elevation makes that row visible). It then reads the victim's
 * `srd/xp_value` through `readObjectStateInt` (NPC-tool surface, NOT DSL -
 * BL-23) and asks this helper whether to grant.
 *
 * KNOWN LIMIT: a kill with no running NPC host never reaches this helper,
 * so it pays nothing. That is accepted (operator ruling, sk-0m4.27).
 */
export interface ObservedKill {
	/** Bare numeric entity id of the creature that just became dead. */
	victimEntityId: string;
	/** Bare numeric entity id of the attacker, when the watch can name one. */
	killerEntityId: string | undefined;
	/** Live `srd/xp_value` read off the victim via `readObjectStateInt`. */
	xpValue: number | null;
}

export type KillXpDecision =
	| { kind: "grant"; killerEntityId: string; victimEntityId: string; amount: number }
	| { kind: "skip"; reason: string };

/** The skip reason that means the victim's XP latch is spent for good. The
 * watch keys its "never look at this victim again" set on this exact string. */
export const KILL_XP_ALREADY_CLAIMED_REASON =
	"victim srd/xp_value already claimed or not an XP source";

/**
 * Decide whether the DM awards XP for this observed death.
 *
 * Grant only when: a killer is named, killer != victim, and the victim still
 * carries an unclaimed `srd/xp_value` >= 1 (the same latch `srd/claim-victory`
 * uses). Zero / missing / already-claimed values skip - Claim Victory may
 * already have fired, or the corpse was never an XP source.
 */
export function decideKillXpGrant(kill: ObservedKill): KillXpDecision {
	if (kill.killerEntityId === undefined || kill.killerEntityId === "") {
		return { kind: "skip", reason: "no killer attributed" };
	}
	if (kill.killerEntityId === kill.victimEntityId) {
		return { kind: "skip", reason: "self-kill is not an award" };
	}
	if (kill.xpValue === null) {
		return { kind: "skip", reason: "victim srd/xp_value not visible" };
	}
	if (!Number.isFinite(kill.xpValue) || kill.xpValue < 1) {
		return { kind: "skip", reason: KILL_XP_ALREADY_CLAIMED_REASON };
	}
	return {
		kind: "grant",
		killerEntityId: kill.killerEntityId,
		victimEntityId: kill.victimEntityId,
		amount: Math.trunc(kill.xpValue),
	};
}
