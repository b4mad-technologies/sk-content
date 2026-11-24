// Magic Items chapter, slice 2 (sk-609b.13): behaviors expressible today.
//
// - +N armor → always-active AC modifier (Equipment armor posture; finding #37
//   / BL-19 — no wear/attunement gate yet).
// - +N weapon with a base Weapon.json pk → item-sourced damage magnitude
//   including the +N bonus (attack-and-damage item-sourced-facts).
// - Charge pools → resource_definitions + entity_definition_initial_state
//   when the description states "has N charges".
// - Wand of Magic Missiles → resource-spend-with-option-menu debit of 1 charge
//   (spell resolution remains the Spells chapter's Magic Missile identity).
//
// pattern: resource-spend-with-option-menu (wand charges)

import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor, resourceFlavorSlug } from "../../flavor/read";

import { armorByPk } from "../../open5e/armor";
import { weaponByPk } from "../../open5e/weapon";
import {
	readWeaponProperties,
	weaponPropertyAssignmentsByWeapon,
} from "../../open5e/weapon-property";
import { type ChapterSlice, type ChapterUnitSummary, inChapterSlice } from "../chapter-types";
import {
	type WeaponDamageAbilityMode,
	weaponDamageMagnitudeExpr,
	weaponDamageSourceCall,
} from "../equipment/weapon-damage-source-units";
import {
	DAMAGE_TYPE_TAG_PREFIX,
	damageTypeTag,
	SRD_DAMAGE_TYPES,
	weaponPropertyTag,
} from "../equipment/weapon-tag-values";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import {
	CONSUME_CAPABILITY_SEED_LABEL,
	consumeTemplateCalls,
	consumeTemplateIds,
	consumeVerbSeedCalls,
	stripConsumeVerbSeedRows,
} from "../playing-the-game/fragments/consume";
import {
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	DEX_SAVE_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../playing-the-game/resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG } from "../playing-the-game/tag-value-vocabulary";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import { buildMagicItemTagValueUnits } from "./magic-item-tag-values";
import { BUNDLE_ID, buildMagicItemUnits, type MagicItemUnit } from "./magic-item-units";

function magicItemTagSeedCall(): VerbCall {
	const tagDefinitions = [
		...buildMagicItemTagValueUnits(),
		{
			tag: DAMAGE_TYPE_TAG_PREFIX,
			prefix: "srd",
			description: "SRD damage type family (seed for +N magic weapons).",
			sourcePk: "",
		},
		...SRD_DAMAGE_TYPES.map((type) => ({
			tag: damageTypeTag(type),
			prefix: DAMAGE_TYPE_TAG_PREFIX,
			description: `Damage type ${type}.`,
			sourcePk: "",
		})),
	];
	return {
		toolName: "spellkave_write_rows",
		label: "mi-behavior-tag-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: tagDefinitions.map(({ tag, prefix, description }) => ({
				tag,
				prefix,
				bundle_id: BUNDLE_ID,
				description,
			})),
		},
	};
}

export interface MagicItemBehaviorFragment {
	slug: string;
	toml: string;
	summaries: ChapterUnitSummary[];
	patterns: string[];
}

function isShieldArmorPk(armorPk: string): boolean {
	return armorPk.includes("shield");
}

function plusArmorCalls(unit: MagicItemUnit): VerbCall[] {
	if (unit.plusBonus === null || unit.armorPk === null) return [];
	const armor = armorByPk(unit.armorPk);
	const modifierId = `${unit.entityId}/ac_bonus`;
	const bonus = unit.plusBonus;
	// Static armor: FlatSet(base + N). Dex armors / shields: Plus N only —
	// full dex composition stays on the mundane armor row (finding #37).
	const staticFlat = !armor.acAddDexMod && !isShieldArmorPk(unit.armorPk);
	const expression = staticFlat
		? `let bonus = ${armor.acBase + bonus}; bonus`
		: `let bonus = ${bonus}; bonus`;
	const deltaKind = staticFlat ? "FlatSet" : "Plus";
	return [
		{
			toolName: "spellkave_write_rows",
			label: `mi-ac-mod:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_templates",
				rows: [
					{
						bundle_id: BUNDLE_ID,
						modifier_template_id: modifierId,
						display_name: `${unit.displayName} AC`,
						applies_to: AC_RESOURCE_ID,
						modifier_expression_source: expression,
						predicate_source: "",
						priority: 0,
						delta_kind: deltaKind,
						replace_template_id: "",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `mi-ac-mod-tag:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_template_tag",
				rows: [
					{
						modifier_template_id: modifierId,
						bundle_id: BUNDLE_ID,
						tag: "srd.magic_item",
					},
				],
			},
		},
	];
}

