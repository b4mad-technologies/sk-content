/** Sample poisons from gameplay-toolbox.md. Catalogue identity only.
 * Price comes from the heading. Effects stay in srd.text and are not authored.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { FLAVOR_ROOT, readFlavorFile, readGearFlavor } from "../../flavor/read";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import {
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { COST_CP_RESOURCE_ID, costCpFromGpString } from "../equipment/item-measures.ts";
import { driveUnitScene } from "../verb-runner.ts";

const SOURCE = "gameplay-toolbox.md";
const POISON_TAG = "srd.item.poison";

const DELIVERY_TAGS = {
	contact: "srd.item.poison.contact",
	ingested: "srd.item.poison.ingested",
	inhaled: "srd.item.poison.inhaled",
	injury: "srd.item.poison.injury",
} as const;

type Delivery = keyof typeof DELIVERY_TAGS;

export interface SamplePoisonUnit {
	slug: string;
	displayName: string;
	heading: string;
	costGp: string;
	costCp: number;
	delivery: Delivery;
	entityId: string;
}

function markdown(): string {
	return readFileSync(path.join(CACHE_MARKDOWN_DIR, SOURCE), "utf8");
}

function sampleSection(): string {
	const source = markdown();
	const start = source.indexOf("### Sample Poisons");
	const end = source.indexOf("\n## Traps");
	if (start < 0 || end < start) {
		throw new Error("sample-poisons: Sample Poisons section is missing.");
	}
	return source.slice(start, end);
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/['’]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function deliveryAfter(section: string, heading: string): Delivery {
	const lines = section.split(/\r?\n/);
	const index = lines.indexOf(`#### ${heading}`);
	if (index < 0) throw new Error(`sample-poisons: missing heading '${heading}'.`);
	for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
		const line = lines[cursor]?.trim() ?? "";
		if (!line) continue;
		const match = /^_(Contact|Ingested|Inhaled|Injury) Poison_$/.exec(line);
		const label = match?.[1]?.toLowerCase();
		if (label === "contact" || label === "ingested" || label === "inhaled" || label === "injury") {
			return label;
		}
		throw new Error(`sample-poisons: '${heading}' type line '${line}' is not a poison type.`);
	}
	throw new Error(`sample-poisons: '${heading}' has no type line.`);
}

function tagFlavor(tag: string): string {
	const file = path.join(FLAVOR_ROOT, "en", "tags", `${tag.replaceAll(".", "-")}.md`);
	return readFlavorFile(file).body;
}

export function samplePoisonTagUnits(): Array<{
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}> {
	return [POISON_TAG, ...Object.values(DELIVERY_TAGS)].map((tag) => ({
		tag,
		prefix: "srd",
		description: tagFlavor(tag),
		sourcePk: "gameplay-toolbox.md:Sample Poisons",
	}));
}

/** The 14 Sample Poisons headings, in source order. */
export function samplePoisonUnits(): SamplePoisonUnit[] {
	const section = sampleSection();
	const found = [...section.matchAll(/^#### (.+) \(([0-9,]+) GP\)$/gm)];
	if (found.length !== 14) {
		throw new Error(`sample-poisons: expected 14 headings, found ${found.length}.`);
	}
	return found.map((match) => {
		const displayName = match[1];
		const costGp = match[2];
		if (displayName === undefined || costGp === undefined) {
			throw new Error("sample-poisons: heading match was empty.");
		}
		const heading = `${displayName} (${costGp} GP)`;
		return {
			slug: slugify(displayName),
			displayName,
			heading,
			costGp,
			costCp: costCpFromGpString(costGp.replaceAll(",", "")),
			delivery: deliveryAfter(section, heading),
			entityId: `srd/item/${slugify(displayName)}`,
		};
	});
}

export async function buildSamplePoisonFragments(target?: AuthorTarget): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const units = samplePoisonUnits();
	const calls = [
		srdTextNamespaceWriteCall(),
		{
			toolName: "spellkave_write_rows" as const,
			label: "sample-poison-tags",
			params: {
				bundle: "srd",
				kind: "tag_value_definitions",
				rows: [POISON_TAG, ...Object.values(DELIVERY_TAGS)].map((tag) => ({
					tag,
					prefix: "srd",
					bundle_id: "srd",
					description: tagFlavor(tag),
				})),
			},
		},
		...units.flatMap((row) => {
			const extracted = markdownHeadingBlock(SOURCE, row.heading);
			return [
				{
					toolName: "spellkave_define_entity_type" as const,
					label: `sample-poison:${row.slug}`,
					params: {
						bundle: "srd",
						id: `item/${row.slug}`,
						display_name: row.displayName,
						description: readGearFlavor(row.slug).body,
						tags: ["srd.item", POISON_TAG, DELIVERY_TAGS[row.delivery]],
						initial_states: [{ state: COST_CP_RESOURCE_ID, value_int: row.costCp }],
					},
				},
				srdTextAttachmentWriteCall({
					targetKind: "entity_definition",
					targetRef: row.entityId,
					extracted: {
						...extracted,
						source: `${extracted.source}; ${SOURCE}:${row.heading}`,
					},
				}),
			];
		}),
	];
	const body = await driveUnitScene("srd", calls, target, {
		omitRowKinds: ["metadata_namespaces"],
		onlyTagValueDefinitionTags: [POISON_TAG, ...Object.values(DELIVERY_TAGS)],
	});
	return {
		fragments: {
			"base/gameplay-toolbox/poisons.toml":
				"# GENERATED by src/chapters/gameplay-toolbox/sample-poisons.ts — DO NOT EDIT BY HAND.\n" +
				"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
				"# Identity only. Prices from Sample Poisons headings. No poison effects.\n\n" +
				body,
		},
		units: units.map((row) => ({
			kind: "entity_definitions" as const,
			id: row.entityId,
			sourcePk: `${SOURCE}:${row.heading}`,
		})),
	};
}
