/** Gear identities needed by Fighter kits and their Dungeoneer's Pack.
 * Source admission is explicit; values are read from the committed CC cache.
 * These definitions do not claim to implement each item's Use action.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { readGearFlavor } from "../../flavor/read";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import { itemByPk } from "../../open5e/item.ts";
import {
	driveDefineWithSrdText,
	markdownHeadingBlock,
	open5eStringField,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { ITEM_FOOD_TAG, ITEM_LIGHT_TAG } from "../playing-the-game/tag-value-vocabulary.ts";
import { driveUnitFragment, driveUnitScene, metadataCall, type VerbCall } from "../verb-runner.ts";
import { costWeightInitialStates, itemMeasureResourceCalls } from "./item-measures.ts";

export const EQUIPMENT_CONTENTS_NAMESPACE = "srd.equipment_contents";

/** Compile the source's enumerated pack contents; no runtime prose parsing. */
export function equipmentPackContents(description: string): { name: string; quantity: number }[] {
	const list = /contains the following items:\s*(.+)\.$/.exec(description)?.[1];
	if (list === undefined) return [];
	return list.split(",").map((part) => {
		const text = part.trim().replace(/^and\s+/, "");
		const counted = /^(\d+)\s+(?:(?:flasks|days|sheets) of\s+)?(.+)$/.exec(text);
		return { name: counted?.[2] ?? text, quantity: Number(counted?.[1] ?? 1) };
	});
}

const LIQUID_CAPACITY_UNIT = /\b(?:pints?|gallons?|ounces?)\b/i;
const ITEM_CAPACITY_UNIT = /\b(?:cubic\s+feet|cubic\s+foot|pounds?)\b/i;
/** A counted item ("20 Bolts", "10 sheets"), not a liquid measure. */
const COUNTED_ITEM_CAPACITY = /\b\d+(?:\.\d+)?\s+(?!pints?\b|gallons?\b|ounces?\b)[A-Za-z]/i;

/**
 * `srd.item.container` means the gear can hold items, not merely liquid.
 * Packs enumerate contents. Other rows qualify only when a "holds up to"
 * clause states a solid, volume, weight, or counted-item capacity. A clause
 * whose only units are pints, gallons, or ounces does not qualify.
 */
export function gearHoldsItems(description: string): boolean {
	if (equipmentPackContents(description).length > 0) return true;
	const clauses = description.split(/\bholds up to\b/i).slice(1);
	return clauses.some(
		(clause) => ITEM_CAPACITY_UNIT.test(clause) || COUNTED_ITEM_CAPACITY.test(clause),
	);
}

const LIGHT_SLUGS = new Set(["candle", "lamp", "lantern-bullseye", "lantern-hooded", "torch"]);
const FOOD_SLUGS = new Set(["feed-per-day", "rations"]);

/** Gear tags plus the declared light/food vocabulary the row actually is. */
export function gearTags(slug: string, description: string): string[] {
	return [
		"srd.item.gear",
		...(gearHoldsItems(description) ? ["srd.item.container"] : []),
		...(LIGHT_SLUGS.has(slug) ? [ITEM_LIGHT_TAG] : []),
		...(FOOD_SLUGS.has(slug) ? [ITEM_FOOD_TAG] : []),
	];
}

/** True when every "holds up to" unit is liquid and none is an item capacity. */
export function gearHoldsLiquidOnly(description: string): boolean {
	if (gearHoldsItems(description)) return false;
	const clauses = description.split(/\bholds up to\b/i).slice(1);
	return clauses.length > 0 && clauses.every((clause) => LIQUID_CAPACITY_UNIT.test(clause));
}

