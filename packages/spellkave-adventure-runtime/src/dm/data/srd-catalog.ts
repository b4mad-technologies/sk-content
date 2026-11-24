/**
 * Runtime SRD catalog snapshot (sk-jay0.7.21).
 *
 * Values moved out of `@spellkave/srd-cc` chapter source so the npc-host
 * module graph does not import the ruleset compiler (ADR-0115 build/run).
 * Authoring / generate still reads srd-cc; this table is the run-time copy.
 *
 * `unarmoredDefenseExtraAbility` (sk-jay0.1.23.36.13): the ability whose
 * modifier a class's Unarmored Defense feature adds to base AC on top of
 * Dexterity, or `null` for classes with no such feature. Only Barbarian
 * (`classes.md:258-260`: "10 + your Dexterity modifier + your Constitution
 * modifier") and Monk (`classes.md:5145-5147`: "10 + your Dexterity
 * modifier + your Wisdom modifier") have it — mirrors srd-cc's own
 * `BARBARIAN_UNARMORED_AC_MACRO_BODY` / `MONK_UNARMORED_AC_MACRO_BODY`
 * (`chapters/classes/martial-fragments.ts`), whose `dsl_macro_definitions`
 * rows land in the bundle but (as of this fix) nothing calls them at
 * runtime — see `pregen-confirm.ts`'s own use of this field for the
 * confirm-time seed that fills that gap.
 */
