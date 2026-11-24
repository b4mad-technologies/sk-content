// Item cost/weight (and armor number) identity — sk-jay0.3.5.62.
// Seeded as entity_definition_initial_state on equipment the chapter already
// emits. Cost is copper pieces (Item.json GP * 100); weight is tenths of a
// pound (Item.json lb * 10). Armor numbers reuse Armor.json fields already
// on ArmorUnit — they are not the wearer's srd/ac.

import { readResourceFlavor } from "../../flavor/read";
import { itemByPk } from "../../open5e/item";
import type { VerbCall } from "../verb-runner";
import type { ArmorUnit } from "./armor-units";

export const BUNDLE_ID = "srd";

export const COST_CP_RESOURCE_LOCAL_ID = "cost_cp";
export const WEIGHT_LB10_RESOURCE_LOCAL_ID = "weight_lb10";
export const ARMOR_AC_BASE_RESOURCE_LOCAL_ID = "armor_ac_base";
export const ARMOR_DEX_CAP_RESOURCE_LOCAL_ID = "armor_dex_cap";
export const ARMOR_STR_REQUIRED_RESOURCE_LOCAL_ID = "armor_str_required";
export const ARMOR_STEALTH_DISADVANTAGE_RESOURCE_LOCAL_ID = "armor_stealth_disadvantage";

export const COST_CP_RESOURCE_ID = `${BUNDLE_ID}/${COST_CP_RESOURCE_LOCAL_ID}`;
export const WEIGHT_LB10_RESOURCE_ID = `${BUNDLE_ID}/${WEIGHT_LB10_RESOURCE_LOCAL_ID}`;
export const ARMOR_AC_BASE_RESOURCE_ID = `${BUNDLE_ID}/${ARMOR_AC_BASE_RESOURCE_LOCAL_ID}`;
export const ARMOR_DEX_CAP_RESOURCE_ID = `${BUNDLE_ID}/${ARMOR_DEX_CAP_RESOURCE_LOCAL_ID}`;
export const ARMOR_STR_REQUIRED_RESOURCE_ID = `${BUNDLE_ID}/${ARMOR_STR_REQUIRED_RESOURCE_LOCAL_ID}`;
export const ARMOR_STEALTH_DISADVANTAGE_RESOURCE_ID = `${BUNDLE_ID}/${ARMOR_STEALTH_DISADVANTAGE_RESOURCE_LOCAL_ID}`;

/** 40000 GP plate-adjacent ceiling in copper (Item.json max 40000.00). */
export const COST_CP_MAX = 10_000_000;
/** 600 lb in tenths (Item.json max 600.000). */
export const WEIGHT_LB10_MAX = 10_000;

export interface InitialStateSeed {
	state: string;
	value_int: number;
}

export function costCpFromGpString(cost: string): number {
	const gp = Number.parseFloat(cost);
	if (!Number.isFinite(gp) || gp < 0) {
		throw new Error(`item-measures: cost '${cost}' is not a non-negative GP amount.`);
	}
	return Math.round(gp * 100);
}

export function weightTenthsFromLbString(weight: string): number {
	const lb = Number.parseFloat(weight);
	if (!Number.isFinite(lb) || lb < 0) {
		throw new Error(`item-measures: weight '${weight}' is not a non-negative pound amount.`);
	}
	return Math.round(lb * 10);
}

export function costWeightInitialStates(itemPk: string): InitialStateSeed[] {
	const item = itemByPk(itemPk);
	return [
		{ state: COST_CP_RESOURCE_ID, value_int: costCpFromGpString(item.cost) },
		{ state: WEIGHT_LB10_RESOURCE_ID, value_int: weightTenthsFromLbString(item.weight) },
	];
}

export function armorNumberInitialStates(unit: ArmorUnit): InitialStateSeed[] {
	const states: InitialStateSeed[] = [
		{ state: ARMOR_AC_BASE_RESOURCE_ID, value_int: unit.acBase },
		{
			state: ARMOR_STEALTH_DISADVANTAGE_RESOURCE_ID,
			value_int: unit.grantsStealthDisadvantage ? 1 : 0,
		},
	];
	if (unit.acCapDexMod !== null) {
		states.push({ state: ARMOR_DEX_CAP_RESOURCE_ID, value_int: unit.acCapDexMod });
	}
	if (unit.strengthScoreRequired !== null) {
		states.push({ state: ARMOR_STR_REQUIRED_RESOURCE_ID, value_int: unit.strengthScoreRequired });
	}
	return states;
}

function resourceCall(
	id: string,
	displayName: string,
	maxValue: number,
	flavorSlug: string,
): VerbCall {
	return {
		toolName: "spellkave_define_resource",
		label: `resource:${id}`,
		params: {
			id,
			display_name: displayName,
			min_value: 0,
			max_value: maxValue,
			initial_value: 0,
			recovery_rule: "persistent",
			description: readResourceFlavor(flavorSlug).body,
			tags: [],
		},
	};
}

/** Canonical resource rows (item-measures.toml) and in-scene validation seeds. */
export function itemMeasureResourceCalls(): VerbCall[] {
	return [
		resourceCall(COST_CP_RESOURCE_LOCAL_ID, "Cost (copper)", COST_CP_MAX, "cost-cp"),
		resourceCall(
			WEIGHT_LB10_RESOURCE_LOCAL_ID,
			"Weight (tenths of a pound)",
			WEIGHT_LB10_MAX,
			"weight-lb10",
		),
		resourceCall(ARMOR_AC_BASE_RESOURCE_LOCAL_ID, "Armor AC base", 30, "armor-ac-base"),
		resourceCall(ARMOR_DEX_CAP_RESOURCE_LOCAL_ID, "Armor Dexterity cap", 10, "armor-dex-cap"),
		resourceCall(
			ARMOR_STR_REQUIRED_RESOURCE_LOCAL_ID,
			"Armor Strength required",
			30,
			"armor-str-required",
		),
		resourceCall(
			ARMOR_STEALTH_DISADVANTAGE_RESOURCE_LOCAL_ID,
			"Armor stealth disadvantage",
			1,
			"armor-stealth-disadvantage",
		),
	];
}