const SOURCE_PKS = [
	"srd-2024_acid",
	"srd-2024_alchemists-fire",
	"srd-2024_antitoxin",
	"srd-2024_arrows-20",
	"srd-2024_backpack",
	"srd-2024_ball-bearings",
	"srd-2024_barrel",
	"srd-2024_basket",
	"srd-2024_bedroll",
	"srd-2024_bell",
	"srd-2024_blanket",
	"srd-2024_bolts-20",
	"srd-2024_bullets-firearm-10",
	"srd-2024_bullets-sling-20",
	"srd-2024_block-and-tackle",
	"srd-2024_book",
	"srd-2024_bottle-glass",
	"srd-2024_bucket",
	"srd-2024_burglars-pack",
	"srd-2024_caltrops",
	"srd-2024_candle",
	"srd-2024_case-crossbow-bolt",
	"srd-2024_case-map-or-scroll",
	"srd-2024_chain",
	"srd-2024_chest",
	"srd-2024_clothes-fine",
	"srd-2024_clothes-travelers",
	"srd-2024_component-pouch",
	"srd-2024_costume",
	"srd-2024_crowbar",
	"srd-2024_druidic-focus-sprig-of-mistletoe",
	"srd-2024_diplomats-pack",
	"srd-2024_druidic-focus-yew-wand",
	"srd-2024_dungeoneers-pack",
	"srd-2024_entertainers-pack",
	"srd-2024_explorers-pack",
	"srd-2024_feed-per-day",
	"srd-2024_flask",
	"srd-2024_grappling-hook",
	"srd-2024_herbalism-kit",
	"srd-2024_holy-symbol-amulet",
	"srd-2024_holy-symbol-emblem",
	"srd-2024_holy-symbol-reliquary",
	"srd-2024_holy-water",
	"srd-2024_hunting-trap",
	"srd-2024_ink",
	"srd-2024_ink-pen",
	"srd-2024_jug",
	"srd-2024_ladder",
	"srd-2024_lamp",
	"srd-2024_lantern-bullseye",
	"srd-2024_lantern-hooded",
	"srd-2024_lock",
	"srd-2024_magnifying-glass",
	"srd-2024_manacles",
	"srd-2024_map",
	"srd-2024_mirror",
	"srd-2024_needles-50",
	"srd-2024_net",
	"srd-2024_oil",
	"srd-2024_paper",
	"srd-2024_parchment",
	"srd-2024_perfume",
	"srd-2024_poison-basic",
	"srd-2024_pole",
	"srd-2024_pot-iron",
	"srd-2024_pouch",
	"srd-2024_priests-pack",
	"srd-2024_quiver",
	"srd-2024_ram-portable",
	"srd-2024_rations",
	"srd-2024_robe",
	"srd-2024_rope",
	"srd-2024_sack",
	"srd-2024_saddle-exotic",
	"srd-2024_saddle-military",
	"srd-2024_saddle-riding",
	"srd-2024_scholars-pack",
	"srd-2024_shovel",
	"srd-2024_signal-whistle",
	"srd-2024_spikes-iron",
	"srd-2024_spyglass",
	"srd-2024_string",
	"srd-2024_tent",
	"srd-2024_tinderbox",
	"srd-2024_torch",
	"srd-2024_vial",
	"srd-2024_waterskin",
] as const;

export function startingGearUnits() {
	return SOURCE_PKS.map((pk) => {
		const item = itemByPk(pk);
		return {
			...item,
			entityId: `srd/item/${pk.replace(/^srd-2024_/, "")}`,
			// The source sells ammunition in packs. Keep that unit explicit;
			// a character's 20 arrows are one such pack, not twenty packs.
			unitsPerItem:
				item.category === "ammunition" ? Number(/\((\d+)\)$/.exec(item.name)?.[1] ?? 1) : 1,
		};
	});
}

const COIN_ROWS = [
	{ slug: "copper-piece", name: "Copper Piece", cell: "Copper Piece (CP)" },
	{ slug: "silver-piece", name: "Silver Piece", cell: "Silver Piece (SP)" },
	{ slug: "electrum-piece", name: "Electrum Piece", cell: "Electrum Piece (EP)" },
	{ slug: "gold-piece", name: "Gold Piece", cell: "Gold Piece (GP)" },
	{ slug: "platinum-piece", name: "Platinum Piece", cell: "Platinum Piece (PP)" },
] as const;

