#!/usr/bin/env tsx
/**
 * Copy a skgen prose run into authored/flavor/en/{classes,monsters,spells,items,backgrounds,species,feats,armor,gear,tools,resources}/<slug>.md
 * Refuse overwrite unless --force. Skip hygiene-failed cells unless --strict.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RUN = join(PKG_ROOT, "authored/flavor/.runs/run.json");

const RESOURCE_IDS: Record<string, string> = {
	"hit-die": "srd/hit-die",
	"spell-slot-1": "srd/spell_slot_1",
	"spell-slot-2": "srd/spell_slot_2",
	"speed-walk": "srd/speed-walk",
	"speed-climb": "srd/speed-climb",
	"speed-swim": "srd/speed-swim",
	"speed-fly": "srd/speed-fly",
	ac: "srd/ac",
	"asi-points": "srd/asi_points",
	"cost-cp": "srd/cost_cp",
	"weight-lb10": "srd/weight_lb10",
	"armor-ac-base": "srd/armor_ac_base",
	"armor-dex-cap": "srd/armor_dex_cap",
	"armor-str-required": "srd/armor_str_required",
	"armor-stealth-disadvantage": "srd/armor_stealth_disadvantage",
	hp: "srd/hp",
	"temp-hp": "srd/temp_hp",
	level: "srd/level",
	xp: "srd/xp",
	"proficiency-bonus": "srd/proficiency_bonus",
	"reach-mm": "srd/reach_mm",
	"death-save-successes": "srd/death_save_successes",
	"death-save-failures": "srd/death_save_failures",
	"hp-per-level": "srd/hp_per_level",
	"xp-value": "srd/xp_value",
	size: "srd/size",
	"dragonborn-breath-weapon-uses": "srd/dragonborn/breath-weapon-uses",
	"orc-relentless-endurance-uses": "srd/orc/relentless-endurance-uses",
	"barbarian-rage-uses": "srd/barbarian/rage-uses",
	"cleric-channel-divinity-uses": "srd/cleric/channel-divinity-uses",
	"paladin-channel-divinity-uses": "srd/paladin/channel-divinity-uses",
	"bard-bardic-inspiration-uses": "srd/bard/bardic-inspiration-uses",
	"druid-wild-shape-uses": "srd/druid/wild-shape-uses",
	"paladin-lay-on-hands": "srd/paladin/lay-on-hands",
	"ranger-favored-enemy-uses": "srd/ranger/favored-enemy-uses",
	"sorcerer-innate-sorcery-uses": "srd/sorcerer/innate-sorcery-uses",
	"wizard-arcane-recovery-uses": "srd/wizard/arcane-recovery-uses",
	"warlock-magical-cunning-uses": "srd/warlock/magical-cunning-uses",
	"sorcerer-sorcery-points": "srd/sorcerer/sorcery-points",
	"fighter-second-wind-uses": "srd/fighter/second-wind-uses",
	"fighter-action-surge-uses": "srd/fighter/action-surge-uses",
	"monk-focus-points": "srd/monk/focus-points",
	"monk-martial-arts-die-sides": "srd/monk/martial-arts-die-sides",
	"rogue-sneak-attack-dice": "srd/rogue/sneak-attack-dice",
	"magic-item-wand-of-fireballs-charges": "srd/magic_item/wand-of-fireballs/charges",
	"magic-item-wand-of-magic-missiles-charges": "srd/magic_item/wand-of-magic-missiles/charges",
	"heroic-inspiration": "srd/heroic_inspiration",
	"spellcasting-mod": "srd/spellcasting_mod",
	str: "srd/str",
	dex: "srd/dex",
	con: "srd/con",
	int: "srd/int",
	wis: "srd/wis",
	cha: "srd/cha",
};

function resourceEntityId(slug: string): string {
	const mapped = RESOURCE_IDS[slug];
	if (mapped !== undefined) return mapped;
	if (slug.startsWith("dc-")) return `srd/dc/${slug.slice(3)}`;
	throw new Error(`unknown resource flavor slug: ${slug}`);
}

export interface Cell {
	id: string;
	text: string;
	model?: string;
	prompt_id: string;
	error?: string;
	hygiene: { pass: boolean };
	provider?: string;
	author?: string;
}

/**
 * Frontmatter provenance line(s) for one cell. `agent-session`-provided
 * cells never claim a model they didn't call — `provider` + `author`
 * instead. Every other cell keeps the original `model: openai/<id>` line,
 * byte-identical to the pre-agent-session format.
 */
