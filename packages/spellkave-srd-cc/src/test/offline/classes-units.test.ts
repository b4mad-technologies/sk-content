// K1 offline proof (`ledger/classes.md`): the 12 base-class + 12 subclass
// units — hit die / hp_per_level / saving throws (base classes), parent
// linkage + the die-inheritance-quirk guard (subclasses), and the
// srd.class*/srd.subclass* tag catalogs.
import { describe, expect, it } from "vitest";

import {
	buildClassDescription,
	buildClassTagValueUnits,
	buildClassUnits,
	buildSubclassDescription,
	buildSubclassTagValueUnits,
	buildSubclassUnits,
	CLASS_CLASS_TAG,
	CLASS_TAG_PREFIX,
	HIT_DIE_MAX,
	HIT_DIE_MIN,
	SUBCLASS_CLASS_TAG,
	SUBCLASS_TAG_PREFIX,
} from "../../chapters/classes/classes-units";
import { readBaseCharacterClasses, readSubclasses } from "../../open5e/character-class";

const EXPECTED_HIT_DIE_BY_SLUG: Record<string, number> = {
	barbarian: 12,
	bard: 8,
	cleric: 8,
	druid: 8,
	fighter: 10,
	monk: 8,
	paladin: 10,
	ranger: 10,
	rogue: 8,
	sorcerer: 6,
	warlock: 8,
	wizard: 6,
};

const EXPECTED_HP_PER_LEVEL_BY_SLUG: Record<string, number> = {
	barbarian: 7,
	fighter: 6,
	paladin: 6,
	ranger: 6,
	bard: 5,
	cleric: 5,
	druid: 5,
	monk: 5,
	rogue: 5,
	warlock: 5,
	sorcerer: 4,
	wizard: 4,
};

// Hand-transcribed from each class' own Core Traits table's "Saving Throw
// Proficiencies" row in `cache/markdown/classes.md` (NOT derived from
// `buildClassUnits()` itself — an independent read, so a bug in
// `parseSavingThrowProficienciesText` still fails this test), IN THE
// MARKDOWN'S OWN WRITTEN ORDER (the order decision this slice made —
// `classes-units.ts`'s own header). Fighter (`:4594`) and Monk (`:4911`)
// are the two classes where `CharacterClass.json`'s `saving_throws` is
// flat-out WRONG, not just differently ordered — see
// `KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES` in `classes-units.ts`.
const EXPECTED_SAVING_THROWS_BY_SLUG: Record<string, readonly [string, string]> = {
	barbarian: ["str", "con"], // "Strength and Constitution", classes.md:18
	bard: ["dex", "cha"], // "Dexterity and Charisma", classes.md:388
	cleric: ["wis", "cha"], // "Wisdom and Charisma", classes.md:1762
	druid: ["int", "wis"], // "Intelligence and Wisdom", classes.md:3028
	fighter: ["str", "con"], // "Strength and Constitution", classes.md:4594
	monk: ["str", "dex"], // "Strength and Dexterity", classes.md:4911
	paladin: ["wis", "cha"], // "Wisdom and Charisma", classes.md:5305
	ranger: ["str", "dex"], // "Strength and Dexterity", classes.md:6084
	rogue: ["dex", "int"], // "Dexterity and Intelligence", classes.md:6856
	sorcerer: ["con", "cha"], // "Constitution and Charisma", classes.md:7186
	warlock: ["wis", "cha"], // "Wisdom and Charisma", classes.md:8705
	wizard: ["int", "wis"], // "Intelligence and Wisdom", classes.md:9813
};

const EXPECTED_SUBCLASS_PARENT_BY_SLUG: Record<string, string> = {
	"path-of-the-berserker": "barbarian",
	"college-of-lore": "bard",
	"life-domain": "cleric",
	"circle-of-the-land": "druid",
	champion: "fighter",
	"warrior-of-the-open-hand": "monk",
	"oath-of-devotion": "paladin",
	hunter: "ranger",
	thief: "rogue",
	"draconic-sorcery": "sorcerer",
	"fiend-patron": "warlock",
	evoker: "wizard",
};

