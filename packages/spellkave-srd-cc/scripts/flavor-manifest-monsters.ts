#!/usr/bin/env tsx
/** Emit skgen prose-manifest for all SRD creatures. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCreatures } from "../src/open5e/creature.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/monsters.prose-manifest.json");
const PK_PREFIX = "srd-2024_";

const MUST_NOT = [
	"Caster Type",
	"Challenge Rating",
	"Hit Point",
	"Armor Class",
	"Forgotten Realms",
	"CR ",
];

const creatures = readCreatures();
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: creatures.map((record) => {
		if (!record.pk.startsWith(PK_PREFIX)) {
			throw new Error(`unexpected creature pk ${record.pk}`);
		}
		const slug = record.pk.slice(PK_PREFIX.length);
		return {
			id: `monster/${slug}`,
			display_name: record.name,
			prompt_id: "flavor-creature",
			model: "openai/gpt-5.6-terra",
			core_traits: {},
			must_include: [],
			must_not: MUST_NOT,
		};
	}),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
