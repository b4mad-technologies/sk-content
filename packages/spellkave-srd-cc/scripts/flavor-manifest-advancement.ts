#!/usr/bin/env tsx
/** Emit skgen prose-manifest for advancement-choice-option menu rows. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/advancement.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"Menu member",
	"metadata_attachment",
];

function walkToml(dir: string, files: string[]): void {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, name.name);
		if (name.isDirectory()) walkToml(path, files);
		else if (name.name.endsWith(".toml")) files.push(path);
	}
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function collect(): { id: string; displayName: string; description: string }[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: { id: string; displayName: string; description: string }[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const table = parsed.entity_definitions;
		if (!Array.isArray(table)) continue;
		for (const raw of table) {
			const rec = raw as Record<string, unknown>;
			const id = asString(rec.entity_def_id);
			if (!id.startsWith("srd/advancement-choice-option/")) continue;
			rows.push({
				id,
				displayName: asString(rec.display_name) || id,
				description: asString(rec.description) || asString(rec.display_name),
			});
		}
	}
	rows.sort((a, b) => a.id.localeCompare(b.id));
	return rows;
}

const units = collect();
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: `advancement-choice-option/${unit.id.slice("srd/advancement-choice-option/".length)}`,
		display_name: unit.displayName,
		prompt_id: "flavor-rule",
		model: "openai/gpt-5.6-terra",
		core_traits: { kind: "option", srd_text: unit.description },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
