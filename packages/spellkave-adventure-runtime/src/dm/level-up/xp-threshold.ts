/**
 * // pattern: proactive-level-up
 *
 * The ceremony giver's XP-threshold offer — the DETERMINISTIC decision, extracted from
 * the live watch so it is offline-testable without a node.
 *
 * The live watcher (`../watches/xp-threshold-watch.ts`) reads the hero's `srd/xp`
 * and `srd/level` through `readObjectStateInt` (NPC-tool surface, same
 * BL-23 shape as kill-time XP) and asks these helpers whether to invite,
 * offer, teleport, or return.
 *
 * Dedup latch: one in-memory Set holds both `heroId:level` (offer) and
 * `heroId:level:invite` (telepathic invitation). Invitation never consumes
 * the offer latch — consent still waits for the co-located Accept/Decline
 * pair. `srd/level` itself is the durable latch — once the hero confirms
 * and level increments, the old threshold no longer matches. A host restart
 * mid-offer loses the in-memory set and may re-invite / re-offer once;
 * that is an accepted tradeoff (unlike kill-XP's on-chain zero-latch).
 *
 * When the threshold is crossed away from the giver, they first speaks a
 * telepathic invitation. The giver's authored party-extent telepathy grant is
 * the reach authority; this watch does not reproduce a geometric policy.
 * The offer affordance still fires only once they share a node.
 */
export interface ObservedHeroAdvancement {
	/** Giver's name, used verbatim in skip-reason strings. */
	personaName: string;
	/** Level cap of the story's ruleset (required: no silent default). */
	maxLevel: number;
	/** Bare numeric entity id of the hero. */
	heroEntityId: string;
	/** Live `srd/xp` read off the hero via `readObjectStateInt`. */
	xp: number | null;
	/** Live `srd/level` read off the hero via `readObjectStateInt`. */
	level: number | null;
	/** Current place_node of the hero, when visible. */
	heroNodeId: string | undefined;
	/** Current place_node of the ceremony giver, when visible. */
	giverNodeId: string | undefined;
	/** True when this watch has already offered for `heroId:level`. */
	alreadyOfferedForLevel: boolean;
	/** True when this watch has already sent the telepathic invitation. */
	alreadyInvitedForLevel: boolean;
	/** XP required to reach `level + 1` (`xpThresholdForLevel`). */
	thresholdForNextLevel: number;
	/**
	 * sk-jay0.2.38: true once the giver's own `dm/aldwin/level-up-applied`
	 * latch row is visible. `level-up/enroll` writes that row in the SAME
	 * reducer as the hero's `dm/level-up/pending-hp-choice` draft row, so
	 * this is the world's answer to "has the wizard been enrolled". The
	 * offer (and the draft grant applied just before it) must wait for it:
	 * a draft grant ahead of enrollment lets the hero dispatch
	 * `daring-advance` against a row that does not exist yet.
	 */
	levelUpEnrolled: boolean;
}

export type XpThresholdDecision =
	| { kind: "offer"; heroEntityId: string; level: number; latchKey: string }
	| { kind: "invite"; heroEntityId: string; level: number; latchKey: string }
	| { kind: "skip"; reason: string };

export function offerLatchKey(heroEntityId: string, level: number): string {
	return `${heroEntityId}:${level}`;
}

/** Same Set as {@link offerLatchKey}; distinct key so an invite never blocks the later offer. */
export function inviteLatchKey(heroEntityId: string, level: number): string {
	return `${heroEntityId}:${level}:invite`;
}

/**
 * Decide whether the giver should invite (telepathy) or dispatch `offer-level-up`.
 *
 * Shared gates: xp and level visible, level < maxLevel, xp has crossed the
 * next-level threshold, both locations visible.
 * Co-located → offer (once per hero:level), but only after the giver's seat
 * has enrolled the hero (`levelUpEnrolled`).
 * Not co-located → invite once through the giver's authored party telepathy.
 */
