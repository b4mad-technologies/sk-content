#!/usr/bin/env tsx
/** Emit skgen prose-manifest for the 12 SRD subclasses. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubclassUnits } from "../src/chapters/classes/classes-units.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/subclasses.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"Source:",
	"pk='",
	"D12",
	"D10",
	"D8",
	"D6",
];

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: buildSubclassUnits().map((unit) => ({
		id: `subclass/${unit.slug}`,
		display_name: `${unit.displayName} (${unit.parentDisplayName})`,
		prompt_id: "flavor-subclass",
		model: "openai/gpt-5.6-terra",
		core_traits: { srd_text: `_${unit.flavorText}_\n\n${unit.summaryText}` },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