export const SRD_CLASS_CATALOG = [
	{
		slug: "barbarian",
		displayName: "Barbarian",
		primaryAbilityText: "Strength",
		skillProficienciesText:
			"Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival",
		startingEquipmentText:
			"Choose A or B: (A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP; or (B) 75 GP",
		hitDieSize: 12,
		level1HpBase: 12,
		fixedHpPerLevelBase: 7,
		unarmoredDefenseExtraAbility: "con",
		standardArray: {
			str: 15,
			dex: 13,
			con: 14,
			int: 10,
			wis: 12,
			cha: 8,
		},
		sourcePk: "srd-2024_barbarian",
	},
	{
		slug: "bard",
		displayName: "Bard",
		primaryAbilityText: "Charisma",
		skillProficienciesText: "Choose any 3 skills (see Playing the Game)",
		startingEquipmentText:
			"Choose A or B: (A) Leather Armor, 2 Daggers, Musical Instrument of your choice, Entertainer's Pack, and 19 GP; or (B) 90 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 8,
			dex: 14,
			con: 12,
			int: 13,
			wis: 10,
			cha: 15,
		},
		sourcePk: "srd-2024_bard",
	},
	{
		slug: "cleric",
		displayName: "Cleric",
		primaryAbilityText: "Wisdom",
		skillProficienciesText: "Choose 2: History, Insight, Medicine, Persuasion, or Religion",
		startingEquipmentText:
			"Choose A or B: (A) Chain Shirt, Shield, Mace, Holy Symbol, Priest's Pack, and 7 GP; or (B) 110 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 14,
			dex: 8,
			con: 13,
			int: 10,
			wis: 15,
			cha: 12,
		},
		sourcePk: "srd-2024_cleric",
	},
	{
		slug: "druid",
		displayName: "Druid",
		primaryAbilityText: "Wisdom",
		skillProficienciesText:
			"Choose 2: Animal Handling, Arcana, Insight, Medicine, Nature, Perception, Religion, or Survival",
		startingEquipmentText:
			"Choose A or B: (A) Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Explorer's Pack, Herbalism Kit, and 9 GP; or (B) 50 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 8,
			dex: 12,
			con: 14,
			int: 13,
			wis: 15,
			cha: 10,
		},
		sourcePk: "srd-2024_druid",
	},
	{
		slug: "fighter",
		displayName: "Fighter",
		primaryAbilityText: "Strength or Dexterity",
		skillProficienciesText:
			"Choose 2: Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Persuasion, Perception, or Survival",
		startingEquipmentText:
			"Choose A, B, or C: (A) Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer's Pack, and 4 GP; (B) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, and 11 GP; or (C) 155 GP",
		hitDieSize: 10,
		level1HpBase: 10,
		fixedHpPerLevelBase: 6,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 15,
			dex: 14,
			con: 13,
			int: 8,
			wis: 10,
			cha: 12,
		},
		sourcePk: "srd-2024_fighter",
	},
	{
		slug: "monk",
		displayName: "Monk",
		primaryAbilityText: "Dexterity and Wisdom",
		skillProficienciesText:
			"Choose 2: Acrobatics, Athletics, History, Insight, Religion, or Stealth",
		startingEquipmentText:
			"Choose A or B: (A) Spear, 5 Daggers, Artisan's Tools or Musical Instrument chosen for the tool proficiency above, Explorer's Pack, and 11 GP; or (B) 50 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: "wis",
		standardArray: {
			str: 12,
			dex: 15,
			con: 13,
			int: 10,
			wis: 14,
			cha: 8,
		},
		sourcePk: "srd-2024_monk",
	},
	{
		slug: "paladin",
		displayName: "Paladin",
		primaryAbilityText: "Strength and Charisma",
		skillProficienciesText:
			"Choose 2: Athletics, Insight, Intimidation, Medicine, Persuasion, or Religion",
		startingEquipmentText:
			"Choose A or B: (A) Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest's Pack, and 9 GP; or (B) 150 GP",
		hitDieSize: 10,
		level1HpBase: 10,
		fixedHpPerLevelBase: 6,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 15,
			dex: 10,
			con: 13,
			int: 8,
			wis: 12,
			cha: 14,
		},
		sourcePk: "srd-2024_paladin",
	},
	{
		slug: "ranger",
		displayName: "Ranger",
		primaryAbilityText: "Dexterity and Wisdom",
		skillProficienciesText:
			"Choose 3: Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, or Survival",
		startingEquipmentText:
			"Choose A or B: (A) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus (sprig of mistletoe), Explorer's Pack, and 7 GP; or (B) 150 GP",
		hitDieSize: 10,
		level1HpBase: 10,
		fixedHpPerLevelBase: 6,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 12,
			dex: 15,
			con: 13,
			int: 8,
			wis: 14,
			cha: 10,
		},
		sourcePk: "srd-2024_ranger",
	},
	{
		slug: "rogue",
		displayName: "Rogue",
		primaryAbilityText: "Dexterity",
		skillProficienciesText:
			"Choose 4: Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Persuasion, Sleight of Hand, or Stealth",
		startingEquipmentText:
			"Choose A or B: (A) Leather Armor, 2 Daggers, Shortsword, Shortbow, 20 Arrows, Quiver, Thieves' Tools, Burglar's Pack, and 8 GP; or (B) 100 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 12,
			dex: 15,
			con: 13,
			int: 14,
			wis: 10,
			cha: 8,
		},
		sourcePk: "srd-2024_rogue",
	},
	{
		slug: "sorcerer",
		displayName: "Sorcerer",
		primaryAbilityText: "Charisma",
		skillProficienciesText:
			"Choose 2: Arcana, Deception, Insight, Intimidation, Persuasion, or Religion",
		startingEquipmentText:
			"Choose A or B: (A) Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer's Pack, and 28 GP; or (B) 50 GP",
		hitDieSize: 6,
		level1HpBase: 6,
		fixedHpPerLevelBase: 4,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 10,
			dex: 13,
			con: 14,
			int: 8,
			wis: 12,
			cha: 15,
		},
		sourcePk: "srd-2024_sorcerer",
	},
	{
		slug: "warlock",
		displayName: "Warlock",
		primaryAbilityText: "Charisma",
		skillProficienciesText:
			"Choose 2: Arcana, Deception, History, Intimidation, Investigation, Nature, or Religion",
		startingEquipmentText:
			"Choose A or B: (A) Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb), Book (occult lore), Scholar's Pack, and 15 GP; or (B) 100 GP",
		hitDieSize: 8,
		level1HpBase: 8,
		fixedHpPerLevelBase: 5,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 8,
			dex: 14,
			con: 13,
			int: 12,
			wis: 10,
			cha: 15,
		},
		sourcePk: "srd-2024_warlock",
	},
	{
		slug: "wizard",
		displayName: "Wizard",
		primaryAbilityText: "Intelligence",
		skillProficienciesText:
			"Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion",
		startingEquipmentText:
			"Choose A or B: (A) 2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, and 5 GP; or (B) 55 GP",
		hitDieSize: 6,
		level1HpBase: 6,
		fixedHpPerLevelBase: 4,
		unarmoredDefenseExtraAbility: null,
		standardArray: {
			str: 8,
			dex: 12,
			con: 13,
			int: 15,
			wis: 14,
			cha: 10,
		},
		sourcePk: "srd-2024_wizard",
	},
] as const;

