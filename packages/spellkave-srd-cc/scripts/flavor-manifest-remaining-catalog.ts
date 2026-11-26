#!/usr/bin/env tsx
/** Emit skgen prose-manifest for remaining catalog identity cards. No model call. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { buildTraitUnits } from "../src/chapters/character-origins/trait-units.ts";
import {
	choiceOptionEntitiesToAuthor,
	optionListSections,
} from "../src/chapters/classes/caster-features-units.ts";
import { buildWeaponUnits } from "../src/chapters/equipment/weapon-units.ts";
import { buildSkillUnits } from "../src/chapters/playing-the-game/skill-units.ts";
import { weaponTableText } from "../src/text/table.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(PKG_ROOT, "fixtures/base");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/remaining-catalog.prose-manifest.json");

const MUST_NOT_ATMOSPHERE = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"d4",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
];
const MUST_NOT_RULE = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"classes.md",
	"cache/",
	"SRD:",
	"pk='",
	"Menu member",
];

interface Entry {
	id: string;
	display_name: string;
	prompt_id: "flavor-gear" | "flavor-feat" | "flavor-rule";
	srd_text: string;
	must_not: string[];
}

function walkToml(dir: string, files: string[]): void {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, name.name);
		if (name.isDirectory()) walkToml(path, files);
		else if (name.name.endsWith(".toml")) files.push(path);
	}
}

function collectNaturalWeapons(): { id: string; displayName: string; description: string }[] {
	const files: string[] = [];
	walkToml(FIXTURES, files);
	const rows: { id: string; displayName: string; description: string }[] = [];
	for (const path of files) {
		const parsed = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		const table = parsed.entity_definitions;
		if (!Array.isArray(table)) continue;
		for (const raw of table) {
			const rec = raw as Record<string, unknown>;
			const id = typeof rec.entity_def_id === "string" ? rec.entity_def_id : "";
			if (!id.startsWith("srd/natural-weapon/")) continue;
			rows.push({
				id,
				displayName: typeof rec.display_name === "string" ? rec.display_name : id,
				description: typeof rec.description === "string" ? rec.description : "",
			});
		}
	}
	rows.sort((a, b) => a.id.localeCompare(b.id));
	return rows;
}

const entries: Entry[] = [];

for (const unit of buildWeaponUnits()) {
	entries.push({
		id: `weapon/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor-gear",
		srd_text: weaponTableText(unit.sourcePk).text,
		must_not: MUST_NOT_ATMOSPHERE,
	});
}

for (const unit of collectNaturalWeapons()) {
	entries.push({
		id: `natural-weapon/${unit.id.slice("srd/natural-weapon/".length)}`,
		display_name: unit.displayName,
		prompt_id: "flavor-gear",
		srd_text: `${unit.displayName}. ${unit.description}`,
		must_not: MUST_NOT_ATMOSPHERE,
	});
}

for (const unit of buildTraitUnits()) {
	entries.push({
		id: `trait/${unit.slug}`,
		display_name: unit.displayName,
		prompt_id: "flavor-feat",
		srd_text: unit.rawDesc,
		must_not: MUST_NOT_ATMOSPHERE,
	});
}

const metamagicBySlug = new Map(
	optionListSections("srd-2024_sorcerer_metamagic-options", "srd-2024_sorcerer").map((section) => [
		section.slug,
		section.body,
	]),
);
const invocationBySlug = new Map(
	optionListSections("srd-2024_warlock_eldritch-invocation-options", "srd-2024_warlock").map(
		(section) => [section.slug, section.body],
	),
);

for (const option of choiceOptionEntitiesToAuthor()) {
	const atmospheric =
		option.localId.startsWith("metamagic/") || option.localId.startsWith("eldritch-invocation/");
	let srdText = option.description;
	if (option.localId.startsWith("metamagic/")) {
		srdText = metamagicBySlug.get(option.localId.slice("metamagic/".length)) ?? srdText;
	}
	if (option.localId.startsWith("eldritch-invocation/")) {
		srdText = invocationBySlug.get(option.localId.slice("eldritch-invocation/".length)) ?? srdText;
	}
	entries.push({
		id: option.localId,
		display_name: option.displayName,
		prompt_id: atmospheric ? "flavor-feat" : "flavor-rule",
		srd_text: srdText,
		must_not: atmospheric ? MUST_NOT_ATMOSPHERE : MUST_NOT_RULE,
	});
}

for (const skill of buildSkillUnits()) {
	entries.push({
		id: `expertise-option/${skill.slug}`,
		display_name: `Expertise: ${skill.displayName}`,
		prompt_id: "flavor-rule",
		srd_text: skill.description,
		must_not: MUST_NOT_RULE,
	});
}

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: entries.map((entry) => ({
		id: entry.id,
		display_name: entry.display_name,
		prompt_id: entry.prompt_id,
		model: "openai/gpt-5.6-terra",
		core_traits:
			entry.prompt_id === "flavor-rule"
				? { kind: "option", srd_text: entry.srd_text }
				: { srd_text: entry.srd_text },
		must_include: [],
		must_not: entry.must_not,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
