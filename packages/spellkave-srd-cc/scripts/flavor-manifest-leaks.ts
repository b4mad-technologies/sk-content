#!/usr/bin/env tsx
/** Emit skgen prose-manifest for remaining leaky fixture descriptions. No model call. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/leaks.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"sk-0m4",
	"actor.stat",
	"operator ruling",
];

const CONSEQUENCE_IDS = new Set([
	"srd/trait/relentless-endurance/intercept",
	"srd/claim-victory/success",
]);

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

function titleFromId(id: string): string {
	const last = id.split("/").at(-1) ?? id;
	return last
		.replaceAll("-", " ")
		.replaceAll("_", " ")
		.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

interface Entry {
	id: string;
	displayName: string;
	description: string;
}

function collect(): Entry[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: Entry[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const niches = parsed.niche_definitions;
		if (Array.isArray(niches)) {
			for (const raw of niches) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.niche_id);
				if (!id) continue;
				rows.push({
					id: `niche/${id}`,
					displayName: asString(rec.display_name) || titleFromId(id),
					description: asString(rec.description) || id,
				});
			}
		}
		const macros = parsed.dsl_macro_definitions;
		if (Array.isArray(macros)) {
			for (const raw of macros) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.macro_id);
				if (!id) continue;
				rows.push({
					id: `macro/${id}`,
					displayName: asString(rec.display_name) || titleFromId(id),
					description: asString(rec.description) || id,
				});
			}
		}
		const sessions = parsed.session_definitions;
		if (Array.isArray(sessions)) {
			for (const raw of sessions) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.session_def_id);
				if (!id) continue;
				rows.push({
					id: `session/${id}`,
					displayName: asString(rec.display_name) || titleFromId(id),
					description: asString(rec.description) || id,
				});
			}
		}
		const consequences = parsed.consequence_templates;
		if (Array.isArray(consequences)) {
			for (const raw of consequences) {
				const rec = raw as Record<string, unknown>;
				const id = asString(rec.template_id);
				if (!CONSEQUENCE_IDS.has(id)) continue;
				rows.push({
					id: `consequence/${id}`,
					displayName: titleFromId(id),
					description: asString(rec.description) || id,
				});
			}
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
		id: unit.id,
		display_name: unit.displayName,
		prompt_id: "flavor-rule",
		model: "openai/gpt-5.6-terra",
		core_traits: { kind: "rule", srd_text: unit.description },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