export function frontmatterProvenance(cell: Pick<Cell, "model" | "provider" | "author">): string {
	if (cell.provider === "agent-session") {
		return `provider: agent-session\nauthor: ${cell.author ?? "unknown"}`;
	}
	return `model: openai/${(cell.model ?? "").replace(/^openai\//, "")}`;
}

function route(id: string): { dir: string; slug: string; entityId: string; kind: string } {
	if (id.startsWith("class/")) {
		const slug = id.slice("class/".length);
		return { dir: "classes", slug, entityId: `srd/class/${slug}`, kind: "class" };
	}
	if (id.startsWith("monster/")) {
		const slug = id.slice("monster/".length);
		return { dir: "monsters", slug, entityId: `srd/creature/${slug}`, kind: "monster" };
	}
	if (id.startsWith("spell/")) {
		const slug = id.slice("spell/".length);
		return { dir: "spells", slug, entityId: `srd/spell/${slug}`, kind: "spell" };
	}
	if (id.startsWith("item/")) {
		const slug = id.slice("item/".length);
		return { dir: "items", slug, entityId: `srd/magic_item/${slug}`, kind: "item" };
	}
	if (id.startsWith("background/")) {
		const slug = id.slice("background/".length);
		return { dir: "backgrounds", slug, entityId: `srd/background/${slug}`, kind: "background" };
	}
	if (id.startsWith("species/")) {
		const slug = id.slice("species/".length);
		return { dir: "species", slug, entityId: `srd/species/${slug}`, kind: "species" };
	}
	if (id.startsWith("feat/")) {
		const slug = id.slice("feat/".length);
		return { dir: "feats", slug, entityId: `srd/feat/${slug}`, kind: "feat" };
	}
	if (id.startsWith("armor/")) {
		const slug = id.slice("armor/".length);
		return { dir: "armor", slug, entityId: `srd/armor/${slug}`, kind: "armor" };
	}
	if (id.startsWith("gear/")) {
		const slug = id.slice("gear/".length);
		return { dir: "gear", slug, entityId: `srd/item/${slug}`, kind: "gear" };
	}
	if (id.startsWith("tool/")) {
		const slug = id.slice("tool/".length);
		return { dir: "tools", slug, entityId: `srd/tool/${slug}`, kind: "tool" };
	}
	if (id.startsWith("subclass/")) {
		const slug = id.slice("subclass/".length);
		return { dir: "subclasses", slug, entityId: `srd/subclass/${slug}`, kind: "subclass" };
	}
	if (id.startsWith("class-feature/")) {
		const rest = id.slice("class-feature/".length);
		return {
			dir: "class-features",
			slug: rest.replaceAll("/", "-"),
			entityId: `srd/class-feature/${rest}`,
			kind: "class-feature",
		};
	}
	if (id.startsWith("resource/")) {
		const slug = id.slice("resource/".length);
		return { dir: "resources", slug, entityId: resourceEntityId(slug), kind: "resource" };
	}
	if (id.startsWith("capability/")) {
		const entityId = id.slice("capability/".length);
		return {
			dir: "capabilities",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "capability",
		};
	}
	if (id.startsWith("condition/")) {
		const entityId = id.slice("condition/".length);
		return {
			dir: "conditions",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "condition",
		};
	}
	if (id.startsWith("niche/")) {
		const entityId = id.slice("niche/".length);
		return {
			dir: "niches",
			slug: entityId.replaceAll(":", "-").replaceAll("/", "-"),
			entityId,
			kind: "niche",
		};
	}
	if (id.startsWith("macro/")) {
		const entityId = id.slice("macro/".length);
		return {
			dir: "macros",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "macro",
		};
	}
	if (id.startsWith("session/")) {
		const entityId = id.slice("session/".length);
		return {
			dir: "sessions",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "session",
		};
	}
	if (id.startsWith("consequence/")) {
		const entityId = id.slice("consequence/".length);
		return {
			dir: "consequences",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "consequence",
		};
	}
	if (id.startsWith("tag/")) {
		const tag = id.slice("tag/".length);
		return {
			dir: "tags",
			slug: tag.replaceAll(".", "-"),
			entityId: tag,
			kind: "tag",
		};
	}
	if (id.startsWith("action/")) {
		const entityId = id.slice("action/".length);
		return {
			dir: "actions",
			slug: entityId
				.replace(/^srd\//, "")
				.replaceAll("_", "-")
				.replaceAll("/", "-"),
			entityId,
			kind: "action",
		};
	}
	const catalogPrefixes: Array<[string, string, string]> = [
		["natural-weapon/", "natural-weapons", "natural-weapon"],
		["eldritch-invocation/", "eldritch-invocations", "eldritch-invocation"],
		["expertise-option/", "expertise-options", "expertise-option"],
		["skill-option/", "skill-options", "skill-option"],
		["advancement-choice-option/", "advancement-choice-options", "advancement-choice-option"],
		["pregen/", "pregen", "pregen"],
		["divine-order/", "divine-order", "divine-order"],
		["primal-order/", "primal-order", "primal-order"],
		["metamagic/", "metamagic", "metamagic"],
		["weapon/", "weapons", "weapon"],
		["trait/", "traits", "trait"],
	];
	for (const [prefix, dir, kind] of catalogPrefixes) {
		if (!id.startsWith(prefix)) continue;
		const slug = id.slice(prefix.length).replaceAll("/", "-");
		return { dir, slug, entityId: `srd/${prefix}${id.slice(prefix.length)}`, kind };
	}
	throw new Error(`unknown flavor id prefix: ${id}`);
}

function runCli(): void {
	const cliArgs = process.argv.slice(2);
	const runPath = cliArgs.find((arg) => !arg.startsWith("--")) ?? DEFAULT_RUN;
	const force = process.argv.includes("--force");
	const strict = process.argv.includes("--strict");
	const run = JSON.parse(readFileSync(runPath, "utf8")) as { cells: Cell[] };

	let wrote = 0;
	let skipped = 0;
	for (const cell of run.cells) {
		if (cell.error || !cell.hygiene.pass) {
			const why = cell.error ?? "hygiene failed";
			if (strict) throw new Error(`${cell.id}: ${why}`);
			console.error(`skip ${cell.id}: ${why}`);
			skipped += 1;
			continue;
		}
		const destInfo = route(cell.id);
		const destDir = join(PKG_ROOT, "authored/flavor/en", destInfo.dir);
		mkdirSync(destDir, { recursive: true });
		const dest = join(destDir, `${destInfo.slug}.md`);
		if (existsSync(dest) && !force) throw new Error(`refuse overwrite ${dest} (pass --force)`);
		const body = cell.text.trim();
		const md = `---
id: ${destInfo.entityId}
kind: ${destInfo.kind}
locale: en
${frontmatterProvenance(cell)}
prompt_id: ${cell.prompt_id}
reviewed: true
---
${body}
`;
		writeFileSync(dest, md.endsWith("\n") ? md : `${md}\n`);
		wrote += 1;
	}
	console.log(`ingested ${wrote}, skipped ${skipped}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runCli();
}