/** Coin identities from the Coin Values table, not synthetic money resources. */
export function coinUnits() {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "equipment.md"), "utf8");
	return COIN_ROWS.map((row) => {
		if (!source.includes(`<td>${row.cell}</td>`)) {
			throw new Error(`starting-gear: coin row '${row.cell}' is missing.`);
		}
		return { entityId: `srd/item/${row.slug}`, name: row.name, slug: row.slug };
	});
}

/** Coin identity from the equipment chapter, not a synthetic money resource. */
export function startingGoldUnit() {
	const gold = coinUnits().find((coin) => coin.slug === "gold-piece");
	if (gold === undefined) throw new Error("starting-gear: Gold Piece source row is missing.");
	return { entityId: gold.entityId, name: gold.name };
}

export async function buildStartingGearFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	const namespaceCall = metadataCall("equipment-contents-namespace", "srd", [
		{
			target: "namespace",
			key: EQUIPMENT_CONTENTS_NAMESPACE,
			value: {
				audience: "public",
				description: "Source-derived initial equipment contents consumed by character creation.",
				on_demand: true,
			},
		},
	]);
	fragments["base/equipment/gear/contents-namespace.toml"] = await driveUnitFragment(
		"srd",
		namespaceCall,
	);
	for (const item of startingGearUnits()) {
		const slug = item.entityId.slice("srd/item/".length);
		const contents = equipmentPackContents(item.description);
		const calls: VerbCall[] = [
			srdTextNamespaceWriteCall(),
			...itemMeasureResourceCalls(),
			{
				toolName: "spellkave_define_entity_type",
				label: `starting-gear:${slug}`,
				params: {
					bundle: "srd",
					id: `item/${slug}`,
					display_name: item.name,
					description: readGearFlavor(slug).body,
					tags: ["srd.item", ...gearTags(slug, item.description)],
					initial_states: costWeightInitialStates(item.pk),
				},
			},
		];
		calls.push(
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: item.entityId,
				extracted: open5eStringField("Item.json", item.pk),
			}),
		);
		if (contents.length > 0) {
			calls.push(namespaceCall);
			calls.push(
				metadataCall(`gear-contents:${slug}`, "srd", [
					{
						target: { kind: "entity_definition", ref: item.entityId },
						key: EQUIPMENT_CONTENTS_NAMESPACE,
						value: { items: contents },
					},
				]),
			);
		}
		const body = await driveUnitScene("srd", calls, undefined, {
			omitRowKinds: ["metadata_namespaces", "resource_definitions"],
		});
		// The chest is the citing fixture for `container-with-loot`
		// (packages/spellkave-world-author/docs/patterns/container-with-loot.md,
		// sk-jay0.1.23.36.22.5) — it is the SRD def the pattern's own solution
		// places and stocks; other gear rows carry no composition the catalog
		// needs to cover.
		const patternLine = slug === "chest" ? "# pattern: container-with-loot\n" : "";
		fragments[`base/equipment/gear/${slug}.toml`] =
			"# GENERATED by src/chapters/equipment/starting-gear.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			patternLine +
			"\n" +
			body;
		units.push({ kind: "entity_definitions", id: item.entityId, sourcePk: item.pk });
	}
	const coinsExtracted = markdownHeadingBlock("equipment.md", "Coins");
	for (const coin of coinUnits()) {
		const coinBody = await driveDefineWithSrdText(
			"srd",
			{
				toolName: "spellkave_define_entity_type",
				label: `starting-gear:${coin.slug}`,
				params: {
					bundle: "srd",
					id: coin.entityId.slice("srd/".length),
					display_name: coin.name,
					description: readGearFlavor(coin.slug).body,
					tags: ["srd.item", "srd.item.gear"],
					stackable: true,
				},
			},
			{
				targetKind: "entity_definition",
				targetRef: coin.entityId,
				extracted: coinsExtracted,
			},
		);
		fragments[`base/equipment/gear/${coin.slug}.toml`] =
			`# GENERATED by src/chapters/equipment/starting-gear.ts — DO NOT EDIT BY HAND.\n${coinBody}`;
		units.push({
			kind: "entity_definitions",
			id: coin.entityId,
			sourcePk: "equipment.md:Coin Values",
		});
	}
	return { fragments, units };
}
