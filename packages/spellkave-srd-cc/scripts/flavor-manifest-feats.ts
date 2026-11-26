#!/usr/bin/env tsx
/** Emit skgen prose-manifest for SRD feats. Full SRD block in core_traits. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOriginFeatUnits } from "../src/chapters/feats/feats-units.ts";
import { buildRemainingFeatUnits } from "../src/chapters/feats/remaining-feats-units.ts";
import { markdownHeadingBlock } from "../src/text/markdown.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/feats.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"Prerequisite",
	"prerequisite",
	"d4",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
	"+1",
	"+2",
	"+3",
];

function featSrdText(name: string, fallback: string): string {
	try {
		return markdownHeadingBlock("feats.md", name).text;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.startsWith("srd-text: no heading ")) return fallback;
		throw error;
	}
}

const units = [...buildOriginFeatUnits(), ...buildRemainingFeatUnits()];
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: `feat/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor-feat",
		model: "openai/gpt-5.6-terra",
		core_traits: { srd_text: featSrdText(unit.displayName, unit.displayName) },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
