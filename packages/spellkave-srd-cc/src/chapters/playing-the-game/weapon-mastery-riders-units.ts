// Weapon Mastery on-hit riders (L12a / sk-609b.12.1).
// pattern: mastery-gated-attack-variant
// pattern: offer-vs-resolution-roll
// → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md
// Affordance/action predicates gate on WEAPON_SUBJECT.has_tag(mastery);
// success ApplyStatus cannot be gated inside a shared melee consequence
// (ForEach predicate only sees the rebound target — no attacker weapon tags).

import { WEAPON_SUBJECT } from "../equipment/weapon-subject";
import { WEAPON_MASTERY_TAG_PREFIX } from "../equipment/weapon-tag-values";
import { TURN_START_BOUNDARY_ID } from "./action-economy-units";
import { BUNDLE_ID } from "./constants";

/** Shipped Prone condition (fragments/conditions.ts) — string id avoids fragment cycles. */
const PRONE_CONDITION_ID = `${BUNDLE_ID}/condition/prone`;

export const MASTERY_SAP_TAG = `${WEAPON_MASTERY_TAG_PREFIX}.sap`;
export const MASTERY_SLOW_TAG = `${WEAPON_MASTERY_TAG_PREFIX}.slow`;
export const MASTERY_TOPPLE_TAG = `${WEAPON_MASTERY_TAG_PREFIX}.topple`;
export const MASTERY_GRAZE_TAG = `${WEAPON_MASTERY_TAG_PREFIX}.graze`;
export const MASTERY_VEX_TAG = `${WEAPON_MASTERY_TAG_PREFIX}.vex`;

export const VEX_CONDITION_LOCAL_ID = "condition/mastery-vex";
export const VEX_CONDITION_ID = `${BUNDLE_ID}/${VEX_CONDITION_LOCAL_ID}`;

export const SAP_CONDITION_LOCAL_ID = "condition/mastery-sap";
export const SAP_CONDITION_ID = `${BUNDLE_ID}/${SAP_CONDITION_LOCAL_ID}`;
export const SLOW_CONDITION_LOCAL_ID = "condition/mastery-slow";
export const SLOW_CONDITION_ID = `${BUNDLE_ID}/${SLOW_CONDITION_LOCAL_ID}`;

/** 10 ft = 2 cells at 5 ft/cell (grid-units). */
export const MASTERY_SLOW_SPEED_PENALTY_CELLS = -2;

export function masteryTagPredicate(tag: string): string {
	return `${WEAPON_SUBJECT}.has_tag('${tag}')`;
}

export function sapApplyStatusWrite(): Record<string, unknown> {
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "TargetActor",
			condition_definition_id: SAP_CONDITION_ID,
			expires_at_boundary: {
				boundary_id: TURN_START_BOUNDARY_ID,
				owner_actor: "TargetActor",
			},
		},
	};
}

export function slowApplyStatusWrite(): Record<string, unknown> {
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "TargetActor",
			condition_definition_id: SLOW_CONDITION_ID,
			expires_at_boundary: {
				boundary_id: TURN_START_BOUNDARY_ID,
				owner_actor: "TargetActor",
			},
		},
	};
}

export function toppleApplyStatusWrite(): Record<string, unknown> {
	// Save-for-Prone: ForEach predicate would need attacker PB/mod on the
	// rebound target — not available (see substrate-verdicts/weapon-mastery).
	// Content ships automatic Prone on a Topple-gated hit; CON save is the
	// remaining honesty gap on this property only.
	//
	// Real Restricted Movement (sk-0m4.123 part 3): the target has a real way
	// up now — `srd/movement/stand-up` (`fragments/stand-up.ts`) — so Topple
	// applies Prone with no `expires_at_boundary` timeout, the same as
	// `fragments/drop-prone.ts`'s own self-applied Prone. This retires the
	// "lapses at the victim's own next turn start" simplification (operator
	// ruling 2026-08-30, sk-0m4.120.50) that stood in for it while a
	// Topple-inflicted target had no movement-budget-metered way to stand.
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "TargetActor",
			condition_definition_id: PRONE_CONDITION_ID,
		},
	};
}

/** Graze miss: ability-mod weapon damage type untyped flat (STR for melee). */
export function grazeMissDeltaExpr(): string {
	return `0 - max(0, macro('srd/strength_modifier'))`;
}

/**
 * Vex (equipment.md:112): Advantage on the attacker's next attack roll against
 * THAT creature before end of next turn.
 *
 * Expressible half: actor-scoped Advantage on srd/attack_roll until the
 * attacker's next turn_start (Reckless Attack idiom). Same-target scoping is
 * NOT expressible — modifier predicates have no "this condition's source
 * target" read (same gap as Prone against-me / Charmed). Documented honesty
 * gap: broad Advantage, not vs-same-target only.
 */
export function vexApplyStatusWrite(): Record<string, unknown> {
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "Actor",
			condition_definition_id: VEX_CONDITION_ID,
			expires_at_boundary: {
				boundary_id: TURN_START_BOUNDARY_ID,
				owner_actor: "Actor",
			},
		},
	};
}
