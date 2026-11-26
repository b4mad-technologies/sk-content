// DOC-PROMISE: srd-text#completeness
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";
import { SRD_TEXT_LICENSE, SRD_TEXT_NAMESPACE } from "../../text";

const REQUIRED_ENTITY_PREFIXES = [
	"srd/spell/",
	"srd/creature/",
	"srd/magic_item/",
	"srd/feat/",
	"srd/item/",
	"srd/weapon/",
	"srd/armor/",
	"srd/tool/",
	"srd/class/",
	"srd/subclass/",
	"srd/species/",
	"srd/background/",
	"srd/trait/",
	"srd/class-feature/",
] as const;

const EXEMPT_ENTITY_IDS = new Set<string>([]);

const REQUIRED_RESOURCES = [
	"srd/str",
	"srd/dex",
	"srd/con",
	"srd/int",
	"srd/wis",
	"srd/cha",
	"srd/hp",
	"srd/temp_hp",
	"srd/ac",
	"srd/level",
];

/** Fixture files with no attachable catalog identity (or no SRD counterpart).
 * Capabilities, conditions, actions, tags, and chapter indexes stay here until
 * metadata target kinds widen (srd-text.md Completeness). */
const INTENTIONALLY_UNCOVERED_FIXTURES: Record<string, string> = {
	"character-creation/alignment.toml": "tag_value_definitions only",
	"character-creation/catalogue-rows.toml":
		"cited table identities; the chapter reader already carries the prose",
	"character-creation/trinkets.toml":
		"cited trinket cells; the chapter reader already carries the table",
	"character-creation/character-creation.toml": "chapter reader include",
	"character-creation/creation-tables.toml": "tag_value_definitions only",
	"character-creation/languages.toml": "tag_value_definitions only",
	"character-creation/pregen/fighter.toml":
		"instance of srd/class/fighter, which already has srd.text",
	"character-origins/character-origins.toml": "chapter reader include",
	"classes/advancement-metadata.toml": "menu option entities, not SRD headings",
	"classes/caster-features.toml": "actions and conditions; feature entities already carry srd.text",
	"classes/dm-acts.toml":
		"finite DM action wiring; class and subclass catalog entities carry the SRD prose",
	"classes/dm-grants.toml":
		"derived capability grant wiring; the underlying feature catalog carries the SRD prose",
	"classes/classes.toml": "chapter reader include",
	"classes/facts.toml": "docs facts, not SRD prose",
	"classes/spellcasting-substrate.toml": "metadata grants; spell slots live on casting.toml",
	"classes/tag-vocabulary.toml": "tag_value_definitions only",
	"equipment/armor-slots.toml": "equipment_slot_definitions are not an srd.text target kind",
	"equipment/item-families.toml": "family metadata only",
	"equipment/services.toml":
		"cited service sentences; the lodging table is already on the equipment reader",
	"equipment/equipment.toml": "chapter reader include",
	"equipment/area-hazards.toml":
		"hazard-verb wiring; the Caltrops and Ball Bearings gear rows already carry srd.text",
	"equipment/facts.toml": "docs facts, not SRD prose",
	"equipment/gear/contents-namespace.toml": "namespace registration only",
	"equipment/gear/mount-vehicle-namespaces.toml": "namespace registration only",
	"equipment/thrown-consumables.toml":
		"throw-verb wiring; the Acid, Alchemist's Fire and Holy Water gear rows already carry srd.text",
	"equipment/tool-choice-tags.toml": "tag_value_definitions only",
	"equipment/weapon-tag-values.toml": "tag_value_definitions only",
	"feats/facts.toml": "docs facts, not SRD prose",
	"feats/feats.toml": "chapter reader include",
	"gameplay-toolbox/gameplay-toolbox.toml": "chapter reader include",
	"magic-items/loot-tables.toml": "roll_tables are not an srd.text target kind",
	"magic-items/magic-items.toml": "chapter reader include",
	"magic-items/tag-values.toml": "tag_value_definitions only",
	"monsters/animals.toml": "chapter reader include",
	"monsters/monsters-a-z.toml": "chapter reader include",
	"monsters/monsters.toml": "chapter reader include",
	"monsters/starter-behaviors.toml": "wired combat actions; creature catalog already has srd.text",
	"monsters/tag-values.toml": "tag_value_definitions only",
	"playing-the-game/action-economy.toml": "economy channels are not an srd.text target kind",
	"playing-the-game/glossary-conditions.toml":
		"condition identities; glossary prose stays on the reader include",
	"playing-the-game/actions.toml": "capabilities only; target kind cannot attach",
	"playing-the-game/attacks.toml":
		"action/affordance wiring; glossary Attack Rolls already on catalog weapons",
	"playing-the-game/baseline-sensing.toml":
		"affordance wiring without a unique SRD heading identity",
	"playing-the-game/communication.toml":
		"capabilities/actions; Social Interaction lives on the reader include",
	"playing-the-game/conditions.toml": "condition_definitions are not an srd.text target kind",
	"playing-the-game/containment-policies.toml":
		"world exposure/access wiring; the container and creature catalogue entries carry their SRD prose",
	"playing-the-game/cover-conditions.toml": "condition_definitions are not an srd.text target kind",
	"playing-the-game/creature-identity.toml": "tag grants only",
	"playing-the-game/d20-tests.toml": "reader metadata only",
	"playing-the-game/dash.toml": "action wiring; Actions table is on the chapter reader include",
	"playing-the-game/dodge.toml": "action wiring; Actions table is on the chapter reader include",
	"playing-the-game/drop-prone.toml": "action wiring; not a unique SRD heading",
	"playing-the-game/equipment-proficiencies.toml":
		"capabilities/actions; Equipment Proficiencies heading is not unique",
	"playing-the-game/generic-check-affordances.toml":
		"action wiring; DC resources carry Difficulty Class",
	"playing-the-game/help.toml": "action wiring; Actions table is on the chapter reader include",
	"playing-the-game/macros.toml": "dsl_macro_definitions are not an srd.text target kind",
	"playing-the-game/perception-conditions.toml": "condition/action wiring",
	"playing-the-game/pickup.toml": "action wiring; Interacting with Objects heading is not unique",
	"playing-the-game/consume.toml":
		"capability wiring; Potions heading is the item text, not this row",
	"playing-the-game/player-character-identity.toml": "tag grants only",
	"playing-the-game/playing-the-game.toml":
		"chapter reader include already holds the Actions table",
	"playing-the-game/rest.toml":
		"action wiring; Long Rest is glossary-only until rest resources exist",
	"playing-the-game/skills.toml": "capabilities only; target kind cannot attach",
	"playing-the-game/sneak-attack.toml":
		"class-feature srd.text already on the Rogue feature entity",
	"playing-the-game/speech.toml": "action wiring",
	"playing-the-game/srd-art.toml": "art metadata, not SRD prose",
	"playing-the-game/stand-up.toml": "action wiring",
	"playing-the-game/weapon-mastery-riders.toml":
		"wired variants; mastery text lives on weapon catalog rows",
	"rules-glossary/rules-glossary.toml": "chapter reader include",
	"spells/spells.toml": "chapter reader include",
	"spells/tag-values.toml": "tag_value_definitions only",
};

