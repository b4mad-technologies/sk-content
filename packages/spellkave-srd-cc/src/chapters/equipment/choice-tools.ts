/** Source membership for the open tool/instrument choices in starting kits.
 * Equipment.md headings admit the choices; Item.json supplies physical identity.
 * Existing tool and proficiency IDs are reused, including Calligrapher's Supplies.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import { readItems } from "../../open5e/item.ts";
import { metadataCall, type VerbCall } from "../verb-runner.ts";

export function choiceToolProficiencyCalls(): VerbCall[] {
	const updates: import("@spellkave/tool-authoring").SetMetadataUpdate[] = [
		{
			target: "namespace",
			key: "srd.equipment_proficiency",
			value: {
				audience: "public",
				description:
					"Explicit physical tool to proficiency capability reference consumed by character creation.",
				on_demand: true,
			},
		},
		...choiceToolUnits().map((unit) => ({
			target: { kind: "entity_definition", ref: unit.entityId },
			key: "srd.equipment_proficiency",
			value: { capabilityId: unit.proficiencyCapabilityId },
		})),
	];
	return [metadataCall("equipment-proficiency", "srd", updates)];
}

export function choiceToolTagCall(): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: "tool-choice-categories",
		params: {
			bundle: "srd",
			kind: "tag_value_definitions",
			rows: choiceToolTagUnits().map(({ sourcePk: _sourcePk, ...row }) => ({
				bundle_id: "srd",
				...row,
			})),
		},
	};
}

export function choiceToolTagUnits() {
	return [...new Set(choiceToolUnits().map((unit) => unit.choiceCategory))].map((category) => ({
		tag: `srd.tool.category.${category}`,
		prefix: "srd.tool.category",
		description: `Tool choice category: ${category}.`,
		sourcePk: "equipment.md:622-749",
	}));
}

export function choiceToolUnits() {
	const source = readFileSync(path.join(CACHE_MARKDOWN_DIR, "equipment.md"), "utf8");
	const artisanSection = /#### Artisan's Tools\n([\s\S]+?)\n#### Other Tools/.exec(source)?.[1];
	const instruments =
		/\*\*Musical Instrument \(Varies\)\*\*[\s\S]+?\*\*Variants:\*\* ([^\n]+)/.exec(source)?.[1];
	if (artisanSection === undefined || instruments === undefined) {
		throw new Error("choice-tools: source tool choice sections are missing.");
	}
	const artisanNames = [...artisanSection.matchAll(/^\*\*(.+?) \(\d+ GP\)\*\*$/gm)].map(
		(match) => match[1] as string,
	);
	const instrumentNames = [...instruments.matchAll(/(?:^|\), )([^()]+) \(\d+ GP,/g)].map(
		(match) => `Musical Instrument, ${match[1]?.trim()}`,
	);
	if (artisanNames.length === 0 || instrumentNames.length === 0) {
		throw new Error("choice-tools: source choice list is empty.");
	}
	const items = readItems().filter((item) => item.category === "tools");
	return [
		...artisanNames.map((name) => ({ name, category: "artisan" as const })),
		...instrumentNames.map((name) => ({ name, category: "instrument" as const })),
	].map(({ name, category }) => {
		const matches = items.filter(
			(item) => item.name.replace(/ \(\d+ GP\)$/, "").toLowerCase() === name.toLowerCase(),
		);
		const item = matches[0];
		if (matches.length !== 1 || item === undefined) {
			throw new Error(
				`choice-tools: expected one cached identity for '${name}', got ${matches.length}.`,
			);
		}
		const slug = item.pk.replace(/^srd-2024_/, "");
		return {
			...item,
			name: item.name.replace(/ \(\d+ GP\)$/, ""),
			choiceCategory: category,
			entityId: `srd/tool/${slug}`,
			proficiencyCapabilityId: `srd/proficiency/tool/${slug}`,
		};
	});
}
