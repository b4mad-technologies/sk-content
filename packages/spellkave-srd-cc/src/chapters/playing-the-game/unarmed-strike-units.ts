// Generic Attack action: Unarmed Strike (Damage), the first complete,
// equipment-independent Attack variant shipped by this chapter.
//
// SOURCE:
//   - cache/markdown/playing-the-game.md:1019-1027 — choose a target,
//     determine modifiers, resolve the attack and damage.
//   - cache/markdown/rules-glossary.md:235-237 — the Attack action permits
//     one attack roll with a weapon or an Unarmed Strike.
//   - cache/markdown/rules-glossary.md:1491-1497 — the Unarmed Strike Damage
//     option: target within 5 feet, Strength modifier + Proficiency Bonus to
//     hit, 1 + Strength modifier Bludgeoning damage on a hit.
//
// The authored verb composes existing chapter idioms instead of retyping
// them: `attackRollExpr` owns nat-20/nat-1 and modifier/PB-vs-AC semantics;
// `abilityModifierExpr` owns the below-10 floor correction. The creature
// niche, target AC/HP state, and row chain are wired by index.ts.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { attackRollExpr } from "./attack-roll-units";
import { MELEE_REACH_METERS } from "./combat-misc-units";
import { abilityModifierExpr } from "./modifier-units";
import { routeDamageMagnitudeWithRageResist } from "./weapon-attack-units";

export const ATTACK_ACTION_CAPABILITY_SUFFIX = "action/attack";
export const UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX = "attack/unarmed-strike/damage";
export const OPPORTUNITY_ATTACK_ACTION_SUFFIX = "attack/opportunity-attack";
export const UNARMED_STRIKE_DAMAGE_DISPLAY_NAME = "Unarmed Strike: Damage";
export const UNARMED_STRIKE_DAMAGE_DESCRIPTION =
	"Make a melee attack against a creature within 5 feet. On a hit, deal Bludgeoning damage equal to 1 plus your Strength modifier.";
export const UNARMED_STRIKE_REACH_METERS = MELEE_REACH_METERS;

/** Exact actor-owned reach gate; the affordance outer bound is only a candidate scan. */
export function unarmedStrikeRangePredicate(): string {
	return "target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm')";
}

const ATTACK_ACTION_SOURCE =
	"When you take the Attack action, you can make one attack roll with a weapon or an Unarmed Strike.";
const UNARMED_STRIKE_SOURCE =
	"Instead of using a weapon to make a melee attack, you can use a punch, kick, headbutt, or similar forceful blow.";
const UNARMED_STRIKE_DAMAGE_SOURCE =
	"_Damage._ You make an attack roll against the target. Your bonus to the roll equals your Strength modifier plus your Proficiency Bonus. On a hit, the target takes Bludgeoning damage equal to 1 plus your Strength modifier.";
const OPPORTUNITY_ATTACK_SOURCE =
	"You can make an Opportunity Attack when a creature that you can see leaves your reach using its action, its Bonus Action, its Reaction, or one of its speeds. To make the Opportunity Attack, take a Reaction to make one melee attack with a weapon or an Unarmed Strike against the provoking creature.";
const OPPORTUNITY_ATTACK_PLAYING_SOURCE =
	"You can make an Opportunity Attack when a creature that you can see leaves your reach. To make the attack, take a Reaction to make one melee attack with a weapon or an Unarmed Strike against that creature.";

/** Loud-fail guard over every source sentence the authored verb depends on. */
export function assertUnarmedStrikeDamageProvenanceSource(): void {
	const glossary = readFileSync(path.join(CACHE_MARKDOWN_DIR, "rules-glossary.md"), "utf8");
	for (const source of [
		ATTACK_ACTION_SOURCE,
		UNARMED_STRIKE_SOURCE,
		UNARMED_STRIKE_DAMAGE_SOURCE,
	]) {
		if (!glossary.includes(source)) {
			throw new Error(
				`unarmed-strike-units: expected source sentence not found in cached rules-glossary.md: '${source}'`,
			);
		}
	}
}

/** Loud-fail guard over the two cached Opportunity Attack rule locations. */
export function assertOpportunityAttackProvenanceSource(): void {
	const glossary = readFileSync(path.join(CACHE_MARKDOWN_DIR, "rules-glossary.md"), "utf8");
	const playingTheGame = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!glossary.includes(OPPORTUNITY_ATTACK_SOURCE)) {
		throw new Error(
			`unarmed-strike-units: expected Opportunity Attack source not found in cached rules-glossary.md: '${OPPORTUNITY_ATTACK_SOURCE}'`,
		);
	}
	if (!playingTheGame.includes(OPPORTUNITY_ATTACK_PLAYING_SOURCE)) {
		throw new Error(
			`unarmed-strike-units: expected Opportunity Attack source not found in cached playing-the-game.md: '${OPPORTUNITY_ATTACK_PLAYING_SOURCE}'`,
		);
	}
}

/** Strength + the baked per-entity Proficiency Bonus versus the target's effective AC. */
export function unarmedStrikeAttackExpr(
	strengthScoreExpr: string,
	proficiencyBonusExpr: string,
	targetAcExpr: string,
): string {
	return attackRollExpr({
		scoreExpr: strengthScoreExpr,
		acExpr: targetAcExpr,
		circumstantialExpr: proficiencyBonusExpr,
	});
}

/** Monk Martial Arts capability — inlined id avoids playing-the-game ↔ classes cycle. */
export const MARTIAL_ARTS_CAPABILITY_ID = "srd/class-feature/monk/martial-arts";

/** Positive Unarmed Strike damage magnitude, floored at zero by the Damage Rolls rule. */
export function unarmedStrikeDamageExpr(
	strengthScoreExpr: string,
	dexterityScoreExpr: string = "actor.effective('srd/dex')",
): string {
	// pattern: item-sourced-damage
	// → docs/authoring-damage.md + classes.md:5130 Martial Arts Die / Dexterous Attacks
	// L1–4 die is d6 (srd/monk/martial-arts-die-sides seeds 6; variable Nd sides not in DSL).
	// With Martial Arts: 1d6 + better of STR/DEX mods; else 1 + STR mod.
	// Rage Damage +2 while raging (L1–8 band).
	const rageBonus = "cond(actor.status('srd/condition/raging') == true, 2, 0)";
	const strMod = abilityModifierExpr(strengthScoreExpr);
	const dexMod = abilityModifierExpr(dexterityScoreExpr);
	const dieOrOne = `cond(actor.has_capability('${MARTIAL_ARTS_CAPABILITY_ID}'), 1d6, 1)`;
	const ability = `cond(actor.has_capability('${MARTIAL_ARTS_CAPABILITY_ID}'), max((${strMod}), (${dexMod})), (${strMod}))`;
	return `max(0, (${dieOrOne}) + (${ability}) + (${rageBonus}))`;
}

/** Target HP delta for one successful Unarmed Strike Damage consequence.
 * Unarmed Strike is Bludgeoning; Rage B/P/S resistance folds into the ladder
 * (`routeDamageMagnitudeWithRageResist`; classes.md:242).
 */
export function unarmedStrikeDamageDeltaExpr(strengthScoreExpr: string): string {
	const magnitude = unarmedStrikeDamageExpr(strengthScoreExpr);
	return `0 - (${routeDamageMagnitudeWithRageResist(magnitude, "bludgeoning")})`;
}