export function decideXpThresholdOffer(obs: ObservedHeroAdvancement): XpThresholdDecision {
	if (obs.xp === null) {
		return { kind: "skip", reason: "hero srd/xp not visible" };
	}
	if (obs.level === null) {
		return { kind: "skip", reason: "hero srd/level not visible" };
	}
	if (!Number.isFinite(obs.xp) || !Number.isFinite(obs.level)) {
		return { kind: "skip", reason: "hero xp/level not a finite number" };
	}
	if (obs.level >= obs.maxLevel) {
		return { kind: "skip", reason: "hero is already at the level cap" };
	}
	if (obs.xp < obs.thresholdForNextLevel) {
		return { kind: "skip", reason: "hero has not crossed the next-level XP threshold" };
	}
	if (obs.heroNodeId === undefined || obs.giverNodeId === undefined) {
		return { kind: "skip", reason: `hero or ${obs.personaName} location not visible` };
	}
	const level = Math.trunc(obs.level);
	if (obs.heroNodeId === obs.giverNodeId) {
		if (obs.alreadyOfferedForLevel) {
			return { kind: "skip", reason: "already offered for this hero:level" };
		}
		if (!obs.levelUpEnrolled) {
			return { kind: "skip", reason: "level-up wizard not enrolled yet" };
		}
		return {
			kind: "offer",
			heroEntityId: obs.heroEntityId,
			level,
			latchKey: offerLatchKey(obs.heroEntityId, level),
		};
	}
	if (obs.alreadyOfferedForLevel) {
		return { kind: "skip", reason: "already offered for this hero:level" };
	}
	if (obs.alreadyInvitedForLevel) {
		return { kind: "skip", reason: "already invited for this hero:level" };
	}
	return {
		kind: "invite",
		heroEntityId: obs.heroEntityId,
		level,
		latchKey: inviteLatchKey(obs.heroEntityId, level),
	};
}

export interface ObservedOfferAccepted {
	/** Giver's name, used verbatim in skip-reason strings. */
	personaName: string;
	offerAccepted: number | null;
	heroNodeId: string | undefined;
	giverNodeId: string | undefined;
	alreadyTeleported: boolean;
}

export type TeleportDecision = { kind: "teleport" } | { kind: "skip"; reason: string };

/** Dispatch the into-limbo sibling once the hero has accepted and they still share a node. */
export function decideTeleportIntoLimbo(obs: ObservedOfferAccepted): TeleportDecision {
	if (obs.alreadyTeleported) {
		return { kind: "skip", reason: "already teleported for this acceptance" };
	}
	if (obs.offerAccepted === null) {
		return { kind: "skip", reason: "offer-accepted marker not visible" };
	}
	if (obs.offerAccepted < 1) {
		return { kind: "skip", reason: "hero has not accepted the offer" };
	}
	if (obs.heroNodeId === undefined || obs.giverNodeId === undefined) {
		return { kind: "skip", reason: `hero or ${obs.personaName} location not visible` };
	}
	if (obs.heroNodeId !== obs.giverNodeId) {
		return { kind: "skip", reason: `hero and ${obs.personaName} are not co-located` };
	}
	return { kind: "teleport" };
}

export interface ObservedReturn {
	/** Giver's name, used verbatim in skip-reason strings. */
	personaName: string;
	/** Live `dm/aldwin/level-up-applied` (last applied hero level, L9). */
	levelUpApplied: number | null;
	/**
	 * Latch value observed when this ceremony entered the limbo (teleport).
	 * Return only when the latch has advanced past that baseline so a second
	 * level-up is not short-circuited by a stale latch of 2+.
	 */
	latchAtCeremonyStart: number;
	/**
	 * `levelUpApplied` value at which a return dispatch was already REFUSED,
	 * or null when none has been. A refusal cannot become a success while the
	 * world stands still, so retrying it every cycle is pure churn: measured
	 * hosted, 456 failing reducers in seven minutes after an npc-host restart
	 * inherited a high world latch and a blank memory (sk-0m4.120.44). The
	 * next ceremony advances the latch and clears the block by itself.
	 */
	refusedAtLatch: number | null;
	alreadyReturned: boolean;
}

export type ReturnDecision = { kind: "return" } | { kind: "skip"; reason: string };

/** Dispatch the hearth return once apply-level-up has advanced the latch
 * past the value captured at teleport. The offer-accepted marker is cleared
 * by dm/level-up/confirm (the owning bundle), so this decision does not read it. */
export function decideReturnFromLimbo(obs: ObservedReturn): ReturnDecision {
	if (obs.alreadyReturned) {
		return { kind: "skip", reason: "already returned from this ceremony" };
	}
	// sk-0m4.120.44: do not re-dispatch a refusal that nothing has changed
	// since. Keyed on the latch VALUE, so a fresh ceremony — which advances
	// `levelUpApplied` — clears the block by itself; only the exact state
	// that was already refused stays blocked.
	if (obs.refusedAtLatch !== null && obs.levelUpApplied === obs.refusedAtLatch) {
		return { kind: "skip", reason: "this return was already refused at this latch" };
	}
	if (obs.levelUpApplied === null) {
		return { kind: "skip", reason: `${obs.personaName}'s level-up-applied latch not visible` };
	}
	if (obs.levelUpApplied <= obs.latchAtCeremonyStart) {
		return { kind: "skip", reason: "level-up has not been applied yet this ceremony" };
	}
	return { kind: "return" };
}
