// Sneak Attack (L12a follow-up / sk-609b.12.1) — dedicated shallow attack.
// pattern: mastery-gated-attack-variant
// → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md
// K-A facts: core/resolution_roll_modifier + peers_near_target (ADR-0105).
// Source: cache/markdown/classes.md:7039-7043

import {
	feetToMillimetres,
	WEAPON_ATTACK_RANGE_SLOT_ID,
} from "../equipment/weapon-damage-source-units";
import { WEAPON_SUBJECT } from "../equipment/weapon-subject";
import {
	WEAPON_RANGE_TAG_PREFIX,
	weaponFinessePropertyTag,
	weaponReachPropertyTag,
} from "../equipment/weapon-tag-values";
import { STANDARD_REACH_MM } from "./reach-units";

export const SNEAK_ATTACK_CAPABILITY_ID = "srd/class-feature/rogue/sneak-attack";
export const SNEAK_ATTACK_DICE_RESOURCE_ID = "srd/rogue/sneak-attack-dice";
export const SNEAK_ATTACK_ACTION_LOCAL_ID = "attack/sneak-attack";
export const SNEAK_ATTACK_ACTION_ID = `srd/${SNEAK_ATTACK_ACTION_LOCAL_ID}`;
export const SNEAK_ATTACK_EXPENDED_LOCAL_ID = "condition/sneak-attack-expended";
export const SNEAK_ATTACK_EXPENDED_ID = `srd/${SNEAK_ATTACK_EXPENDED_LOCAL_ID}`;

/** 5 ft adjacency in mm (bundle combat grid cell / SRD square). */
export const SNEAK_ATTACK_ALLY_RADIUS_MM = feetToMillimetres(5); // 1524

export const SNEAK_ATTACK_FACTION_PREFIX = "srd.faction.";
export const SNEAK_ATTACK_INCAPACITATED_CONDITION_ID = "srd/condition/incapacitated";

/**
 * Once-per-turn reset: ApplyStatus `srd/condition/sneak-attack-expended` on the
 * acting rogue when the dedicated Sneak Attack action hits; expires at the
 * rogue's next `turn_start` (`owner_actor = Actor`). Offer gates on
 * `actor.status(...) == false`. Boundary expiry IS the turn window (same
 * idiom as Sap/Dodge/Reckless) — no resource refill required.
 */
export const SNEAK_ATTACK_ONCE_PER_TURN_RESET =
	"condition srd/condition/sneak-attack-expended expires_at_boundary turn_start owner=Actor";

/** Advantage on THIS resolution, or a non-incapacitated faction peer within 5 ft and no Disadvantage. */
export function sneakAttackTriggerExpr(): string {
	const adv = "actor.stat('core/resolution_roll_modifier') == 1";
	const noDisadv = "actor.stat('core/resolution_roll_modifier') != -1";
	const ally =
		`peers_near_target('${SNEAK_ATTACK_FACTION_PREFIX}', ${SNEAK_ATTACK_ALLY_RADIUS_MM}, ` +
		`'${SNEAK_ATTACK_INCAPACITATED_CONDITION_ID}') >= 1`;
	return `${adv} || ${ally} && ${noDisadv}`;
}

/**
 * Nd6 by rogue level (column 1d6 L1–2, 2d6 L3–4). Reads srd/level because the
 * dice resource is seeded 1 at creation and never raised (sk-jay0.1.55.56).
 * Shallow ladder for L1–4 content band only to keep delta_source parseable;
 * higher column rungs extend here when L5+ ships.
 */
export function sneakAttackDiceMagnitudeExpr(): string {
	// L1–4: 1 or 2 dice. Nested deeper ladders re-trigger MF-DSL-EXPECTED-RPAREN
	// when composed into damage writes.
	return "cond(actor.stat('srd/level') >= 3, 2d6, 1d6)";
}

/**
 * Separate ordinal ModifyResource for SA dice only (untyped) — keeps the
 * weapon type-routing ladder shallow (attempt 1 folded SA into the 13-type
 * tower and hit MF-DSL-EXPECTED-RPAREN).
 */
export function sneakAttackBonusDeltaExpr(): string {
	return `0 - cond(${sneakAttackTriggerExpr()}, ${sneakAttackDiceMagnitudeExpr()}, 0)`;
}

/** Finesse property OR Ranged range class (classes.md:7041). */
export function sneakAttackWeaponGateExpr(): string {
	return (
		`${WEAPON_SUBJECT}.has_tag('${weaponFinessePropertyTag()}') || ` +
		`${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.ranged')`
	);
}

/** In-range for a finesse melee weapon OR a ranged weapon. */
export function sneakAttackRangePredicate(): string {
	const meleeReach =
		`${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.melee') && ` +
		`target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm') + ` +
		`cond(${WEAPON_SUBJECT}.has_tag('${weaponReachPropertyTag()}'), ${STANDARD_REACH_MM}, 0)`;
	const ranged =
		`${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.ranged') && ` +
		`target.stat('core/distance_to_actor_mm') <= ${WEAPON_SUBJECT}.source('${WEAPON_ATTACK_RANGE_SLOT_ID}')`;
	return `(${meleeReach}) || (${ranged})`;
}

/**
 * Offer attemptability only — no K-A facts here (ADR-0105 G-1: materialiser
 * does not populate resolution_roll_modifier / peers_near_target).
 */
export function sneakAttackOfferPredicate(): string {
	// Affordance predicates cannot parse `||` (MF-DSL-EXPECTED-RPAREN) — proven
	// live bisect. Primary offer is Finesse melee. Sibling ranged affordance
	// via write_rows. Mutual exclusion: melee vs ranged range tags (MF-VAL-341).
	return (
		`actor.has_capability('${SNEAK_ATTACK_CAPABILITY_ID}') && ` +
		`actor.stat('${SNEAK_ATTACK_DICE_RESOURCE_ID}') >= 1 && ` +
		`actor.status('${SNEAK_ATTACK_EXPENDED_ID}') == false && ` +
		`${WEAPON_SUBJECT}.has_tag('${weaponFinessePropertyTag()}') && ` +
		`${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.melee') && ` +
		`target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm') + ` +
		`cond(${WEAPON_SUBJECT}.has_tag('${weaponReachPropertyTag()}'), ${STANDARD_REACH_MM}, 0)`
	);
}

/** Ranged sibling affordance predicate (no `||` — separate template). */
export function sneakAttackRangedOfferPredicate(): string {
	return (
		`actor.has_capability('${SNEAK_ATTACK_CAPABILITY_ID}') && ` +
		`actor.stat('${SNEAK_ATTACK_DICE_RESOURCE_ID}') >= 1 && ` +
		`actor.status('${SNEAK_ATTACK_EXPENDED_ID}') == false && ` +
		`${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.ranged') && ` +
		`target.stat('core/distance_to_actor_mm') <= ${WEAPON_SUBJECT}.source('${WEAPON_ATTACK_RANGE_SLOT_ID}')`
	);
}

/** Legacy expressible-half helper kept for callers; prefer dedicated action. */
export function sneakAttackBonusExpr(): string {
	const weaponOk = sneakAttackWeaponGateExpr();
	const gate =
		`actor.has_capability('${SNEAK_ATTACK_CAPABILITY_ID}') && ` +
		`actor.stat('${SNEAK_ATTACK_DICE_RESOURCE_ID}') >= 1 && (${weaponOk})`;
	return `cond(${gate}, 1d6, 0)`;
}