describe("buildClassUnits", () => {
	it("builds exactly the 12 base classes, CharacterClass.json pk order", () => {
		const units = buildClassUnits();
		expect(units.map((unit) => unit.slug)).toEqual([
			"barbarian",
			"bard",
			"cleric",
			"druid",
			"fighter",
			"monk",
			"paladin",
			"ranger",
			"rogue",
			"sorcerer",
			"warlock",
			"wizard",
		]);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/class/${unit.slug}`);
		}
	});

	it("resolves every base class' hit die exactly (D6/D8/D10/D12 per CharacterClass.json)", () => {
		for (const unit of buildClassUnits()) {
			expect(unit.hitDieSize).toBe(EXPECTED_HIT_DIE_BY_SLUG[unit.slug]);
			expect(unit.hitDieSize).toBeGreaterThanOrEqual(HIT_DIE_MIN);
			expect(unit.hitDieSize).toBeLessThanOrEqual(HIT_DIE_MAX);
		}
	});

	it("resolves every base class' hp_per_level exactly (Fixed Hit Points by Class, character-creation.md:779-804)", () => {
		for (const unit of buildClassUnits()) {
			expect(unit.hpPerLevel).toBe(EXPECTED_HP_PER_LEVEL_BY_SLUG[unit.slug]);
		}
	});

	it("resolves every base class' saving throws to its OWN Core Traits table row, in the markdown's written order (never CharacterClass.json's raw/alphabetical value)", () => {
		for (const unit of buildClassUnits()) {
			expect(unit.savingThrows).toEqual(EXPECTED_SAVING_THROWS_BY_SLUG[unit.slug]);
		}
	});

	it("carries the Core Traits table's Primary Ability/Skill/Weapon/Armor text for every class", () => {
		for (const unit of buildClassUnits()) {
			expect(unit.primaryAbilityText.length).toBeGreaterThan(0);
			expect(unit.skillProficienciesText.length).toBeGreaterThan(0);
			expect(unit.weaponProficienciesText.length).toBeGreaterThan(0);
			expect(unit.armorTrainingText.length).toBeGreaterThan(0);
			expect(unit.startingEquipmentText.length).toBeGreaterThan(0);
		}
	});

	it("carries a Tool Proficiencies row for exactly Bard/Druid/Monk/Rogue", () => {
		const withTools = buildClassUnits()
			.filter((unit) => unit.toolProficienciesText !== undefined)
			.map((unit) => unit.slug)
			.sort();
		expect(withTools).toEqual(["bard", "druid", "monk", "rogue"]);
	});

	it("CharacterClass.json still carries exactly 12 base-class rows (ledger staleness guard)", () => {
		expect(readBaseCharacterClasses()).toHaveLength(12);
	});
});

describe("buildClassDescription", () => {
	it("is the authored flavor blurb, not Core Traits or compiler notes", () => {
		const DEV_MARKERS = [
			"Source: cache/",
			"pk='",
			"Caster Type:",
			"Primary Ability:",
			"Hit Point Die:",
		];
		for (const unit of buildClassUnits()) {
			const description = buildClassDescription(unit);
			expect(description.length).toBeGreaterThan(40);
			for (const marker of DEV_MARKERS)
				expect(
					description,
					`${unit.slug}: '${marker}' does not belong on the website card`,
				).not.toContain(marker);
		}
	});

	it("retains unit-level provenance for the srd.text attachment (the structured source the export parses)", () => {
		for (const unit of buildClassUnits()) {
			expect(unit.sourcePk.length).toBeGreaterThan(0);
			expect(unit.coreTraitsAnchor).toMatch(/^classes\.md:/);
		}
	});

	it("keeps markdown-order saving throws on the unit (Fighter is Strength and Constitution, never Dexterity) — not in the website blurb", () => {
		for (const unit of buildClassUnits()) {
			const expected = EXPECTED_SAVING_THROWS_BY_SLUG[unit.slug];
			if (expected === undefined)
				throw new Error(`test setup: no expected saves for '${unit.slug}'.`);
			expect(unit.savingThrows).toEqual(expected);
		}
	});
});

describe("buildClassTagValueUnits", () => {
	it("emits the class row (srd.class, bare 'srd' prefix) plus 12 srd.class.<slug> rows (CLASS_TAG_PREFIX)", () => {
		const units = buildClassTagValueUnits();
		expect(units).toHaveLength(13);
		const classRow = units.find((unit) => unit.tag === CLASS_CLASS_TAG);
		expect(classRow?.prefix).toBe("srd");
		const valueRows = units.filter((unit) => unit.tag !== CLASS_CLASS_TAG);
		expect(valueRows).toHaveLength(12);
		for (const row of valueRows) {
			expect(row.prefix).toBe(CLASS_TAG_PREFIX);
			expect(row.tag.startsWith(`${CLASS_TAG_PREFIX}.`)).toBe(true);
		}
	});
});

describe("buildSubclassUnits", () => {
	it("builds exactly the 12 subclasses, CharacterClass.json pk order", () => {
		const units = buildSubclassUnits();
		expect(units.map((unit) => unit.slug).sort()).toEqual(
			Object.keys(EXPECTED_SUBCLASS_PARENT_BY_SLUG).sort(),
		);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/subclass/${unit.slug}`);
		}
	});

	it("resolves every subclass' parent class exactly, never trusting the subclass row's own hit_dice/caster_type", () => {
		for (const unit of buildSubclassUnits()) {
			expect(unit.parentSlug).toBe(EXPECTED_SUBCLASS_PARENT_BY_SLUG[unit.slug]);
			expect(unit.parentClassTag).toBe(`${CLASS_TAG_PREFIX}.${unit.parentSlug}`);
		}
	});

	it("carries a non-empty flavor line and summary paragraph for every subclass", () => {
		for (const unit of buildSubclassUnits()) {
			expect(unit.flavorText.length).toBeGreaterThan(0);
			expect(unit.summaryText.length).toBeGreaterThan(0);
		}
	});

	it("CharacterClass.json still carries exactly 12 subclass rows (ledger staleness guard)", () => {
		expect(readSubclasses()).toHaveLength(12);
	});
});