const SECTION_RE = /^\[\[(\w+)\]\]\s*\n((?:(?!^\[\[)[\s\S])*)/gm;

function tomlFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: false })
		.map(String)
		.filter((path) => path.endsWith(".toml"))
		.map((path) => join(dir, path));
}

function field(block: string, name: string): string | undefined {
	const match = new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, "m").exec(block);
	return match?.[1];
}

describe("srd.text completeness", () => {
	const files = tomlFiles(join(FIXTURES_DIR, "base"));
	const entityIds = new Set<string>();
	const resourceIds = new Set<string>();
	const attachments = new Map<string, string>();
	let namespacePresent = false;

	for (const file of files) {
		const text = readFileSync(file, "utf8");
		SECTION_RE.lastIndex = 0;
		for (const match of text.matchAll(SECTION_RE)) {
			const kind = match[1];
			const block = match[2] ?? "";
			if (kind === "entity_definitions") {
				const id = field(block, "entity_def_id");
				if (id !== undefined) entityIds.add(id);
			}
			if (kind === "resource_definitions") {
				const id = field(block, "resource_definition_id");
				if (id !== undefined) resourceIds.add(id);
			}
			if (kind === "metadata_namespaces" && field(block, "namespace") === SRD_TEXT_NAMESPACE) {
				namespacePresent = true;
			}
			if (kind === "metadata_attachments" && field(block, "namespace") === SRD_TEXT_NAMESPACE) {
				const ref = field(block, "target_ref");
				if (ref !== undefined) attachments.set(ref, block);
			}
		}
	}

	it("registers the public srd.text namespace", () => {
		expect(namespacePresent).toBe(true);
	});

	it("attaches non-empty verbatim text with a cache/ pointer on every catalog entry", () => {
		const required = [...entityIds].filter(
			(id) =>
				!EXEMPT_ENTITY_IDS.has(id) &&
				REQUIRED_ENTITY_PREFIXES.some((prefix) => id.startsWith(prefix)),
		);
		required.push(...REQUIRED_RESOURCES.filter((id) => resourceIds.has(id)));
		const missing: string[] = [];
		const bad: string[] = [];
		for (const id of required.sort()) {
			const row = attachments.get(id);
			if (row === undefined) {
				missing.push(id);
				continue;
			}
			if (!row.includes("cache/") || !row.includes(SRD_TEXT_LICENSE) || !row.includes('"text"')) {
				bad.push(id);
			}
		}
		expect({ missing: missing.slice(0, 40), missingCount: missing.length, bad }).toEqual({
			missing: [],
			missingCount: 0,
			bad: [],
		});
	});

	it("every remaining fixture without srd.text is listed as intentionally uncovered", () => {
		const base = join(FIXTURES_DIR, "base");
		const unexpected: string[] = [];
		const stale: string[] = [];
		const missingFiles: string[] = [];
		for (const file of files) {
			const rel = file.slice(base.length + 1).replaceAll("\\", "/");
			const text = readFileSync(file, "utf8");
			const hasText = text.includes(`namespace = "${SRD_TEXT_NAMESPACE}"`);
			const reason = INTENTIONALLY_UNCOVERED_FIXTURES[rel];
			if (hasText && reason !== undefined) stale.push(rel);
			if (!hasText && reason === undefined) unexpected.push(rel);
		}
		for (const rel of Object.keys(INTENTIONALLY_UNCOVERED_FIXTURES).sort()) {
			if (!files.some((file) => file.slice(base.length + 1).replaceAll("\\", "/") === rel)) {
				missingFiles.push(rel);
			}
		}
		expect({ unexpected, stale, missingFiles }).toEqual({
			unexpected: [],
			stale: [],
			missingFiles: [],
		});
	});
});
