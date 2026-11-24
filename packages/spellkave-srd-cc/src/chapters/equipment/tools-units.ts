// Equipment tool identity units. Source fields come from cache/open5e/Item.json;
// the rule-facing details are pinned to cache/markdown/equipment.md so the
// generated description remains useful to a player/DM without importing the
// source prose into runtime logic.
//
// Calligrapher's Supplies and Gaming Set (Dice) below are net-new (2026-07-31,
// `ledger/character-origins.md`'s O1 slice): the two tool INSTANCES the
// Character Origins chapter's Backgrounds need (Acolyte/Sage's Tool
// Proficiency; Soldier's "Choose one kind of Gaming Set", concrete authorial
// pick: Dice — `cache/markdown/character-origins.md:62`), authored HERE
// (not in `character-origins/`) after this file's own thieves-tools idiom —
// tool IDENTITY lives in Equipment, the proficiency CAPABILITY lives in
// Playing the Game's `equipment-proficiencies-units.ts`/
// `fragments/equipment-proficiencies.ts`, same split as thieves-tools.
import { itemByPk } from "../../open5e/item";

export const THIEVES_TOOLS_ITEM_PK = "srd-2024_thieves-tools";
export const THIEVES_TOOLS_ENTITY_ID = "srd/tool/thieves-tools";

export const CALLIGRAPHERS_SUPPLIES_ITEM_PK = "srd-2024_calligraphers-supplies";
export const CALLIGRAPHERS_SUPPLIES_ENTITY_ID = "srd/tool/calligraphers-supplies";

/** Soldier's concrete authorial pick among the 4 Gaming Set variants (Dice/Dragonchess/Playing Cards/Three-Dragon Ante) — never the SRD's own choice, since the SRD text leaves it open (`character-origins.md:62`). */
export const GAMING_SET_DICE_ITEM_PK = "srd-2024_gaming-set-dice";
export const GAMING_SET_DICE_ENTITY_ID = "srd/tool/gaming-set-dice";

export interface ToolUnit {
	entityId: string;
	name: string;
	category: string;
	cost: string;
	description: string;
	weight: string;
	sourcePk: string;
}

/**
 * Shared item->ToolUnit lift, verifying category + expected RAW `Item.json`
 * name against the cache (never hand-typed) — one helper for every tool
 * instance this chapter authors. `displayName`, when given, overrides the
 * unit's own `name` field (Calligrapher's Supplies' own quirk below); the
 * raw JSON name is still what gets VERIFIED against the cache, so a fork
 * resync still trips loudly on the exact string this file pins.
 */
function toolUnitFromItem(
	itemPk: string,
	entityId: string,
	expectedName: string,
	displayName?: string,
): ToolUnit {
	const record = itemByPk(itemPk);
	if (record.category !== "tools") {
		throw new Error(`tools-units: '${itemPk}' is not categorized as tools in cached Item.json.`);
	}
	if (record.name !== expectedName) {
		throw new Error(
			`tools-units: cached item '${itemPk}' is named '${record.name}', not '${expectedName}'.`,
		);
	}
	return {
		entityId,
		name: displayName ?? record.name,
		category: record.category,
		cost: record.cost,
		description: record.description,
		weight: record.weight,
		sourcePk: record.pk,
	};
}

export function thievesToolsUnit(): ToolUnit {
	return toolUnitFromItem(THIEVES_TOOLS_ITEM_PK, THIEVES_TOOLS_ENTITY_ID, "Thieves' Tools");
}

/**
 * O1 consumer: Acolyte + Sage's shared Tool Proficiency
 * (`character-origins.md:38,54`). PINNED QUIRK (never "fixed", same
 * discipline as `feats-units.ts`'s own header): `Item.json`'s own `name`
 * field bakes the cost into the string itself
 * (`"Calligrapher's Supplies (10 GP)"`, unlike Thieves' Tools' clean name) —
 * verified verbatim above, then displayed WITHOUT the redundant suffix
 * (the `cost` field already carries "10.00" structurally).
 */
export function calligraphersSuppliesUnit(): ToolUnit {
	return toolUnitFromItem(
		CALLIGRAPHERS_SUPPLIES_ITEM_PK,
		CALLIGRAPHERS_SUPPLIES_ENTITY_ID,
		"Calligrapher's Supplies (10 GP)",
		"Calligrapher's Supplies",
	);
}

/** O1 consumer: Soldier's "Choose one kind of Gaming Set" (`character-origins.md:62`) — concrete authorial pick: Dice. */
export function gamingSetDiceUnit(): ToolUnit {
	return toolUnitFromItem(GAMING_SET_DICE_ITEM_PK, GAMING_SET_DICE_ENTITY_ID, "Gaming Set, Dice");
}

/** Item.json tools that are not an artisan/instrument choice and not already an instance above. */
const CATALOGUE_TOOLS = [
	["srd-2024_climbers-kit", "srd/tool/climbers-kit", "Climber's Kit"],
	["srd-2024_disguise-kit", "srd/tool/disguise-kit", "Disguise Kit"],
	["srd-2024_forgery-kit", "srd/tool/forgery-kit", "Forgery Kit"],
	["srd-2024_gaming-set-dragonchess", "srd/tool/gaming-set-dragonchess", "Gaming Set, Dragonchess"],
	[
		"srd-2024_gaming-set-playing-cards",
		"srd/tool/gaming-set-playing-cards",
		"Gaming Set, Playing Cards",
	],
	[
		"srd-2024_gaming-set-three-dragon-ante",
		"srd/tool/gaming-set-three-dragon-ante",
		"Gaming Set, Three-Dragon Ante",
	],
	["srd-2024_healers-kit", "srd/tool/healers-kit", "Healer's Kit"],
	["srd-2024_navigators-tools", "srd/tool/navigators-tools", "Navigator's Tools"],
	["srd-2024_poisoners-kit", "srd/tool/poisoners-kit", "Poisoner's Kit"],
] as const;

export function catalogueToolUnits(): ToolUnit[] {
	return CATALOGUE_TOOLS.map(([pk, entityId, name]) => toolUnitFromItem(pk, entityId, name));
}