export const SRD_SPECIES_CATALOG = [
	{
		slug: "dragonborn",
		displayName: "Dragonborn",
		speedCells: 6,
	},
	{
		slug: "dwarf",
		displayName: "Dwarf",
		speedCells: 6,
	},
	{
		slug: "elf",
		displayName: "Elf",
		speedCells: 6,
	},
	{
		slug: "gnome",
		displayName: "Gnome",
		speedCells: 6,
	},
	{
		slug: "goliath",
		displayName: "Goliath",
		speedCells: 7,
	},
	{
		slug: "halfling",
		displayName: "Halfling",
		speedCells: 6,
	},
	{
		slug: "human",
		displayName: "Human",
		speedCells: 6,
	},
	{
		slug: "orc",
		displayName: "Orc",
		speedCells: 6,
	},
	{
		slug: "tiefling",
		displayName: "Tiefling",
		speedCells: 6,
	},
] as const;

export const SRD_BACKGROUND_CATALOG = [
	{
		slug: "acolyte",
		displayName: "Acolyte",
		skillCapabilityIds: ["srd/skill/insight", "srd/skill/religion"],
		featEntityId: "srd/feat/magic-initiate",
	},
	{
		slug: "criminal",
		displayName: "Criminal",
		skillCapabilityIds: ["srd/skill/sleight-of-hand", "srd/skill/stealth"],
		featEntityId: "srd/feat/alert",
	},
	{
		slug: "sage",
		displayName: "Sage",
		skillCapabilityIds: ["srd/skill/arcana", "srd/skill/history"],
		featEntityId: "srd/feat/magic-initiate",
	},
	{
		slug: "soldier",
		displayName: "Soldier",
		skillCapabilityIds: ["srd/skill/athletics", "srd/skill/intimidation"],
		featEntityId: "srd/feat/savage-attacker",
	},
] as const;

export const SRD_SKILL_CATALOG: readonly { slug: string; displayName: string }[] = [
	{
		slug: "acrobatics",
		displayName: "Skill: Acrobatics",
	},
	{
		slug: "animal-handling",
		displayName: "Skill: Animal Handling",
	},
	{
		slug: "arcana",
		displayName: "Skill: Arcana",
	},
	{
		slug: "athletics",
		displayName: "Skill: Athletics",
	},
	{
		slug: "deception",
		displayName: "Skill: Deception",
	},
	{
		slug: "history",
		displayName: "Skill: History",
	},
	{
		slug: "insight",
		displayName: "Skill: Insight",
	},
	{
		slug: "intimidation",
		displayName: "Skill: Intimidation",
	},
	{
		slug: "investigation",
		displayName: "Skill: Investigation",
	},
	{
		slug: "medicine",
		displayName: "Skill: Medicine",
	},
	{
		slug: "nature",
		displayName: "Skill: Nature",
	},
	{
		slug: "perception",
		displayName: "Skill: Perception",
	},
	{
		slug: "performance",
		displayName: "Skill: Performance",
	},
	{
		slug: "persuasion",
		displayName: "Skill: Persuasion",
	},
	{
		slug: "religion",
		displayName: "Skill: Religion",
	},
	{
		slug: "sleight-of-hand",
		displayName: "Skill: Sleight Of Hand",
	},
	{
		slug: "stealth",
		displayName: "Skill: Stealth",
	},
	{
		slug: "survival",
		displayName: "Skill: Survival",
	},
] as const;

