/** Remaining character-creation tables as catalogue rows. Numbers only where the cell is a number. */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { costCpFromGpString, itemMeasureResourceCalls } from "../equipment/item-measures.ts";
import { driveUnitScene, metadataCall, type VerbCall } from "../verb-runner.ts";

function section(source: string, heading: string): string {
	const start = source.indexOf(heading);
	if (start < 0) throw new Error(`catalogue-rows: heading '${heading}' is missing.`);
	return source.slice(start);
}

function tableRows(block: string): string[][] {
	const table = block.slice(block.indexOf("<table>"), block.indexOf("</table>"));
	return [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
		.slice(1)
		.map((row) =>
			[...String(row[1] ?? "").matchAll(/<td>([^<]*)<\/td>/g)]
				.map((cell) => cell[1] ?? "")
				.map((cell) => cell.trim()),
		);
}

export function classOverviewRows(): Array<{ slug: string; cells: string[] }> {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "character-creation.md"), "utf8");
	const rows = tableRows(section(source, "**Class Overview**"));
	if (rows.length !== 12)
		throw new Error(`catalogue-rows: expected 12 class overview rows, found ${rows.length}.`);
	return rows.map((cells) => ({
		slug: (cells[0] ?? "").toLowerCase().replaceAll(" ", "-"),
		cells,
	}));
}

export function higherLevelEquipmentRows(): Array<{
	slug: string;
	label: string;
	fixedGp: number;
	text: string;
}> {
	return [
		{ slug: "level-2-4", label: "2–4", fixedGp: 0, text: "Normal starting equipment" },
		{
			slug: "level-5-10",
			label: "5–10",
			fixedGp: 500,
			text: "500 GP plus 1d10 × 25 GP plus normal starting equipment",
		},
		{
			slug: "level-11-16",
			label: "11–16",
			fixedGp: 5000,
			text: "5,000 gp plus 1d10 × 250 GP plus normal starting equipment",
		},
		{
			slug: "level-17-20",
			label: "17–20",
			fixedGp: 20000,
			text: "20,000 GP plus 1d10 × 250 GP plus normal starting equipment",
		},
	];
}

function slotCount(cell: string): number {
	if (cell === "—" || cell === "–" || cell === "-") return 0;
	const value = Number(cell);
	if (!Number.isInteger(value))
		throw new Error(`catalogue-rows: slot cell '${cell}' is not an integer.`);
	return value;
}

export function abilityBackgroundRows(): Array<{ ability: string; background: string }> {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "character-creation.md"), "utf8");
	const rows = tableRows(section(source, "**Ability Scores and Backgrounds**"));
	if (rows.length !== 6) {
		throw new Error(`catalogue-rows: expected 6 ability pairings, found ${rows.length}.`);
	}
	return rows.map((cells) => ({ ability: cells[0] ?? "", background: cells[1] ?? "" }));
}

export function multiclassSlotRows(): Array<{ level: number; slots: number[] }> {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "character-creation.md"), "utf8");
	const rows = tableRows(
		section(source, "**Multiclass Spellcaster: Spell Slots per Spell Level**"),
	);
	if (rows.length !== 20)
		throw new Error(`catalogue-rows: expected 20 multiclass rows, found ${rows.length}.`);
	return rows.map((cells) => ({
		level: Number(cells[0]),
		slots: cells.slice(1, 10).map(slotCount),
	}));
}

export async function buildCatalogueRowFragment(target?: AuthorTarget): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const calls: VerbCall[] = [...itemMeasureResourceCalls()];
	const units: ChapterUnitSummary[] = [];
	for (const row of classOverviewRows()) {
		const [name, likes, ability, complexity] = row.cells;
		calls.push({
			toolName: "spellkave_define_entity_type",
			label: `class-overview:${row.slug}`,
			params: {
				bundle: "srd",
				id: `catalogue/class-overview/${row.slug}`,
				display_name: `${name} overview`,
				description: `Likes ${likes}. Primary ability ${ability}. Complexity ${complexity}.`,
			},
		});
		units.push({
			kind: "entity_definitions",
			id: `srd/catalogue/class-overview/${row.slug}`,
			sourcePk: "character-creation.md:Class Overview",
		});
	}
	for (const row of higherLevelEquipmentRows()) {
		calls.push({
			toolName: "spellkave_define_entity_type",
			label: `higher-level:${row.slug}`,
			params: {
				bundle: "srd",
				id: `catalogue/starting-equipment/${row.slug}`,
				display_name: `Starting equipment ${row.label}`,
				description: row.text,
				initial_states: [
					{ state: "srd/cost_cp", value_int: costCpFromGpString(String(row.fixedGp)) },
				],
			},
		});
		units.push({
			kind: "entity_definitions",
			id: `srd/catalogue/starting-equipment/${row.slug}`,
			sourcePk: "character-creation.md:Starting Equipment at Higher Levels",
		});
	}
	for (const row of multiclassSlotRows()) {
		calls.push({
			toolName: "spellkave_define_entity_type",
			label: `multiclass-slots:${row.level}`,
			params: {
				bundle: "srd",
				id: `catalogue/multiclass-slots/level-${row.level}`,
				display_name: `Multiclass slots ${row.level}`,
				description: `Spell slots by level: ${row.slots.join(", ")}.`,
			},
		});
		units.push({
			kind: "entity_definitions",
			id: `srd/catalogue/multiclass-slots/level-${row.level}`,
			sourcePk: "character-creation.md:Multiclass Spellcaster",
		});
	}
	for (const { ability, background } of abilityBackgroundRows()) {
		const slug = ability.toLowerCase();
		calls.push({
			toolName: "spellkave_define_entity_type",
			label: `ability-background:${slug}`,
			params: {
				bundle: "srd",
				id: `catalogue/ability-background/${slug}`,
				display_name: `${ability} background`,
				description: `${ability} pairs with ${background}.`,
			},
		});
		units.push({
			kind: "entity_definitions",
			id: `srd/catalogue/ability-background/${slug}`,
			sourcePk: "character-creation.md:Ability Scores and Backgrounds",
		});
	}
	calls.push(
		metadataCall("multiclass-slot-counts", "srd", [
			{
				target: "namespace",
				key: "srd.multiclass.slots",
				value: {
					audience: "public",
					description: "Multiclass spell slot counts by level. Not a cast.",
				},
			},
			...multiclassSlotRows().map((row) => ({
				target: {
					kind: "entity_definition" as const,
					ref: `srd/catalogue/multiclass-slots/level-${row.level}`,
				},
				key: "srd.multiclass.slots",
				value: { slots: row.slots },
			})),
		]),
	);
	const body = await driveUnitScene("srd", calls, target, {
		omitRowKinds: ["resource_definitions"],
		retainMetadata: true,
	});
	return {
		toml:
			"# GENERATED by src/chapters/character-creation/catalogue-rows.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			"# Table facts only. The dice half of higher-level gold stays in the description.\n\n" +
			body,
		units,
	};
}
