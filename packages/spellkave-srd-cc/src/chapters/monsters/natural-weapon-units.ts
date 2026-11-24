// DOC-IMPL: attack-and-damage#natural-weapons-are-wielded-items
// pattern: multiattack-ordinals
// Natural-weapon items (probe sk-84i.1, bead sk-84i; generalized L7 bestiary
// CR 0–4): a monster's Bite/Slam/Rend/… re-modeled as a WIELDED ITEM so the
// shared `srd/attack/melee` or `srd/attack/ranged` sources damage (and range)
// from the item. Per-creature content ships from the owner's
// `base/monsters/<slug>.toml` via `monsters/index.ts`.
//
// FINESSE is PER-CREATURE, derived by `bestiary-plan.ts` (damage bonus and
// to-hit vs STR/DEX mods + PB) — never assumed.

import { MAIN_HAND_SLOT_LOCAL_ID } from "../equipment/armor-units";
import {
	type WeaponDamageAbilityMode,
	type WeaponDamageSourceUnit,
	weaponAttackRangeSourceCall,
	weaponDamageMagnitudeExpr,
	weaponDamageSourceCall,
} from "../equipment/weapon-damage-source-units";
import {
	damageTypeTag,
	WEAPON_RANGE_TAG_PREFIX,
	weaponFinessePropertyTag,
} from "../equipment/weapon-tag-values";
import type { VerbCall } from "../verb-runner";
import type { AbilityMode, PlannedAttack } from "./bestiary-plan";

const BUNDLE_ID = "srd";
const WEAPON_TAG = "srd.weapon";
const MELEE_WEAPON_TAG = `${WEAPON_RANGE_TAG_PREFIX}.melee`;
const RANGED_WEAPON_TAG = `${WEAPON_RANGE_TAG_PREFIX}.ranged`;

export interface NaturalWeaponUnit {
	slug: string;
	entityId: string;
	displayName: string;
	description: string;
	/** Bare DSL dice literal, e.g. `"1d6"`. */
	diceExpr: string;
	damageType: string;
	/** Tag finesse so the shared archetype selects max(STR, DEX). */
	finesse?: boolean;
	/** Non-finesse ranged natural weapons read DEX for damage. */
	abilityMode?: WeaponDamageAbilityMode;
	/** The stat block's own damage bonus, when no ability of the creature
	 * reproduces it; replaces the ability read in the damage source. With it,
	 * a Finesse tag on the item is the TO-HIT carrier only (the attack
	 * archetype reads max(STR, DEX) for a Finesse item): the damage half of
	 * Finesse is overridden here on purpose, because the block's damage is no
	 * ability read at all (Specter Life Drain: +4 to hit from Dexterity,
	 * "7 (2d6)" damage). */
	literalDamageBonus?: number;
	/** When set, also author `srd/attack_range_mm` and the ranged range tag. */
	rangeFeet?: number;
}

export const WOLF_BITE_ENTITY_ID = `${BUNDLE_ID}/natural-weapon/wolf-bite`;
export const ZOMBIE_SLAM_ENTITY_ID = `${BUNDLE_ID}/natural-weapon/zombie-slam`;
export const GIANT_RAT_BITE_ENTITY_ID = `${BUNDLE_ID}/natural-weapon/giant-rat-bite`;
/** L7 live representative — Giant Spider Bite (CR 1). */
export const GIANT_SPIDER_BITE_ENTITY_ID = `${BUNDLE_ID}/natural-weapon/giant-spider-bite`;

export function naturalWeaponEntityId(naturalWeaponSlug: string): string {
	return `${BUNDLE_ID}/natural-weapon/${naturalWeaponSlug}`;
}