export const SRD_XP_THRESHOLD_BY_LEVEL: Readonly<Record<number, number>> = {
	"1": 0,
	"2": 300,
	"3": 900,
	"4": 2700,
	"5": 6500,
	"6": 14000,
	"7": 23000,
	"8": 34000,
	"9": 48000,
	"10": 64000,
	"11": 85000,
	"12": 100000,
	"13": 120000,
	"14": 140000,
	"15": 165000,
	"16": 195000,
	"17": 225000,
	"18": 265000,
	"19": 305000,
	"20": 355000,
};

export const SRD_POINT_COST_BY_SCORE: Readonly<Record<number, number>> = {
	"8": 0,
	"9": 1,
	"10": 2,
	"11": 3,
	"12": 4,
	"13": 5,
	"14": 7,
	"15": 9,
};

export interface RuntimeCasterProfile {
	classSlug: string;
	classDisplayName: string;
	ability: "int" | "wis" | "cha";
	abilityAnchor: string;
	featureSlug: "spellcasting" | "pact-magic";
	featureAnchor: string;
	ritualCasting: boolean;
	classSourcePk: string;
}

export const SRD_CASTER_PROFILES: readonly RuntimeCasterProfile[] = [
	{
		classSlug: "bard",
		classDisplayName: "Bard",
		ability: "cha",
		abilityAnchor: "classes.md:884",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:864",
		ritualCasting: false,
		classSourcePk: "srd-2024_bard",
	},
	{
		classSlug: "cleric",
		classDisplayName: "Cleric",
		ability: "wis",
		abilityAnchor: "classes.md:2201",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:2181",
		ritualCasting: false,
		classSourcePk: "srd-2024_cleric",
	},
	{
		classSlug: "druid",
		classDisplayName: "Druid",
		ability: "wis",
		abilityAnchor: "classes.md:3511",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:3491",
		ritualCasting: false,
		classSourcePk: "srd-2024_druid",
	},
	{
		classSlug: "paladin",
		classDisplayName: "Paladin",
		ability: "cha",
		abilityAnchor: "classes.md:5641",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:5627",
		ritualCasting: false,
		classSourcePk: "srd-2024_paladin",
	},
	{
		classSlug: "ranger",
		classDisplayName: "Ranger",
		ability: "wis",
		abilityAnchor: "classes.md:6410",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:6396",
		ritualCasting: false,
		classSourcePk: "srd-2024_ranger",
	},
	{
		classSlug: "sorcerer",
		classDisplayName: "Sorcerer",
		ability: "cha",
		abilityAnchor: "classes.md:7623",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:7605",
		ritualCasting: false,
		classSourcePk: "srd-2024_sorcerer",
	},
	{
		classSlug: "warlock",
		classDisplayName: "Warlock",
		ability: "cha",
		abilityAnchor: "classes.md:8994",
		featureSlug: "pact-magic",
		featureAnchor: "classes.md:8974",
		ritualCasting: false,
		classSourcePk: "srd-2024_warlock",
	},
	{
		classSlug: "wizard",
		classDisplayName: "Wizard",
		ability: "int",
		abilityAnchor: "classes.md:10233",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:10209",
		ritualCasting: true,
		classSourcePk: "srd-2024_wizard",
	},
] as const;

export const SRD_CASTER_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
	bard: {
		class: "bard",
		ability: "cha",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 4,
			"2": 5,
			"3": 6,
			"4": 7,
		},
		cantrips_known_by_level: {
			"1": 2,
			"2": 2,
			"3": 2,
			"4": 3,
		},
	},
	cleric: {
		class: "cleric",
		ability: "wis",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 4,
			"2": 5,
			"3": 6,
			"4": 7,
		},
		cantrips_known_by_level: {
			"1": 3,
			"2": 3,
			"3": 3,
			"4": 4,
		},
	},
	druid: {
		class: "druid",
		ability: "wis",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 4,
			"2": 5,
			"3": 6,
			"4": 7,
		},
		cantrips_known_by_level: {
			"1": 2,
			"2": 2,
			"3": 2,
			"4": 3,
		},
	},
	paladin: {
		class: "paladin",
		ability: "cha",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 2,
			"2": 3,
			"3": 4,
			"4": 5,
		},
	},
	ranger: {
		class: "ranger",
		ability: "wis",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 2,
			"2": 3,
			"3": 4,
			"4": 5,
		},
	},
	sorcerer: {
		class: "sorcerer",
		ability: "cha",
		feature: "spellcasting",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 2,
			"2": 4,
			"3": 6,
			"4": 7,
		},
		cantrips_known_by_level: {
			"1": 4,
			"2": 4,
			"3": 4,
			"4": 5,
		},
	},
	warlock: {
		class: "warlock",
		ability: "cha",
		feature: "pact_magic",
		ritual_casting: false,
		prepared_spells_by_level: {
			"1": 2,
			"2": 3,
			"3": 4,
			"4": 5,
		},
		cantrips_known_by_level: {
			"1": 2,
			"2": 2,
			"3": 2,
			"4": 3,
		},
	},
	wizard: {
		class: "wizard",
		ability: "int",
		feature: "spellcasting",
		ritual_casting: true,
		prepared_spells_by_level: {
			"1": 4,
			"2": 5,
			"3": 6,
			"4": 7,
		},
		cantrips_known_by_level: {
			"1": 3,
			"2": 3,
			"3": 3,
			"4": 4,
		},
	},
};

