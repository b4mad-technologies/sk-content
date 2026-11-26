#!/usr/bin/env tsx
/**
 * Emit a spellkave-prose-manifest/v1 for the 12 SRD classes (skgen input).
 * Does not call a model. Read-only on class units.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildClassUnits } from "../src/chapters/classes/classes-units.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/classes.prose-manifest.json");

const MUST_NOT = [
	"Caster Type",
	"D12",
	"D10",
	"D8",
	"D6",
	"Hit Point",
	"Primary Ability",
	"Source:",
	"primal power",
	"primal spirits",
	"Forgotten Realms",
];

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: buildClassUnits().map((unit) => ({
		id: `class/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor",
		model: "openai/gpt-5.6-terra",
		core_traits: {},
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
