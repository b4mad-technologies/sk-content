/** Purchase-catalogue mounts and vehicles.
 * Open5e Item.json rows for these pks are defective (weight 0, non-SRD desc,
 * bogus immunities). Cost, weight, and ship stats are read from the
 * equipment.md tables. A mount row joins an existing creature; it does not
 * copy the stat block.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { readGearFlavor } from "../../flavor/read";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import {
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { driveUnitScene, metadataCall } from "../verb-runner.ts";
import {
	costCpFromGpString,
	itemMeasureResourceCalls,
	weightTenthsFromLbString,
} from "./item-measures.ts";

export const MOUNT_CREATURE_NAMESPACE = "srd.mount_creature";
export const VEHICLE_STAT_NAMESPACE = "srd.vehicle_stat";

interface CatalogueRow {
	slug: string;
	name: string;
	itemPk: string;
	costCp: number;
	weightLb10?: number;
	/** Pounds from the Mounts and Other Animals carrying-capacity column. */
	carryingCapacityLb?: number;
	creatureId?: string;
	stats?: Record<string, string | number>;
}

function equipmentMarkdown(): string {
	return readFileSync(path.join(CACHE_MARKDOWN_DIR, "equipment.md"), "utf8");
}

function tableAfter(heading: string): string[][] {
	const source = equipmentMarkdown();
	const start = source.indexOf(heading);
	if (start < 0) throw new Error(`mounts-vehicles: missing heading '${heading}'.`);
	const tableStart = source.indexOf("<table>", start);
	const tableEnd = source.indexOf("</table>", tableStart);
	if (tableStart < 0 || tableEnd < 0) {
		throw new Error(`mounts-vehicles: missing table after '${heading}'.`);
	}
	const table = source.slice(tableStart, tableEnd);
	return [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) => {
		const body = row[1];
		if (body === undefined) return [];
		return [...body.matchAll(/<t[dh]>([\s\S]*?)<\/t[dh]>/g)].flatMap((cell) => {
			const text = cell[1];
			return text === undefined ? [] : [text.replace(/<[^>]+>/g, "").trim()];
		});
	});
}

function cell(rows: string[][], name: string, column: number): string {
	const row = rows.find((cells) => cells[0] === name);
	const value = row?.[column];
	if (value === undefined) {
		throw new Error(`mounts-vehicles: table row '${name}' column ${column} is missing.`);
	}
	return value;
}

function costCpFromTable(label: string): number {
	const match = /^([\d,]+)\s+(GP|SP|CP)$/.exec(label);
	if (match?.[1] === undefined || match[2] === undefined) {
		throw new Error(`mounts-vehicles: cost '${label}' is not a GP/SP/CP amount.`);
	}
	const amount = match[1].replaceAll(",", "");
	const gp =
		match[2] === "GP"
			? amount
			: match[2] === "SP"
				? String(Number(amount) / 10)
				: String(Number(amount) / 100);
	return costCpFromGpString(gp);
}

function poundsFromTable(label: string): number {
	const match = /^([\d,]+)\s+lb\.$/.exec(label);
	if (match?.[1] === undefined) {
		throw new Error(`mounts-vehicles: carrying capacity '${label}' is not a pound amount.`);
	}
	return Number(match[1].replaceAll(",", ""));
}

function weightLb10FromTable(label: string): number | undefined {
	if (label === "—" || label === "") return undefined;
	const match = /^([\d,]+)\s+lb\.$/.exec(label);
	if (match?.[1] === undefined) {
		throw new Error(`mounts-vehicles: weight '${label}' is not a pound amount or an em dash.`);
	}
	return weightTenthsFromLbString(match[1].replaceAll(",", ""));
}

const MOUNT_CREATURES: Record<string, string> = {
	Camel: "srd/creature/camel",
	Elephant: "srd/creature/elephant",
	"Horse, Draft": "srd/creature/draft-horse",
	"Horse, Riding": "srd/creature/riding-horse",
	Mastiff: "srd/creature/mastiff",
	Mule: "srd/creature/mule",
	Pony: "srd/creature/pony",
	Warhorse: "srd/creature/warhorse",
};

const ITEM_PKS: Record<string, string> = {
	Camel: "srd-2024_camel",
	Elephant: "srd-2024_elephant",
	"Horse, Draft": "srd-2024_horse-draft",
	"Horse, Riding": "srd-2024_horse-riding",
	Mastiff: "srd-2024_mastiff",
	Mule: "srd-2024_mule",
	Pony: "srd-2024_pony",
	Warhorse: "srd-2024_warhorse",
	Carriage: "srd-2024_carriage",
	Cart: "srd-2024_cart",
	Chariot: "srd-2024_chariot",
	Sled: "srd-2024_sled",
	Wagon: "srd-2024_wagon",
	Airship: "srd-2024_airship",
	Galley: "srd-2024_galley",
	Keelboat: "srd-2024_keelboat",
	Longship: "srd-2024_longship",
	Rowboat: "srd-2024_rowboat",
	"Sailing Ship": "srd-2024_sailing-ship",
	Warship: "srd-2024_warship",
};

function slugFor(name: string): string {
	return name.toLowerCase().replaceAll(",", "").replaceAll(" ", "-");
}

