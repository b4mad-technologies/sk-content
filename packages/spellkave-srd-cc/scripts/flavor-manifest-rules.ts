#!/usr/bin/env tsx
/** Emit skgen prose-manifest for player-facing capabilities, conditions, actions. No model call. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/rules.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"actor.stat",
	"CELL COUNT",
	"BL-",
	"sk-",
	"LIVE:",
	"deferred",
];

interface RuleRow {
	kind: "capability" | "condition" | "action";
	id: string;
	displayName: string;
	description: string;
}

function skipId(kind: RuleRow["kind"], id: string): boolean {
	if (id.startsWith("srd/creature/")) return true;
	if (kind === "action" && id.startsWith("srd/spell/")) return true;
	return false;
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

function collect(): RuleRow[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: RuleRow[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const capabilities = parsed.capability_definitions;
		if (Array.isArray(capabilities)) {
			for (const row of capabilities) {
				const rec = row as Record<string, unknown>;
				const id = asString(rec.capability_id);
				if (!id || skipId("capability", id)) continue;
				rows.push({
					kind: "capability",
					id,
					displayName: asString(rec.display_name) || id,
					description: asString(rec.description) || asString(rec.display_name) || id,
				});
			}
		}
		const conditions = parsed.condition_definitions;
		if (Array.isArray(conditions)) {
			for (const row of conditions) {
				const rec = row as Record<string, unknown>;
				const id = asString(rec.condition_definition_id);
				if (!id || skipId("condition", id)) continue;
				rows.push({
					kind: "condition",
					id,
					displayName: asString(rec.display_name) || id,
					description: asString(rec.description) || asString(rec.display_name) || id,
				});
			}
		}
		const actions = parsed.action_definitions;
		if (Array.isArray(actions)) {
			for (const row of actions) {
				const rec = row as Record<string, unknown>;
				const id = asString(rec.action_id);
				if (!id || skipId("action", id)) continue;
				rows.push({
					kind: "action",
					id,
					displayName: asString(rec.display_name) || id,
					description: asString(rec.description) || asString(rec.display_name) || id,
				});
			}
		}
	}
	rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
	return rows;
}

const units = collect();
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: `${unit.kind}/${unit.id}`,
		display_name: unit.displayName,
		prompt_id: "flavor-rule",
		model: "openai/gpt-5.6-terra",
		core_traits: { kind: unit.kind, srd_text: unit.description },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
