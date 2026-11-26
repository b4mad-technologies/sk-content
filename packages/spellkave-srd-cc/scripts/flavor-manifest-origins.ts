#!/usr/bin/env tsx
/**
 * Emit spellkave-prose-manifest/v1 for SRD backgrounds and species (skgen input).
 * Does not call a model.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBackgroundUnits } from "../src/chapters/character-origins/background-units.ts";
import { buildSpeciesUnits } from "../src/chapters/character-origins/species-units.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(PKG_ROOT, "authored/flavor/en");

const BACKGROUND_MUST_NOT = [
	"Ability Scores",
	"Skill Proficiencies",
	"Source:",
	"pk=",
	"Feat:",
	"Equipment:",
	"srd/skill",
	"srd/feat",
	"srd/proficiency",
];

const SPECIES_MUST_NOT = [
	"Creature Type",
	"Size:",
	"Speed:",
	"Source:",
	"pk=",
	"srd/size",
	"srd/speed",
	"player-chosen",
];

const entries = [
	...buildBackgroundUnits().map((unit) => ({
		id: `background/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor-background" as const,
		model: "openai/gpt-5.6-terra",
		core_traits: {},
		must_include: [] as string[],
		must_not: BACKGROUND_MUST_NOT,
	})),
	...buildSpeciesUnits().map((unit) => ({
		id: `species/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor-species" as const,
		model: "openai/gpt-5.6-terra",
		core_traits: {},
		must_include: [] as string[],
		must_not: SPECIES_MUST_NOT,
	})),
];

const outPath = join(OUT_DIR, "origins.prose-manifest.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
	outPath,
	`${JSON.stringify(
		{
			schema: "spellkave-prose-manifest/v1",
			output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
			entries,
		},
		null,
		"\t",
	)}\n`,
);
console.log(`wrote ${outPath} (${entries.length} entries)`);
