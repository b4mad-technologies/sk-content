// DOC-IMPL: attack-and-damage#weapon-admitted-variants-and-item-sourced-facts
// Weapon-sourced damage, AUTHORED-SLOT form (operator ruling, 2026-08-13,
// retiring probe sk-84i.1's roll-table `srd/damage_profile` idiom —
// `weapon-damage-profile-units.ts`'s own former module header has the full
// retired-idiom history). A weapon-like item carries the positive damage
// magnitude — its own die PLUS the ability modifier — as ONE
// `[[entity_definition_item_dsl_source]]` row under the shared `srd/damage`
// slot (`dsl-grammar.md`'s `DslSource`/`.source(...)` node, `Int`-typed).
// Type routing lives on `srd/attack/melee` and `srd/attack/ranged`
// (`playing-the-game/weapon-attack-units.ts`), which read
// `actor.wielded_item.source('srd/damage')` and the item's
// `srd.damage_type.<type>` tag.
//
// SCOPE: the FULL 38-weapon manufactured catalog ships `srd/damage` slots
// beside each definition in `equipment/index.ts`'s per-weapon fragments
// (sk-hml / MF-VAL-268 — every srd.weapon-tagged def needs the slot). Natural weapons
// (wolf/zombie/giant-rat bite) ship from `monsters/natural-weapon-units.ts`
// through this file's shared `weaponDamageMagnitudeExpr`/
// `weaponDamageSourceCall` builders so both chapters compose the identical
// expression shape.
import { abilityModifierExpr } from "../playing-the-game/modifier-units";
import type { VerbCall } from "../verb-runner";

const BUNDLE_ID = "srd";

/**
 * The `entity_definition_item_dsl_source` slot every weapon-like item's own
 * damage magnitude ships under — read via
 * `actor.wielded_item.source('srd/damage')`
 * (`playing-the-game/weapon-attack-units.ts`'s guarded wielded-item branch).
 */
export const WEAPON_DAMAGE_SLOT_ID = "srd/damage";
/** Normal attack reach/range in millimetres for the equipped weapon. */
export const WEAPON_ATTACK_RANGE_SLOT_ID = "srd/attack_range_mm";

/** Exact international-foot conversion. SRD ranges are authored in feet;
 * the interaction kernel compares millimetres. Thus a normal 5-foot melee
 * reach is stored as the literal `1524` (`5 × 304.8`). */
const MILLIMETRES_PER_FOOT = 304.8;

export function feetToMillimetres(feet: number): number {
	if (!Number.isFinite(feet) || feet <= 0) {
		throw new Error(`weapon-damage-source-units: attack range must be positive, got ${feet}.`);
	}
	return Math.round(feet * MILLIMETRES_PER_FOOT);
}

/**
 * Which ability score(s) a weapon-like item's own damage bonus draws from —
 * derived from its `srd.weapon.property.finesse` tag (a manufactured
 * weapon's own property assignments) or, for a natural weapon, the
 * per-creature finesse flag `monsters/natural-weapon-units.ts` already
 * tracks. Never guessed: `"finesse"` selects the higher of Strength/
 * Dexterity, `"dex"` is a non-Finesse ranged item, `"str"` is a non-Finesse
 * melee item (including every natural weapon but the Giant Rat's Bite).
 */
export type WeaponDamageAbilityMode = "str" | "dex" | "finesse";

/** One weapon-like item's own damage-magnitude ingredients. */
export interface WeaponDamageSourceUnit {
	diceExpr: string;
	damageType: string;
	abilityMode: WeaponDamageAbilityMode;
}

/**
 * `<die> + <modExpr>` — the positive magnitude a weapon-like item's own
 * `srd/damage` slot carries. Type routing is hoisted onto the shared attack
 * write. `modExpr` is the SAME floor-corrected ability-modifier
 * expression the attack archetype generator emits today
 * (`weapon-attack-units.ts`'s `attackAbilityScoreExpr`/`abilityModifierExpr`
 * composition, `abilityModifierExpr(max(str, dex)) == max(abilityModifierExpr(str),
 * abilityModifierExpr(dex))` per that module's own monotonicity note) —
 * `max(strMod, dexMod)` for a Finesse item, plain Dexterity for a non-Finesse
 * ranged item, plain Strength for a non-Finesse melee item — never
 * re-derived by a caller.
 */
export function weaponDamageMagnitudeExpr(
	unit: WeaponDamageSourceUnit,
	strScoreExpr: string,
	dexScoreExpr: string,
): string {
	const strMod = abilityModifierExpr(strScoreExpr);
	const dexMod = abilityModifierExpr(dexScoreExpr);
	const modifierExpr =
		unit.abilityMode === "finesse"
			? `max(${strMod}, ${dexMod})`
			: unit.abilityMode === "dex"
				? dexMod
				: strMod;
	return `${unit.diceExpr} + (${modifierExpr})`;
}

/**
 * One weapon-like item's own `srd/damage` slot row
 * (`entity_definition_item_dsl_source`, upsert-by-`(entity_def_id, slot)` —
 * co-located with the item's own `entity_definitions` row in the generated
 * per-weapon aggregate). No registered
 * natural key for this row kind today, same as the retired idiom's own
 * `entity_definition_initial_state` pointer — safe here because each
 * generate run authors this row exactly once per entity, never re-authored
 * within one throwaway workspace.
 */
export function weaponDamageSourceCall(
	entityDefId: string,
	source: string,
	label: string,
): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label,
		params: {
			bundle: BUNDLE_ID,
			kind: "entity_definition_item_dsl_source",
			rows: [
				{
					entity_def_id: entityDefId,
					bundle_id: BUNDLE_ID,
					slot: WEAPON_DAMAGE_SLOT_ID,
					source,
				},
			],
		},
	};
}

/** One weapon-like item's source-backed normal attack reach/range. */
export function weaponAttackRangeSourceCall(
	entityDefId: string,
	rangeFeet: number,
	label: string,
): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label,
		params: {
			bundle: BUNDLE_ID,
			kind: "entity_definition_item_dsl_source",
			rows: [
				{
					entity_def_id: entityDefId,
					bundle_id: BUNDLE_ID,
					slot: WEAPON_ATTACK_RANGE_SLOT_ID,
					source: String(feetToMillimetres(rangeFeet)),
				},
			],
		},
	};
}
