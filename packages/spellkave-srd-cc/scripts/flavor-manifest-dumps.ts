#!/usr/bin/env tsx
/** Emit skgen prose-manifest for spell/creature action dumps and skill-option rows. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/dumps.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"actor.stat",
	"D6",
	"actor-carried",
	"independently-rolled",
	"Menu member",
];

interface Row {
	manifestId: string;
	displayName: string;
	srdText: string;
	kind: string;
}

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

function collect(): Row[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: Row[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const actions = parsed.action_definitions;
		if (Array.isArray(actions)) {
			for (const raw of actions) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.action_id);
				if (!id.startsWith("srd/spell/") && !id.startsWith("srd/creature/")) continue;
				rows.push({
					manifestId: `action/${id}`,
					displayName: asString(rec.display_name) || id,
					srdText: asString(rec.description) || asString(rec.display_name),
					kind: "action",
				});
			}
		}
		const caps = parsed.capability_definitions;
		if (Array.isArray(caps)) {
			for (const raw of caps) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.capability_id);
				if (!id.startsWith("srd/creature/")) continue;
				rows.push({
					manifestId: `capability/${id}`,
					displayName: asString(rec.display_name) || id,
					srdText: asString(rec.description) || asString(rec.display_name),
					kind: "capability",
				});
			}
		}
		const entities = parsed.entity_definitions;
		if (Array.isArray(entities)) {
			for (const raw of entities) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.entity_def_id);
				if (!id.startsWith("srd/skill-option/")) continue;
				rows.push({
					manifestId: `skill-option/${id.slice("srd/skill-option/".length)}`,
					displayName: asString(rec.display_name) || id,
					srdText: asString(rec.description) || asString(rec.display_name),
					kind: "option",
				});
			}
		}
	}
	rows.sort((a, b) => a.manifestId.localeCompare(b.manifestId));
	return rows;
}

const units = collect();
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: unit.manifestId,
		display_name: unit.displayName,
		prompt_id: "flavor-rule",
		model: "openai/gpt-5.6-terra",
		core_traits: { kind: unit.kind, srd_text: unit.srdText },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
