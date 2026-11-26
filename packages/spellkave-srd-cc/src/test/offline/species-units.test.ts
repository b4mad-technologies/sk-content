// O2 offline proof (`ledger/character-origins.md`): the 9 Species units —
// size categories (incl. Human/Tiefling's choice), speed (30 ft everywhere
// except Goliath 35), the srd/size rank derivation, and the srd.species*/
// srd.creature_size* tag catalogs.
import { describe, expect, it } from "vitest";

import {
	buildCreatureSizeTagValueUnits,
	buildSpeciesDescription,
	buildSpeciesTagValueUnits,
	buildSpeciesUnits,
	CREATURE_SIZE_TAG_PREFIX,
	creatureSizeRankByCategory,
	SIZE_MAX,
	SIZE_MIN,
	SPECIES_CLASS_TAG,
	SPECIES_TAG_PREFIX,
} from "../../chapters/character-origins/species-units";
import { creatureSizeTable } from "../../chapters/playing-the-game/creature-size-units";
import { readSpecies } from "../../open5e/species";

describe("buildSpeciesUnits", () => {
	it("builds exactly the nine Species, Species.json pk order", () => {
		const units = buildSpeciesUnits();
		expect(units.map((unit) => unit.slug)).toEqual([
			"dragonborn",
			"dwarf",
			"elf",
			"gnome",
			"goliath",
			"halfling",
			"human",
			"orc",
			"tiefling",
		]);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/species/${unit.slug}`);
		}
	});

	it("resolves each species' size category exactly (Gnome/Halfling Small, Human/Tiefling choice, everyone else Medium)", () => {
		const bySlug = new Map(buildSpeciesUnits().map((unit) => [unit.slug, unit]));
		const small = new Set(["gnome", "halfling"]);
		const choice = new Set(["human", "tiefling"]);
		for (const [slug, unit] of bySlug) {
			if (choice.has(slug)) {
				expect(unit.sizeCategories).toEqual(["Medium", "Small"]);
				expect(unit.isSizeChoice).toBe(true);
			} else if (small.has(slug)) {
				expect(unit.sizeCategories).toEqual(["Small"]);
				expect(unit.isSizeChoice).toBe(false);
			} else {
				expect(unit.sizeCategories).toEqual(["Medium"]);
				expect(unit.isSizeChoice).toBe(false);
			}
		}
	});

	it("resolves every species' Speed to 30 feet / 6 cells, except Goliath at 35 feet / 7 cells", () => {
		const bySlug = new Map(buildSpeciesUnits().map((unit) => [unit.slug, unit]));
		for (const [slug, unit] of bySlug) {
			if (slug === "goliath") {
				expect(unit.speedFeet).toBe(35);
				expect(unit.speedCells).toBe(7);
			} else {
				expect(unit.speedFeet).toBe(30);
				expect(unit.speedCells).toBe(6);
			}
		}
	});

	it("seeds the choice-size species' default srd/size rank to Medium, the SRD's own first-listed option", () => {
		const ranks = creatureSizeRankByCategory();
		const mediumRank = ranks.Medium;
		expect(mediumRank).toBeDefined();
		const human = buildSpeciesUnits().find((unit) => unit.slug === "human");
		const tiefling = buildSpeciesUnits().find((unit) => unit.slug === "tiefling");
		expect(human?.defaultSizeRank).toBe(mediumRank);
		expect(tiefling?.defaultSizeRank).toBe(mediumRank);
	});

	it("Species.json still carries exactly 9 rows (ledger staleness guard)", () => {
		expect(readSpecies()).toHaveLength(9);
	});
});

describe("creatureSizeRankByCategory", () => {
	it("ranks Tiny=1 .. Gargantuan=6, matching creature-size-units.ts's own source order", () => {
		const ranks = creatureSizeRankByCategory();
		expect(ranks).toEqual({
			Tiny: 1,
			Small: 2,
			Medium: 3,
			Large: 4,
			Huge: 5,
			Gargantuan: 6,
		});
		expect(SIZE_MIN).toBe(1);
		expect(SIZE_MAX).toBe(6);
	});
});

describe("buildSpeciesDescription", () => {
	it("is the authored flavor blurb, not size/speed or compiler notes", () => {
		const DEV_MARKERS = ["Source: cache/", "pk='", "Creature Type:", "srd/size", "srd/speed"];
		for (const unit of buildSpeciesUnits()) {
			const description = buildSpeciesDescription(unit);
			expect(description.length).toBeGreaterThan(40);
			for (const marker of DEV_MARKERS) {
				expect(
					description,
					`${unit.slug}: '${marker}' does not belong on the website card`,
				).not.toContain(marker);
			}
		}
	});

	it("retains unit-level provenance and size facts for seeds/tags (not the website blurb)", () => {
		for (const unit of buildSpeciesUnits()) {
			expect(unit.sourcePk.length).toBeGreaterThan(0);
			expect(unit.markdownAnchor).toMatch(/^character-origins\.md:/);
			expect(unit.speedFeet).toBeGreaterThan(0);
		}
	});

	it("flags Human/Tiefling size choice on the unit, not the website blurb", () => {
		for (const slug of ["human", "tiefling"]) {
			const unit = buildSpeciesUnits().find((candidate) => candidate.slug === slug);
			if (unit === undefined) throw new Error(`test setup: no '${slug}' unit.`);
			expect(unit.isSizeChoice).toBe(true);
			expect(buildSpeciesDescription(unit)).not.toContain("player-chosen");
		}
	});
});

describe("buildSpeciesTagValueUnits", () => {
	it("emits the class row (srd.species, bare 'srd' prefix) plus 9 srd.species.<slug> rows (SPECIES_TAG_PREFIX)", () => {
		const units = buildSpeciesTagValueUnits();
		expect(units).toHaveLength(10);
		const classRow = units.find((unit) => unit.tag === SPECIES_CLASS_TAG);
		expect(classRow?.prefix).toBe("srd");
		const valueRows = units.filter((unit) => unit.tag !== SPECIES_CLASS_TAG);
		expect(valueRows).toHaveLength(9);
		for (const row of valueRows) {
			expect(row.prefix).toBe(SPECIES_TAG_PREFIX);
			expect(row.tag.startsWith(`${SPECIES_TAG_PREFIX}.`)).toBe(true);
		}
	});
});

describe("buildCreatureSizeTagValueUnits", () => {
	it("emits exactly the 6 srd.creature_size.<category> rows, no separate class row (same posture as srd.creature_type)", () => {
		const units = buildCreatureSizeTagValueUnits();
		expect(units).toHaveLength(6);
		expect(units.map((unit) => unit.tag)).toEqual(
			creatureSizeTable().map((row) => `${CREATURE_SIZE_TAG_PREFIX}.${row.size.toLowerCase()}`),
		);
		for (const row of units) {
			expect(row.prefix).toBe(CREATURE_SIZE_TAG_PREFIX);
		}
	});

	it("is a short size-category identity without compiler provenance", () => {
		const units = buildCreatureSizeTagValueUnits();
		for (const row of creatureSizeTable()) {
			const unit = units.find(
				(candidate) => candidate.tag === `${CREATURE_SIZE_TAG_PREFIX}.${row.size.toLowerCase()}`,
			);
			expect(unit?.description).toBe(`${row.size} — a creature size category.`);
			expect(unit?.description).not.toContain("Source:");
		}
	});
});