function weaponAbilityMode(weaponPk: string, range: number): WeaponDamageAbilityMode {
	const propertiesByPk = new Map(readWeaponProperties().map((p) => [p.pk, p] as const));
	const assignments = weaponPropertyAssignmentsByWeapon(weaponPk);
	const hasFinesse = assignments.some((assignment) => {
		const property = propertiesByPk.get(assignment.propertyPk);
		if (property === undefined) return false;
		return weaponPropertyTag(property.pk, property.type).endsWith(".finesse");
	});
	if (hasFinesse) return "finesse";
	if (range > 0) return "dex";
	return "str";
}

function plusWeaponCalls(unit: MagicItemUnit): VerbCall[] {
	if (unit.plusBonus === null || unit.weaponPk === null) return [];
	const weapon = weaponByPk(unit.weaponPk);
	const abilityMode = weaponAbilityMode(unit.weaponPk, weapon.range);
	const strScoreExpr = `actor.effective('${BUNDLE_ID}/str')`;
	const dexScoreExpr = `actor.effective('${BUNDLE_ID}/dex')`;
	const base = weaponDamageMagnitudeExpr(
		{ diceExpr: weapon.damageDice, damageType: weapon.damageType, abilityMode },
		strScoreExpr,
		dexScoreExpr,
	);
	const magnitude = `(${base}) + ${unit.plusBonus}`;
	return [
		weaponDamageSourceCall(unit.entityId, magnitude, `mi-damage:${unit.slug}`),
		{
			toolName: "spellkave_write_rows",
			label: `mi-damage-type:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "entity_definition_tag",
				rows: [
					{
						entity_def_id: unit.entityId,
						bundle_id: BUNDLE_ID,
						tag: damageTypeTag(weapon.damageType),
					},
				],
			},
		},
	];
}

export function chargeResourceId(unit: MagicItemUnit): string {
	return `${unit.entityId}/charges`;
}

function chargeCalls(unit: MagicItemUnit): VerbCall[] {
	if (unit.chargeCount === null || unit.chargeCount < 1) return [];
	const resourceId = chargeResourceId(unit);
	// spellkave_define_resource prefixes bundle/ onto id.
	const localId = resourceId.startsWith(`${BUNDLE_ID}/`)
		? resourceId.slice(`${BUNDLE_ID}/`.length)
		: resourceId;
	return [
		{
			toolName: "spellkave_define_resource",
			label: `mi-charges:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: localId,
				display_name: `${unit.displayName} Charges`,
				min_value: 0,
				max_value: unit.chargeCount,
				initial_value: unit.chargeCount,
				recovery_rule: "none",
				description: readResourceFlavor(resourceFlavorSlug(localId)).body,
				tags: ["srd.magic_item.charges"],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `mi-charges-seed:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				kind: "entity_definition_initial_state",
				rows: [
					{
						entity_def_id: unit.entityId,
						bundle_id: BUNDLE_ID,
						state_id: resourceId,
						value_int: unit.chargeCount,
						value_bool: false,
						value_text: "",
					},
				],
			},
		},
	];
}

/** Curated wand: spend 1 charge. pattern: resource-spend-with-option-menu */
function wandOfMagicMissilesCalls(unit: MagicItemUnit): VerbCall[] {
	const pool = chargeResourceId(unit);
	return [
		{
			toolName: "spellkave_define_capability",
			label: "mi-wand-mm-cap",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/wand-of-magic-missiles/cast",
				actor_kind: "entity",
				display_name: "Use Wand of Magic Missiles",
				description:
					"Expend charges from a Wand of Magic Missiles to cast Magic Missile " +
					"(magic-items.md; spell identity srd/spell/magic-missile).",
				tags: ["srd.magic_item"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "mi-wand-mm-act",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/wand-of-magic-missiles/cast_l1",
				required_capability: `${BUNDLE_ID}/magic_item/wand-of-magic-missiles/cast`,
				niche_id: "creature",
				display_name: "Wand of Magic Missiles (1 charge)",
				description:
					"Spend 1 charge to cast Magic Missile at 1st level. " +
					"Charge debit only this slice — spell resolution reuses the Spells chapter.",
				predicate_source: `actor.stat('${pool}') >= 1`,
				self_eligible: true,
				self_only: true,
				consequence: {
					description: "Debit one wand charge.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: pool,
								delta_source: "-1",
							},
						},
					],
				},
			},
		},
	];
}

/** Curated wand: spend 1 charge to cast Fireball. pattern: resource-spend-with-option-menu */
function wandOfFireballsCalls(unit: MagicItemUnit): VerbCall[] {
	const pool = chargeResourceId(unit);
	return [
		{
			toolName: "spellkave_define_capability",
			label: "mi-wand-fb-cap",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/wand-of-fireballs/cast",
				actor_kind: "entity",
				display_name: "Use Wand of Fireballs",
				description:
					"Expend charges from a Wand of Fireballs to cast Fireball " +
					"(magic-items.md; spell identity srd/spell/fireball).",
				tags: ["srd.magic_item"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "mi-wand-fb-act",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/wand-of-fireballs/cast_l3",
				required_capability: `${BUNDLE_ID}/magic_item/wand-of-fireballs/cast`,
				niche_id: "creature",
				display_name: "Wand of Fireballs (1 charge)",
				description:
					"Spend 1 charge to cast Fireball at 3rd level. " +
					"Charge debit only this slice — spell resolution reuses the Spells chapter.",
				predicate_source: `actor.stat('${pool}') >= 1`,
				self_eligible: true,
				self_only: true,
				consequence: {
					description: "Debit one wand charge.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: pool,
								delta_source: "-1",
							},
						},
					],
				},
			},
		},
	];
}

// pattern: consumable-inventory-consume
function potionOfClimbingCalls(unit: MagicItemUnit): VerbCall[] {
	return [
		...consumeVerbSeedCalls(),
		{
			toolName: "spellkave_define_condition",
			label: "mi-potion-climbing-cond",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/magic_item/potion-of-climbing",
				display_name: "Potion of Climbing",
				gate_predicate_source: "1 == 1",
				description:
					"Gain Climb Speed equal to Speed and Advantage on Strength (Athletics) checks to climb for 1 hour (magic-items.md § Potion of Climbing).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "mi-potion-climbing-effect",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/potion-of-climbing/consume/success",
				description: "Apply Potion of Climbing condition.",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: `${BUNDLE_ID}/condition/magic_item/potion-of-climbing`,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: unit.entityId,
			displayName: "Drink Potion of Climbing",
			effectConsequenceId: `${unit.entityId}/consume/success`,
		}),
	];
}

// pattern: consumable-inventory-consume
function potionOfWaterBreathingCalls(unit: MagicItemUnit): VerbCall[] {
	return [
		...consumeVerbSeedCalls(),
		{
			toolName: "spellkave_define_condition",
			label: "mi-potion-water-breathing-cond",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/magic_item/potion-of-water-breathing",
				display_name: "Potion of Water Breathing",
				gate_predicate_source: "1 == 1",
				description:
					"Breathe underwater for 24 hours (magic-items.md § Potion of Water Breathing).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "mi-potion-water-breathing-effect",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/potion-of-water-breathing/consume/success",
				description: "Apply Potion of Water Breathing condition.",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: `${BUNDLE_ID}/condition/magic_item/potion-of-water-breathing`,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: unit.entityId,
			displayName: "Drink Potion of Water Breathing",
			effectConsequenceId: `${unit.entityId}/consume/success`,
		}),
	];
}

// pattern: consumable-inventory-consume
function potionOfHeroismCalls(unit: MagicItemUnit): VerbCall[] {
	return [
		...consumeVerbSeedCalls(),
		{
			toolName: "spellkave_write_rows",
			label: "mi-potion-heroism-target-seed",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID),
					resolutionScopeModifierTargetRow(DEX_SAVE_RESOLUTION_SCOPE_ID),
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "mi-potion-heroism-cond",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/magic_item/potion-of-heroism",
				display_name: "Potion of Heroism",
				gate_predicate_source: "1 == 1",
				description:
					"Gain 10 Temporary Hit Points and the Bless spell effect (+1d4 on attack rolls and saving throws) for 1 hour (magic-items.md § Potion of Heroism).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifier_template_id: `${BUNDLE_ID}/condition/magic_item/potion-of-heroism/mod_attack_roll`,
				modifiers: [
					{
						id: "condition/magic_item/potion-of-heroism/mod_attack_roll",
						display_name: "Potion of Heroism Attack Roll 1d4",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let bonus = 1d4; bonus",
						delta_kind: "Plus",
					},
					{
						id: "condition/magic_item/potion-of-heroism/mod_dex_save",
						display_name: "Potion of Heroism Dex Save 1d4",
						applies_to: DEX_SAVE_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let bonus = 1d4; bonus",
						delta_kind: "Plus",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "mi-potion-heroism-effect",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/potion-of-heroism/consume/success",
				description: "Grant 10 Temp HP, and apply Potion of Heroism condition.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: `${BUNDLE_ID}/temp_hp`,
							delta_source: "max(0, 10 - actor.stat('srd/temp_hp'))",
						},
					},
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: `${BUNDLE_ID}/condition/magic_item/potion-of-heroism`,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: unit.entityId,
			displayName: "Drink Potion of Heroism",
			effectConsequenceId: `${unit.entityId}/consume/success`,
		}),
	];
}

// pattern: consumable-inventory-consume
function potionOfResistanceCalls(unit: MagicItemUnit): VerbCall[] {
	return [
		...consumeVerbSeedCalls(),
		{
			toolName: "spellkave_define_condition",
			label: "mi-potion-resistance-cond",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/magic_item/potion-of-resistance",
				display_name: "Potion of Resistance",
				gate_predicate_source: "1 == 1",
				description:
					"Resistance to one damage type for 1 hour (magic-items.md § Potion of Resistance).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "mi-potion-resistance-effect",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/potion-of-resistance/consume/success",
				description: "Apply Potion of Resistance condition.",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: `${BUNDLE_ID}/condition/magic_item/potion-of-resistance`,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: unit.entityId,
			displayName: "Drink Potion of Resistance",
			effectConsequenceId: `${unit.entityId}/consume/success`,
		}),
	];
}

// pattern: consumable-inventory-consume
function potionOfSpeedCalls(unit: MagicItemUnit): VerbCall[] {
	return [
		...consumeVerbSeedCalls(),
		{
			toolName: "spellkave_write_rows",
			label: "mi-potion-speed-target-seed",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(DEX_SAVE_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "mi-potion-speed-cond",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/magic_item/potion-of-speed",
				display_name: "Potion of Speed",
				gate_predicate_source: "1 == 1",
				description:
					"Gain the effect of Haste (+2 AC, Advantage on Dex saves, doubled Speed) for 1 minute without lethargy (magic-items.md § Potion of Speed).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifier_template_id: `${BUNDLE_ID}/condition/magic_item/potion-of-speed/mod_ac`,
				modifiers: [
					{
						id: "condition/magic_item/potion-of-speed/mod_ac",
						display_name: "Potion of Speed AC +2",
						applies_to: AC_RESOURCE_ID,
						modifier_expression_source: "let bonus = 2; bonus",
						delta_kind: "Plus",
					},
					{
						id: "condition/magic_item/potion-of-speed/mod_dex_save",
						display_name: "Potion of Speed Dex Save Advantage",
						applies_to: DEX_SAVE_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "mi-potion-speed-effect",
			params: {
				bundle: BUNDLE_ID,
				id: "magic_item/potion-of-speed/consume/success",
				description: "Apply Potion of Speed condition.",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: `${BUNDLE_ID}/condition/magic_item/potion-of-speed`,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: unit.entityId,
			displayName: "Drink Potion of Speed",
			effectConsequenceId: `${unit.entityId}/consume/success`,
		}),
	];
}

/** Expressible potion slugs in MagicItem.json (category 'potion'). */
export const EXPRESSIBLE_POTION_SLUGS = new Set([
	"potion-of-climbing",
	"potion-of-heroism",
	"potion-of-resistance",
	"potion-of-speed",
	"potion-of-water-breathing",
]);

/** Charge pools authored only for curated charged items (not every description hit). */
const CHARGE_POOL_SLUGS = new Set(["wand-of-magic-missiles", "wand-of-fireballs"]);

function behaviorCallsFor(unit: MagicItemUnit): VerbCall[] {
	const calls: VerbCall[] = [];
	if (unit.category === "armor" && unit.plusBonus !== null && unit.armorPk !== null) {
		calls.push(...plusArmorCalls(unit));
	}
	if (unit.category === "weapon" && unit.plusBonus !== null && unit.weaponPk !== null) {
		calls.push(...plusWeaponCalls(unit));
	}
	if (unit.chargeCount !== null && CHARGE_POOL_SLUGS.has(unit.slug)) {
		calls.push(...chargeCalls(unit));
	}
	if (unit.slug === "wand-of-magic-missiles") {
		calls.push(...wandOfMagicMissilesCalls(unit));
	}
	if (unit.slug === "wand-of-fireballs") {
		calls.push(...wandOfFireballsCalls(unit));
	}
	if (unit.slug === "potion-of-climbing") {
		calls.push(...potionOfClimbingCalls(unit));
	}
	if (unit.slug === "potion-of-water-breathing") {
		calls.push(...potionOfWaterBreathingCalls(unit));
	}
	if (unit.slug === "potion-of-heroism") {
		calls.push(...potionOfHeroismCalls(unit));
	}
	if (unit.slug === "potion-of-resistance") {
		calls.push(...potionOfResistanceCalls(unit));
	}
	if (unit.slug === "potion-of-speed") {
		calls.push(...potionOfSpeedCalls(unit));
	}
	return calls;
}

function patternsFor(unit: MagicItemUnit): string[] {
	const patterns: string[] = [];
	if (unit.slug === "wand-of-magic-missiles" || unit.slug === "wand-of-fireballs") {
		patterns.push("resource-spend-with-option-menu");
	}
	if (EXPRESSIBLE_POTION_SLUGS.has(unit.slug)) {
		patterns.push("consumable-inventory-consume");
	}
	return patterns;
}

/**
 * Build behavior TOML fragments keyed by magic-item slug. Identity-only items
 * are omitted.
 */
async function renderOneBehavior(
	unit: MagicItemUnit,
	target: AuthorTarget | undefined,
): Promise<MagicItemBehaviorFragment> {
	const calls = behaviorCallsFor(unit);
	const sceneCalls: VerbCall[] = [
		magicItemTagSeedCall(),
		{
			toolName: "spellkave_define_entity_type",
			label: `seed:${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `magic_item/${unit.slug}`,
				display_name: unit.displayName,
				description: unit.description,
				tags: unit.tags,
			},
		},
		...calls,
	];
	const seedsConsume = calls.some((call) => call.label === CONSUME_CAPABILITY_SEED_LABEL);
	const rendered = await driveUnitScene(BUNDLE_ID, sceneCalls, target, {
		// Potion scenes seed srd/action/consume, the srd/consumable niche, the
		// shared consequence and the srd/consume action only to validate; the
		// real rows ship from playing-the-game/fragments/consume.ts.
		...(seedsConsume ? { omitRowKinds: ["capability_definitions"] } : {}),
	});
	const body = seedsConsume ? stripConsumeVerbSeedRows(rendered) : rendered;
	// Drop seed-only rows (entity identity, its membership tags, tag catalog).
	// Keep modifier / item_dsl_source / resource / damage-type tag / wand rows.
	const withoutSeedEntity = body
		.split(/(?=^\[\[)/m)
		.filter((block) => {
			const head = block.split("\n", 1)[0] ?? "";
			if (head === "[[entity_definitions]]") return false;
			if (head === "[[tag_value_definitions]]") return false;
			if (head === "[[entity_definition_tag]]") {
				return block.includes('tag = "srd.damage_type.');
			}
			return block.trim().length > 0;
		})
		.join("");
	const patterns = patternsFor(unit);
	const patternHeader =
		patterns.length > 0 ? `${patterns.map((p) => `# pattern: ${p}`).join("\n")}\n` : "";
	return {
		slug: unit.slug,
		toml: (patternHeader + withoutSeedEntity).replace(/\n+$/, "\n"),
		patterns,
		summaries: [
			...(unit.plusBonus !== null && unit.category === "armor" && unit.armorPk !== null
				? [
						{
							kind: "modifier_templates",
							id: `${unit.entityId}/ac_bonus`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.plusBonus !== null && unit.category === "weapon" && unit.weaponPk !== null
				? [
						{
							kind: "entity_definition_item_dsl_source",
							id: unit.entityId,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.chargeCount !== null && CHARGE_POOL_SLUGS.has(unit.slug)
				? [
						{
							kind: "resource_definitions",
							id: chargeResourceId(unit),
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.slug === "wand-of-magic-missiles"
				? [
						{
							kind: "capability_definitions",
							id: `${BUNDLE_ID}/magic_item/wand-of-magic-missiles/cast`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "action_definitions",
							id: `${BUNDLE_ID}/magic_item/wand-of-magic-missiles/cast_l1`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.slug === "wand-of-fireballs"
				? [
						{
							kind: "capability_definitions",
							id: `${BUNDLE_ID}/magic_item/wand-of-fireballs/cast`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "action_definitions",
							id: `${BUNDLE_ID}/magic_item/wand-of-fireballs/cast_l3`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(EXPRESSIBLE_POTION_SLUGS.has(unit.slug)
				? [
						{
							kind: "consequence_templates",
							id: `${unit.entityId}/consume/success`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "affordance_templates",
							id: consumeTemplateIds(unit.entityId).affordanceTemplateId,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "condition_definitions",
							id: `${BUNDLE_ID}/condition/magic_item/${unit.slug}`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.slug === "potion-of-speed"
				? [
						{
							kind: "modifier_templates",
							id: `${BUNDLE_ID}/condition/magic_item/potion-of-speed/mod_ac`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "modifier_templates",
							id: `${BUNDLE_ID}/condition/magic_item/potion-of-speed/mod_dex_save`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
			...(unit.slug === "potion-of-heroism"
				? [
						{
							kind: "modifier_templates",
							id: `${BUNDLE_ID}/condition/magic_item/potion-of-heroism/mod_attack_roll`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
						{
							kind: "modifier_templates",
							id: `${BUNDLE_ID}/condition/magic_item/potion-of-heroism/mod_dex_save`,
							sourcePk: unit.sourcePk,
						} satisfies ChapterUnitSummary,
					]
				: []),
		],
	};
}

/**
 * `slice` narrows by the item's index in the FULL `buildMagicItemUnits()`
 * list (the same list `generateMagicItems` slices its identity batch from),
 * not by index within the behavior-bearing subset — so a given item lands in
 * the same sub-unit for both its identity row and its behavior fragment.
 */
export async function buildMagicItemBehaviorFragments(
	target: AuthorTarget | undefined,
	slice?: ChapterSlice,
): Promise<Map<string, MagicItemBehaviorFragment>> {
	const out = new Map<string, MagicItemBehaviorFragment>();
	const units = buildMagicItemUnits()
		.filter((_, i) => inChapterSlice(i, slice))
		.filter((unit) => behaviorCallsFor(unit).length > 0);
	const CONCURRENCY = 12;
	for (let i = 0; i < units.length; i += CONCURRENCY) {
		const batch = units.slice(i, i + CONCURRENCY);
		const rendered = await Promise.all(batch.map((unit) => renderOneBehavior(unit, target)));
		for (const fragment of rendered) out.set(fragment.slug, fragment);
	}
	return out;
}

/** Counts for coverage assertions. */
export function magicItemBehaviorCounts(): {
	plusArmor: number;
	plusWeapon: number;
	withChargePool: number;
	wandMagicMissiles: boolean;
	wandFireballs: boolean;
	expressiblePotions: number;
} {
	const units = buildMagicItemUnits();
	return {
		plusArmor: units.filter(
			(u) => u.category === "armor" && u.plusBonus !== null && u.armorPk !== null,
		).length,
		plusWeapon: units.filter(
			(u) => u.category === "weapon" && u.plusBonus !== null && u.weaponPk !== null,
		).length,
		withChargePool: units.filter((u) => u.chargeCount !== null && CHARGE_POOL_SLUGS.has(u.slug))
			.length,
		wandMagicMissiles: units.some((u) => u.slug === "wand-of-magic-missiles"),
		wandFireballs: units.some((u) => u.slug === "wand-of-fireballs"),
		expressiblePotions: units.filter((u) => EXPRESSIBLE_POTION_SLUGS.has(u.slug)).length,
	};
}