describe("buildSubclassDescription", () => {
	it("keeps developer detail out and NEVER repeats a hit-die/hp_per_level number (die-inheritance quirk guard stays in the generator, not player text — sk-jay0.3.5.95)", () => {
		const DEV_MARKERS = ["Source: cache/", "pk='", "cache/markdown/", "quirk guard", "K2+ scope"];
		for (const unit of buildSubclassUnits()) {
			const description = buildSubclassDescription(unit);
			for (const marker of DEV_MARKERS)
				expect(
					description,
					`${unit.slug}: '${marker}' is developer detail — move it to its durable home, not player text`,
				).not.toContain(marker);
			expect(description.length).toBeGreaterThan(40);
			expect(description).not.toContain(`_${unit.flavorText}_`);
			expect(description).not.toMatch(/\bD\d+ per\b/);
		}
	});
});

describe("buildSubclassTagValueUnits", () => {
	it("emits the class row (srd.subclass, bare 'srd' prefix) plus 12 srd.subclass.<slug> rows (SUBCLASS_TAG_PREFIX)", () => {
		const units = buildSubclassTagValueUnits();
		expect(units).toHaveLength(13);
		const classRow = units.find((unit) => unit.tag === SUBCLASS_CLASS_TAG);
		expect(classRow?.prefix).toBe("srd");
		const valueRows = units.filter((unit) => unit.tag !== SUBCLASS_CLASS_TAG);
		expect(valueRows).toHaveLength(12);
		for (const row of valueRows) {
			expect(row.prefix).toBe(SUBCLASS_TAG_PREFIX);
			expect(row.tag.startsWith(`${SUBCLASS_TAG_PREFIX}.`)).toBe(true);
		}
	});
});
