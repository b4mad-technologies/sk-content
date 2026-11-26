#!/usr/bin/env tsx
/** Emit skgen prose-manifests for armor, mundane gear, and tools. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chainMailUnit, remainingArmorUnits } from "../src/chapters/equipment/armor-units.ts";
import { choiceToolUnits } from "../src/chapters/equipment/choice-tools.ts";
import { focusGearSource } from "../src/chapters/equipment/focus-gear.ts";
import { foodDrinkUnits } from "../src/chapters/equipment/food-drink.ts";
import { mountVehicleUnits } from "../src/chapters/equipment/mounts-vehicles.ts";
import { coinUnits, startingGearUnits } from "../src/chapters/equipment/starting-gear.ts";
import {
	calligraphersSuppliesUnit,
	catalogueToolUnits,
	gamingSetDiceUnit,
	thievesToolsUnit,
} from "../src/chapters/equipment/tools-units.ts";
import { markdownHeadingBlock } from "../src/text/markdown.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MUST_NOT = ["Forgotten Realms", "Greyhawk", "Eberron", "d4", "d6", "d8", "d10", "d12", "d20"];

function headingOrFallback(file: string, name: string, fallback: string): string {
	try {
		return markdownHeadingBlock(file, name).text;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.startsWith("srd-text: no heading ")) return fallback;
		throw error;
	}
}

function writeManifest(
	rel: string,
	entries: {
		id: string;
		display_name: string;
		srd_text: string;
	}[],
): void {
	const outPath = join(PKG_ROOT, rel);
	const manifest = {
		schema: "spellkave-prose-manifest/v1",
		output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
		entries: entries.map((entry) => ({
			id: entry.id,
			display_name: entry.display_name,
			prompt_id: "flavor-gear",
			model: "openai/gpt-5.6-terra",
			core_traits: { srd_text: entry.srd_text },
			must_include: [],
			must_not: MUST_NOT,
		})),
	};
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, `${JSON.stringify(manifest, null, "\t")}\n`);
	console.log(`wrote ${outPath} (${manifest.entries.length} entries)`);
}

const armor = [chainMailUnit(), ...remainingArmorUnits()].map((unit) => ({
	id: `armor/${unit.slug}`,
	display_name: unit.displayName,
	srd_text: headingOrFallback("equipment.md", unit.displayName, unit.displayName),
}));

const gearSeen = new Set<string>();
const gear: { id: string; display_name: string; srd_text: string }[] = [];
function addGear(id: string, displayName: string, srdText: string): void {
	if (gearSeen.has(id)) return;
	gearSeen.add(id);
	gear.push({ id, display_name: displayName, srd_text: srdText });
}
for (const item of startingGearUnits()) {
	const slug = item.entityId.slice("srd/item/".length);
	addGear(`gear/${slug}`, item.name, item.description);
}
for (const coin of coinUnits()) {
	addGear(`gear/${coin.slug}`, coin.name, "A coin from the Coin Values table.");
}
for (const row of mountVehicleUnits()) {
	addGear(`gear/${row.slug}`, row.name, `${row.name} from the Mounts and Vehicles tables.`);
}
for (const row of foodDrinkUnits()) {
	addGear(
		`gear/${row.slug}`,
		row.name,
		`${row.name} costs ${row.costLabel} on the Food, Drink, and Lodging table.`,
	);
}
for (const item of focusGearSource()) {
	addGear(`gear/${item.slug}`, item.name, item.description);
}

const toolSeen = new Set<string>();
const tools: { id: string; display_name: string; srd_text: string }[] = [];
function addTool(slug: string, displayName: string, description: string): void {
	if (toolSeen.has(slug)) return;
	toolSeen.add(slug);
	tools.push({
		id: `tool/${slug}`,
		display_name: displayName,
		srd_text: description,
	});
}
for (const unit of [
	thievesToolsUnit(),
	calligraphersSuppliesUnit(),
	gamingSetDiceUnit(),
	...catalogueToolUnits(),
	...choiceToolUnits(),
]) {
	const slug = unit.entityId.slice("srd/tool/".length);
	addTool(slug, unit.name, unit.description);
}

writeManifest("authored/flavor/en/armor.prose-manifest.json", armor);
writeManifest("authored/flavor/en/gear.prose-manifest.json", gear);
writeManifest("authored/flavor/en/tools.prose-manifest.json", tools);
