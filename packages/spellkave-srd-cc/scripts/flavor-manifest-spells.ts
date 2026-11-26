#!/usr/bin/env tsx
/** Emit skgen prose-manifest for SRD spells. Full SRD block in core_traits. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSpells } from "../src/open5e/spell.ts";
import { spellMarkdownBlock } from "../src/text/markdown.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/spells.prose-manifest.json");
const PK_PREFIX = "srd-2024_";

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"1st-level",
	"2nd-level",
	"3rd-level",
	"4th-level",
	"5th-level",
	"6th-level",
	"7th-level",
	"8th-level",
	"9th-level",
	"Cantrip",
	"d4",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
	"Concentration",
	"Ritual",
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

const spells = readSpells().filter((record) => {
	if (!record.pk.startsWith(PK_PREFIX)) {
		throw new Error(`unexpected spell pk ${record.pk}`);
	}
	const slug = record.pk.slice(PK_PREFIX.length);
	return only.size === 0 || only.has(slug);
});
if (only.size > 0 && spells.length !== only.size) {
	const found = new Set(spells.map((record) => record.pk.slice(PK_PREFIX.length)));
	const missing = [...only].filter((slug) => !found.has(slug));
	throw new Error(`flavor-manifest-spells: unknown --only slugs: ${missing.join(", ")}`);
}

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: spells.map((record) => {
		const slug = record.pk.slice(PK_PREFIX.length);
		return {
			id: `spell/${slug}`,
			display_name: record.name,
			prompt_id: "flavor-spell",
			model: "openai/gpt-5.6-terra",
			core_traits: { srd_text: spellMarkdownBlock(record.name).text },
			must_include: [],
			must_not: MUST_NOT,
		};
	}),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