/** Pure caster slot table (srd-cc `slotGrantsForProfile`). Used when a live
 * AuthorTarget omits `srd.spell_slot_grant` rows at confirm. */
export const SRD_SPELL_SLOT_GRANTS: readonly {
	classSlug: string;
	level: number;
	slotLevel: number;
	count: number;
}[] = [
	{ classSlug: "bard", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "bard", level: 2, slotLevel: 1, count: 3 },
	{ classSlug: "bard", level: 3, slotLevel: 1, count: 4 },
	{ classSlug: "bard", level: 4, slotLevel: 1, count: 4 },
	{ classSlug: "bard", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "bard", level: 4, slotLevel: 2, count: 3 },
	{ classSlug: "cleric", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "cleric", level: 2, slotLevel: 1, count: 3 },
	{ classSlug: "cleric", level: 3, slotLevel: 1, count: 4 },
	{ classSlug: "cleric", level: 4, slotLevel: 1, count: 4 },
	{ classSlug: "cleric", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "cleric", level: 4, slotLevel: 2, count: 3 },
	{ classSlug: "druid", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "druid", level: 2, slotLevel: 1, count: 3 },
	{ classSlug: "druid", level: 3, slotLevel: 1, count: 4 },
	{ classSlug: "druid", level: 4, slotLevel: 1, count: 4 },
	{ classSlug: "druid", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "druid", level: 4, slotLevel: 2, count: 3 },
	{ classSlug: "paladin", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "paladin", level: 2, slotLevel: 1, count: 2 },
	{ classSlug: "paladin", level: 3, slotLevel: 1, count: 3 },
	{ classSlug: "paladin", level: 4, slotLevel: 1, count: 3 },
	{ classSlug: "ranger", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "ranger", level: 2, slotLevel: 1, count: 2 },
	{ classSlug: "ranger", level: 3, slotLevel: 1, count: 3 },
	{ classSlug: "ranger", level: 4, slotLevel: 1, count: 3 },
	{ classSlug: "sorcerer", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "sorcerer", level: 2, slotLevel: 1, count: 3 },
	{ classSlug: "sorcerer", level: 3, slotLevel: 1, count: 4 },
	{ classSlug: "sorcerer", level: 4, slotLevel: 1, count: 4 },
	{ classSlug: "sorcerer", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "sorcerer", level: 4, slotLevel: 2, count: 3 },
	{ classSlug: "warlock", level: 1, slotLevel: 1, count: 1 },
	{ classSlug: "warlock", level: 2, slotLevel: 1, count: 2 },
	{ classSlug: "warlock", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "warlock", level: 4, slotLevel: 2, count: 2 },
	{ classSlug: "wizard", level: 1, slotLevel: 1, count: 2 },
	{ classSlug: "wizard", level: 2, slotLevel: 1, count: 3 },
	{ classSlug: "wizard", level: 3, slotLevel: 1, count: 4 },
	{ classSlug: "wizard", level: 4, slotLevel: 1, count: 4 },
	{ classSlug: "wizard", level: 3, slotLevel: 2, count: 2 },
	{ classSlug: "wizard", level: 4, slotLevel: 2, count: 3 },
];