/** Build a NaturalWeaponUnit from a bestiary plan's equipped attack. */
export function naturalWeaponFromPlan(
	creatureSlug: string,
	creatureDisplayName: string,
	naturalWeaponSlug: string,
	attack: PlannedAttack,
	abilityMode: AbilityMode,
	literalDamageBonus: number | null = null,
): NaturalWeaponUnit {
	const ranged = !attack.melee;
	return {
		slug: naturalWeaponSlug,
		entityId: naturalWeaponEntityId(naturalWeaponSlug),
		displayName: `${creatureDisplayName} ${attack.displayName}`,
		description: `${creatureDisplayName} ${attack.displayName} — a natural ${ranged ? "ranged" : "melee"} weapon.`,
		diceExpr: attack.diceExpr,
		damageType: attack.damageType,
		finesse: abilityMode === "finesse",
		abilityMode: abilityMode === "finesse" ? "finesse" : abilityMode,
		rangeFeet: attack.rangeFeet ?? undefined,
		...(literalDamageBonus === null ? {} : { literalDamageBonus }),
	};
}

function weaponTagSeedCall(damageTypeTagValue: string, ranged: boolean): VerbCall {
	const rows: Record<string, unknown>[] = [
		{
			tag: WEAPON_TAG,
			prefix: "srd",
			bundle_id: BUNDLE_ID,
			description: "Identifies an entity definition as an SRD weapon.",
		},
		{
			tag: weaponFinessePropertyTag(),
			prefix: "srd",
			bundle_id: BUNDLE_ID,
			description: "Identifies an entity definition as carrying the SRD Finesse weapon property.",
		},
		{
			tag: ranged ? RANGED_WEAPON_TAG : MELEE_WEAPON_TAG,
			prefix: WEAPON_RANGE_TAG_PREFIX,
			bundle_id: BUNDLE_ID,
			description: ranged
				? "Identifies a weapon as a ranged weapon."
				: "Identifies a weapon as a melee weapon.",
		},
		{
			tag: damageTypeTagValue,
			prefix: "srd",
			bundle_id: BUNDLE_ID,
			description:
				"Identifies a weapon-like item's own srd/damage slot as dealing this SRD physical " +
				"damage type (documentary only).",
		},
	];
	return {
		toolName: "spellkave_write_rows",
		label: "natural-weapon-tag-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows,
		},
	};
}

/**
 * One natural-weapon item's define + damage (+ optional range) slot calls.
 */
export function naturalWeaponCalls(
	unit: NaturalWeaponUnit,
	strScoreExpr: string,
	dexScoreExpr: string,
): VerbCall[] {
	const localId = unit.entityId.startsWith(`${BUNDLE_ID}/`)
		? unit.entityId.slice(BUNDLE_ID.length + 1)
		: unit.entityId;
	const damageTypeTagValue = damageTypeTag(unit.damageType);
	const ranged = unit.rangeFeet !== undefined;
	const mode: WeaponDamageAbilityMode =
		unit.abilityMode ?? (unit.finesse === true ? "finesse" : ranged ? "dex" : "str");
	const damageSourceUnit: WeaponDamageSourceUnit = {
		diceExpr: unit.diceExpr,
		damageType: unit.damageType,
		abilityMode: mode,
	};
	const tags = [
		"srd.item",
		WEAPON_TAG,
		ranged ? RANGED_WEAPON_TAG : MELEE_WEAPON_TAG,
		damageTypeTagValue,
	];
	if (unit.finesse === true || mode === "finesse") {
		tags.push(weaponFinessePropertyTag());
	}
	const calls: VerbCall[] = [
		weaponTagSeedCall(damageTypeTagValue, ranged),
		{
			toolName: "spellkave_define_entity_type",
			label: `entity:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: localId,
				display_name: unit.displayName,
				description: unit.description,
				slot_compatibility_predicate: `slot_id == "${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}"`,
				tags,
			},
		},
		weaponDamageSourceCall(
			unit.entityId,
			unit.literalDamageBonus === undefined
				? weaponDamageMagnitudeExpr(damageSourceUnit, strScoreExpr, dexScoreExpr)
				: `${unit.diceExpr} + (${unit.literalDamageBonus})`,
			`${unit.slug}-damage-source`,
		),
	];
	if (unit.rangeFeet !== undefined) {
		calls.push(
			weaponAttackRangeSourceCall(unit.entityId, unit.rangeFeet, `${unit.slug}-attack-range`),
		);
	}
	return calls;
}