export function mountVehicleUnits(): CatalogueRow[] {
	const mounts = tableAfter("**Mounts and Other Animals**");
	const tack = tableAfter("**Tack, Harness, and Drawn Vehicles**");
	const ships = tableAfter("### Large Vehicles");
	const mountRows = Object.keys(MOUNT_CREATURES).map((name) => ({
		slug: slugFor(name),
		name,
		itemPk: ITEM_PKS[name] ?? "",
		costCp: costCpFromTable(cell(mounts, name, 2)),
		carryingCapacityLb: poundsFromTable(cell(mounts, name, 1)),
		creatureId: MOUNT_CREATURES[name],
	}));
	const landNames = ["Carriage", "Cart", "Chariot", "Sled", "Wagon"];
	const landRows = landNames.map((name) => ({
		slug: slugFor(name),
		name,
		itemPk: ITEM_PKS[name] ?? "",
		costCp: costCpFromTable(cell(tack, name, 2)),
		weightLb10: weightLb10FromTable(cell(tack, name, 1)),
	}));
	const stabling = {
		slug: "stabling-per-day",
		name: "Stabling per day",
		itemPk: "srd-2024_stabling-per-day",
		costCp: costCpFromTable(cell(tack, "Stabling per day", 2)),
		weightLb10: weightLb10FromTable(cell(tack, "Stabling per day", 1)),
	};
	const shipNames = [
		"Airship",
		"Galley",
		"Keelboat",
		"Longship",
		"Rowboat",
		"Sailing Ship",
		"Warship",
	];
	const shipRows = shipNames.map((name) => {
		const stats = {
			speed: cell(ships, name, 1),
			crew: cell(ships, name, 2),
			passengers: cell(ships, name, 3),
			cargo_tons: cell(ships, name, 4),
			ac: Number(cell(ships, name, 5)),
			hp: Number(cell(ships, name, 6)),
			damage_threshold: cell(ships, name, 7),
		};
		const row: CatalogueRow = {
			slug: slugFor(name),
			name,
			itemPk: ITEM_PKS[name] ?? "",
			costCp: costCpFromTable(cell(ships, name, 8)),
			stats,
		};
		if (name === "Rowboat") {
			if (!equipmentMarkdown().includes("A Rowboat can be carried and weighs 100 pounds.")) {
				throw new Error("mounts-vehicles: rowboat weight sentence is missing.");
			}
			row.weightLb10 = weightTenthsFromLbString("100");
		}
		return row;
	});
	return [...mountRows, ...landRows, stabling, ...shipRows];
}

export async function buildMountVehicleFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const extracted = markdownHeadingBlock("equipment.md", "Mounts and Vehicles");
	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	const namespaceBody = await driveUnitScene("srd", [
		srdTextNamespaceWriteCall(),
		metadataCall("mount-vehicle-namespaces", "srd", [
			{
				target: "namespace",
				key: MOUNT_CREATURE_NAMESPACE,
				value: {
					audience: "public",
					description: "Purchase-catalogue mount joined to an existing creature stat block.",
					on_demand: true,
				},
			},
			{
				target: "namespace",
				key: VEHICLE_STAT_NAMESPACE,
				value: {
					audience: "public",
					description: "Large-vehicle table facts. Not a movement or combat mechanic.",
					on_demand: true,
				},
			},
		]),
	]);
	fragments["base/equipment/gear/mount-vehicle-namespaces.toml"] =
		"# GENERATED by src/chapters/equipment/mounts-vehicles.ts — DO NOT EDIT BY HAND.\n" +
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n\n" +
		namespaceBody;
	for (const row of mountVehicleUnits()) {
		const initialStates = [{ state: "srd/cost_cp", value_int: row.costCp }];
		if (row.weightLb10 !== undefined) {
			initialStates.push({ state: "srd/weight_lb10", value_int: row.weightLb10 });
		}
		const calls = [
			srdTextNamespaceWriteCall(),
			...itemMeasureResourceCalls(),
			{
				toolName: "spellkave_define_entity_type" as const,
				label: `mount-vehicle:${row.slug}`,
				params: {
					bundle: "srd",
					id: `item/${row.slug}`,
					display_name: row.name,
					description: readGearFlavor(row.slug).body,
					tags: ["srd.item", "srd.item.gear"],
					initial_states: initialStates,
				},
			},
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: `srd/item/${row.slug}`,
				extracted: {
					...extracted,
					source: `${extracted.source}; Item.json pk='${row.itemPk}'`,
				},
			}),
		];
		if (row.creatureId !== undefined) {
			calls.push(
				metadataCall(`mount-creature:${row.slug}`, "srd", [
					{
						target: "namespace",
						key: MOUNT_CREATURE_NAMESPACE,
						value: {
							audience: "public",
							description: "Purchase-catalogue mount joined to an existing creature stat block.",
							on_demand: true,
						},
					},
					{
						target: { kind: "entity_definition", ref: `srd/item/${row.slug}` },
						key: MOUNT_CREATURE_NAMESPACE,
						value: {
							creature_id: row.creatureId,
							item_pk: row.itemPk,
							carrying_capacity_lb: row.carryingCapacityLb,
						},
					},
				]),
			);
		}
		if (row.stats !== undefined) {
			calls.push(
				metadataCall(`vehicle-stat:${row.slug}`, "srd", [
					{
						target: "namespace",
						key: VEHICLE_STAT_NAMESPACE,
						value: {
							audience: "public",
							description: "Large-vehicle table facts. Not a movement or combat mechanic.",
							on_demand: true,
						},
					},
					{
						target: { kind: "entity_definition", ref: `srd/item/${row.slug}` },
						key: VEHICLE_STAT_NAMESPACE,
						value: { ...row.stats, item_pk: row.itemPk },
					},
				]),
			);
		}
		const body = await driveUnitScene("srd", calls, undefined, {
			omitRowKinds: ["metadata_namespaces", "resource_definitions"],
		});
		fragments[`base/equipment/gear/${row.slug}.toml`] =
			"# GENERATED by src/chapters/equipment/mounts-vehicles.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			`# Source pk: ${row.itemPk}\n\n` +
			body;
		units.push({ kind: "entity_definitions", id: `srd/item/${row.slug}`, sourcePk: row.itemPk });
	}
	return { fragments, units };
}
