#!/usr/bin/env tsx
/** Emit skgen prose-manifest for tag_value_definitions. No model call. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/tags.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"Identifies an entity",
	"tag_value",
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

function titleFromTag(tag: string): string {
	const last = tag.split(".").at(-1) ?? tag;
	return last
		.replaceAll("-", " ")
		.replaceAll("_", " ")
		.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function collect(): { tag: string; displayName: string; description: string }[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: { tag: string; displayName: string; description: string }[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const table = parsed.tag_value_definitions;
		if (!Array.isArray(table)) continue;
		for (const raw of table) {
			const rec = raw as Record<string, unknown>;
			const tag = asString(rec.tag);
			if (!tag) continue;
			rows.push({
				tag,
				displayName: asString(rec.display_name) || titleFromTag(tag),
				description: asString(rec.description) || tag,
			});
		}
	}
	rows.sort((a, b) => a.tag.localeCompare(b.tag));
	return rows;
}

const units = collect();
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: `tag/${unit.tag}`,
		display_name: unit.displayName,
		prompt_id: "flavor-rule",
		model: "openai/gpt-5.6-terra",
		core_traits: { kind: "tag", srd_text: unit.description },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
