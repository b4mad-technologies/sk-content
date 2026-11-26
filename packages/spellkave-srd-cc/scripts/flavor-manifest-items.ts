#!/usr/bin/env tsx
/** Emit skgen prose-manifest for SRD magic items. Full SRD block in core_traits. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownGapUnits } from "../src/chapters/magic-items/markdown-gap.ts";
import { readMagicItems } from "../src/open5e/magic-item.ts";
import { markdownHeadingBlock } from "../src/text/markdown.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFlag = process.argv.indexOf("--out");
const OUT_PATH =
	outFlag >= 0 && process.argv[outFlag + 1]
		? process.argv[outFlag + 1]
		: join(PKG_ROOT, "authored/flavor/en/items.prose-manifest.json");
const PK_PREFIX = "srd-2024_";

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"Attunement",
	"attunement",
	"charges",
	"Uncommon",
	"Very Rare",
	"Legendary",
	"Artifact",
	"+1",
	"+2",
	"+3",
	"d4",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
];

const onlyArg = process.argv.find((arg) => arg.startsWith("--only=")) ?? null;
const onlyFlagIndex = process.argv.indexOf("--only");
const onlyList =
	onlyArg !== null
		? onlyArg.slice("--only=".length)
		: onlyFlagIndex >= 0
			? (process.argv[onlyFlagIndex + 1] ?? "")
			: "";
const only = new Set(
	onlyList
		.split(",")
		.map((slug) => slug.trim())
		.filter(Boolean),
);

function itemSrdText(name: string, fallback: string): string {
	try {
		return markdownHeadingBlock("magic-items.md", name).text;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.startsWith("srd-text: no heading ")) return fallback;
		throw error;
	}
}

const items = readMagicItems().filter((record) => {
	if (!record.pk.startsWith(PK_PREFIX)) {
		throw new Error(`unexpected magic-item pk ${record.pk}`);
	}
	const slug = record.pk.slice(PK_PREFIX.length);
	return only.size === 0 || only.has(slug);
});
const gapItems = markdownGapUnits().filter((unit) => only.size === 0 || only.has(unit.slug));
if (only.size > 0 && items.length + gapItems.length !== only.size) {
	const found = new Set([
		...items.map((record) => record.pk.slice(PK_PREFIX.length)),
		...gapItems.map((unit) => unit.slug),
	]);
	const missing = [...only].filter((slug) => !found.has(slug));
	throw new Error(`flavor-manifest-items: unknown --only slugs: ${missing.join(", ")}`);
}

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: [
		...items.map((record) => {
			const slug = record.pk.slice(PK_PREFIX.length);
			return {
				id: `item/${slug}`,
				display_name: record.name,
				prompt_id: "flavor-item",
				model: "openai/gpt-5.6-terra",
				core_traits: { srd_text: itemSrdText(record.name, record.description) },
				must_include: [],
				must_not: MUST_NOT,
			};
		}),
		...gapItems.map((unit) => ({
			id: `item/${unit.slug}`,
			display_name: unit.displayName,
			prompt_id: "flavor-item",
			model: "openai/gpt-5.6-terra",
			core_traits: {
				srd_text: itemSrdText(unit.heading, unit.displayName),
			},
			must_include: [],
			must_not: MUST_NOT,
		})),
	],
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
