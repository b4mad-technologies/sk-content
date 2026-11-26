#!/usr/bin/env tsx
/** Emit skgen prose-manifest for topic resources. Full SRD heading in core_traits. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAbilityUnits } from "../src/chapters/playing-the-game/ability-units.ts";
import {
	buildGenericCheckSubjects,
	genericCheckDcOverrideSuffix,
} from "../src/chapters/playing-the-game/generic-check-units.ts";
import { resourceFlavorSlug } from "../src/flavor/read.ts";
import { markdownHeadingBlock } from "../src/text/markdown.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/resources.prose-manifest.json");

const MUST_NOT = [
	"Forgotten Realms",
	"Greyhawk",
	"Eberron",
	"CharacterClass.json",
	"actor.stat",
	"CELL COUNT",
	"d6",
	"d8",
	"d10",
	"d12",
	"d20",
	"+1",
	"+2",
	"+3",
];

interface ResourceFlavorEntry {
	slug: string;
	displayName: string;
	file?: string;
	heading?: string;
	maxChars?: number;
	srdText?: string;
}

function headingText(file: string, heading: string, maxChars?: number): string {
	const text = markdownHeadingBlock(file, heading).text;
	if (maxChars === undefined || text.length <= maxChars) return text;
	return text.slice(0, maxChars);
}

function entrySrdText(entry: ResourceFlavorEntry): string {
	if (entry.srdText !== undefined) return entry.srdText;
	if (entry.file === undefined || entry.heading === undefined) {
		throw new Error(`flavor-manifest-resources: ${entry.slug} needs file+heading or srdText`);
	}
	return headingText(entry.file, entry.heading, entry.maxChars);
}

const ENTRIES: ResourceFlavorEntry[] = [
	{
		slug: "hit-die",
		displayName: "Hit Die",
		file: "character-creation.md",
		heading: "Hit Points and Hit Point Dice",
	},
	{
		slug: "spell-slot-1",
		displayName: "Level 1 Spell Slot",
		file: "spells.md",
		heading: "Spell Slots",
	},
	{
		slug: "spell-slot-2",
		displayName: "Level 2 Spell Slot",
		file: "spells.md",
		heading: "Spell Slots",
	},
	{
		slug: "speed-walk",
		displayName: "Walking Speed",
		file: "playing-the-game.md",
		heading: "Movement and Position",
	},
	{
		slug: "speed-climb",
		displayName: "Climbing Speed",
		file: "rules-glossary.md",
		heading: "Climbing",
	},
	{
		slug: "speed-swim",
		displayName: "Swimming Speed",
		file: "rules-glossary.md",
		heading: "Swimming",
	},
	{ slug: "speed-fly", displayName: "Flying Speed", file: "rules-glossary.md", heading: "Flying" },
	{ slug: "ac", displayName: "Armor Class", file: "rules-glossary.md", heading: "Armor Class" },
	{
		slug: "asi-points",
		displayName: "ASI Points",
		file: "feats.md",
		heading: "Ability Score Improvement",
	},
	{ slug: "cost-cp", displayName: "Cost (copper)", file: "equipment.md", heading: "Coins" },
	{
		slug: "weight-lb10",
		displayName: "Weight",
		file: "equipment.md",
		heading: "Adventuring Gear",
		maxChars: 2000,
	},
	{ slug: "armor-ac-base", displayName: "Armor AC base", file: "equipment.md", heading: "Armor" },
	{
		slug: "armor-dex-cap",
		displayName: "Armor Dexterity cap",
		file: "equipment.md",
		heading: "Armor",
	},
	{
		slug: "armor-str-required",
		displayName: "Armor Strength required",
		file: "equipment.md",
		heading: "Armor",
	},
	{
		slug: "armor-stealth-disadvantage",
		displayName: "Armor stealth disadvantage",
		file: "equipment.md",
		heading: "Armor",
	},
	{ slug: "hp", displayName: "Hit Points", file: "playing-the-game.md", heading: "Hit Points" },
	{
		slug: "temp-hp",
		displayName: "Temporary Hit Points",
		file: "playing-the-game.md",
		heading: "Temporary Hit Points",
	},
	{
		slug: "level",
		displayName: "Level",
		file: "character-creation.md",
		heading: "Level Advancement",
	},
	{
		slug: "xp",
		displayName: "Experience Points",
		file: "character-creation.md",
		heading: "Experience Points",
	},
	{
		slug: "proficiency-bonus",
		displayName: "Proficiency Bonus",
		file: "character-creation.md",
		heading: "Proficiency Bonus",
	},
	{ slug: "reach-mm", displayName: "Reach", file: "playing-the-game.md", heading: "Reach" },
	{
		slug: "death-save-successes",
		displayName: "Death Save Successes",
		file: "playing-the-game.md",
		heading: "Death Saving Throws",
	},
	{
		slug: "death-save-failures",
		displayName: "Death Save Failures",
		file: "playing-the-game.md",
		heading: "Death Saving Throws",
	},
	{
		slug: "hp-per-level",
		displayName: "Hit Points Gained per Level",
		file: "character-creation.md",
		heading: "Hit Points and Hit Point Dice",
	},
	{
		slug: "xp-value",
		displayName: "Experience Point Value",
		file: "rules-glossary.md",
		heading: "Experience Points",
	},
	{ slug: "size", displayName: "Size Category", file: "character-origins.md", heading: "Size" },
	{
		slug: "dragonborn-breath-weapon-uses",
		displayName: "Dragonborn Breath Weapon Uses",
		file: "character-origins.md",
		heading: "Dragonborn",
		maxChars: 2500,
	},
	{
		slug: "orc-relentless-endurance-uses",
		displayName: "Relentless Endurance Uses",
		file: "character-origins.md",
		heading: "Orc",
		maxChars: 2000,
	},
	{
		slug: "barbarian-rage-uses",
		displayName: "Rage Uses",
		file: "classes.md",
		heading: "Level 1: Rage",
	},
	{
		slug: "cleric-channel-divinity-uses",
		displayName: "Channel Divinity Uses (Cleric)",
		file: "classes.md",
		heading: "Level 2: Channel Divinity",
	},
	{
		slug: "paladin-channel-divinity-uses",
		displayName: "Channel Divinity Uses (Paladin)",
		file: "classes.md",
		heading: "Level 3: Channel Divinity",
	},
	{
		slug: "bard-bardic-inspiration-uses",
		displayName: "Bardic Inspiration Uses",
		file: "classes.md",
		heading: "Level 1: Bardic Inspiration",
	},
	{
		slug: "druid-wild-shape-uses",
		displayName: "Wild Shape Uses",
		file: "classes.md",
		heading: "Level 2: Wild Shape",
	},
	{
		slug: "paladin-lay-on-hands",
		displayName: "Lay On Hands Pool",
		file: "classes.md",
		heading: "Level 1: Lay On Hands",
	},
	{
		slug: "ranger-favored-enemy-uses",
		displayName: "Favored Enemy Uses",
		file: "classes.md",
		heading: "Level 1: Favored Enemy",
	},
	{
		slug: "sorcerer-innate-sorcery-uses",
		displayName: "Innate Sorcery Uses",
		file: "classes.md",
		heading: "Level 1: Innate Sorcery",
	},
	{
		slug: "wizard-arcane-recovery-uses",
		displayName: "Arcane Recovery Uses",
		file: "classes.md",
		heading: "Level 1: Arcane Recovery",
	},
	{
		slug: "warlock-magical-cunning-uses",
		displayName: "Magical Cunning Uses",
		file: "classes.md",
		heading: "Level 2: Magical Cunning",
	},
	{
		slug: "sorcerer-sorcery-points",
		displayName: "Sorcery Points",
		file: "classes.md",
		heading: "Level 2: Font of Magic",
	},
	{
		slug: "fighter-second-wind-uses",
		displayName: "Second Wind Uses",
		file: "classes.md",
		heading: "Level 1: Second Wind",
	},
	{
		slug: "fighter-action-surge-uses",
		displayName: "Action Surge Uses",
		file: "classes.md",
		heading: "Level 2: Action Surge",
	},
	{
		slug: "monk-focus-points",
		displayName: "Focus Points",
		file: "classes.md",
		heading: "Level 2: Monk's Focus",
	},
	{
		slug: "monk-martial-arts-die-sides",
		displayName: "Martial Arts Die Sides",
		file: "classes.md",
		heading: "Level 1: Martial Arts",
	},
	{
		slug: "rogue-sneak-attack-dice",
		displayName: "Sneak Attack Dice",
		file: "classes.md",
		heading: "Level 1: Sneak Attack",
	},
	{
		slug: "magic-item-wand-of-fireballs-charges",
		displayName: "Wand of Fireballs Charges",
		file: "magic-items.md",
		heading: "Charges",
	},
	{
		slug: "magic-item-wand-of-magic-missiles-charges",
		displayName: "Wand of Magic Missiles Charges",
		file: "magic-items.md",
		heading: "Charges",
	},
	{
		slug: "heroic-inspiration",
		displayName: "Heroic Inspiration",
		file: "rules-glossary.md",
		heading: "Heroic Inspiration",
	},
	{
		slug: "spellcasting-mod",
		displayName: "Spellcasting Modifier",
		file: "character-creation.md",
		heading: "Spellcasting",
	},
];

const abilityEntries: ResourceFlavorEntry[] = buildAbilityUnits().map((unit) => ({
	slug: unit.code,
	displayName: unit.displayName,
	srdText: unit.description,
}));

const dcEntries: ResourceFlavorEntry[] = buildGenericCheckSubjects().map((subject) => ({
	slug: resourceFlavorSlug(genericCheckDcOverrideSuffix(subject)),
	displayName: subject.displayName,
	file: "rules-glossary.md",
	heading: "Difficulty Class",
}));

const ALL_ENTRIES = [...ENTRIES, ...abilityEntries, ...dcEntries];

const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: ALL_ENTRIES.map((entry) => ({
		id: `resource/${entry.slug}`,
		display_name: entry.displayName,
		prompt_id: "flavor-resource",
		model: "openai/gpt-5.6-terra",
		core_traits: { srd_text: entrySrdText(entry) },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
