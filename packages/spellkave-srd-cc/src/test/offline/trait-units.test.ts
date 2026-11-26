// O3 offline proof (`ledger/character-origins.md`): the 33 Trait units —
// entity ids (incl. the Darkvision species-qualification override),
// species linkage, the srd.trait* tag catalog, mechanization classification,
// and the two offline-pinned mechanized helpers (Dwarven Toughness's
// composition constant, Skillful's proof capability id).
import { describe, expect, it } from "vitest";
import {
	buildTraitDescription,
	buildTraitTagValueUnits,
	buildTraitUnits,
	dwarvenToughnessHpPerLevelBonus,
	RESOURCEFUL_TRAIT_TAG,
	skillfulProofSkillCapabilityId,
	TRAIT_CLASS_TAG,
	TRAIT_TAG_PREFIX,
} from "../../chapters/character-origins/trait-units";
import { readSpeciesTraits } from "../../open5e/species";

describe("readSpeciesTraits", () => {
	it("SpeciesTrait.json still carries exactly 51 rows, 33 of them non-SIZE/SPEED (ledger staleness guard)", () => {
		expect(readSpeciesTraits()).toHaveLength(33);
	});
});

describe("buildTraitUnits", () => {
	it("builds exactly 33 trait units, entity ids all srd/trait/<slug>", () => {
		const units = buildTraitUnits();
		expect(units).toHaveLength(33);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/trait/${unit.slug}`);
		}
	});

	it("every entity id is unique (Darkvision's species-qualified override avoids the 6-way name collision)", () => {
		const units = buildTraitUnits();
		expect(new Set(units.map((unit) => unit.entityId)).size).toBe(units.length);
		const darkvision = units.filter((unit) => unit.displayName === "Darkvision");
		expect(darkvision).toHaveLength(6);
		expect(new Set(darkvision.map((unit) => unit.slug)).size).toBe(6);
		for (const unit of darkvision) {
			expect(unit.slug).toBe(`darkvision-${unit.speciesSlug}`);
		}
	});

	it("links every trait to its owning species' O2 srd.species.<slug> tag", () => {
		for (const unit of buildTraitUnits()) {
			expect(unit.speciesTag).toBe(`srd.species.${unit.speciesSlug}`);
		}
	});

	it("classifies exactly 5 mechanized traits and 2 documented-unapplied (Keen Senses, Versatile)", () => {
		const units = buildTraitUnits();
		const mechanized = units.filter((unit) => unit.rootCause === "mechanized");
		expect(mechanized.map((unit) => unit.displayName).sort()).toEqual(
			[
				"Breath Weapon",
				"Dwarven Toughness",
				"Relentless Endurance",
				"Resourceful",
				"Skillful",
			].sort(),
		);
		const documented = units.filter((unit) => unit.rootCause === "documented_unapplied");
		expect(documented.map((unit) => unit.displayName).sort()).toEqual(
			["Keen Senses", "Versatile"].sort(),
		);
		const deferred = units.filter(
			(unit) => unit.rootCause !== "mechanized" && unit.rootCause !== "documented_unapplied",
		);
		expect(deferred).toHaveLength(26);
		for (const unit of deferred) {
			expect(unit.deferredNote, `expected a deferredNote for '${unit.slug}'`).toBeDefined();
			expect(unit.deferredNote?.length).toBeGreaterThan(0);
		}
	});

	it("groups every deferred trait under one of the five ledger root causes (or the two additional honestly-named ones this pass surfaced)", () => {
		const rootCauses = new Set(buildTraitUnits().map((unit) => unit.rootCause));
		expect(rootCauses).toEqual(
			new Set([
				"mechanized",
				"documented_unapplied",
				"conditions_gap",
				"senses",
				"pb_uses_pool",
				"spellcasting_lineages",
				"luck_reroll",
				"other_substrate_gap",
				// scope_cap retired L4 — Versatile is documented_unapplied
			]),
		);
	});
});

describe("buildTraitDescription", () => {
	it("is a short species-trait identity without compiler provenance", () => {
		for (const unit of buildTraitUnits()) {
			const description = buildTraitDescription(unit);
			expect(description).toBe(`${unit.displayName} — a ${unit.speciesSlug} species trait.`);
			expect(description).not.toContain("pk=");
			expect(description).not.toContain("Source:");
		}
	});

	it("keeps Elven Lineage / Fiendish Legacy as ONE entity each (never sister-style decomposed)", () => {
		const slugs = new Set(buildTraitUnits().map((unit) => unit.slug));
		expect(slugs.has("elven-lineage")).toBe(true);
		expect(slugs.has("fiendish-legacy")).toBe(true);
		expect(slugs.has("elven-lineage-drow")).toBe(false);
		expect(slugs.has("fiendish-legacy-abyssal")).toBe(false);
	});
});

describe("buildTraitTagValueUnits", () => {
	it("emits the class row + 33 srd.trait.<slug> rows + sense/immunity vocabulary", () => {
		const units = buildTraitTagValueUnits();
		// 1 class + 7 sense/immunity vocab + 33 per-trait = 41
		expect(units).toHaveLength(41);
		const classRow = units.find((unit) => unit.tag === TRAIT_CLASS_TAG);
		expect(classRow?.prefix).toBe("srd");
		const traitValueRows = units.filter((unit) => unit.tag.startsWith(`${TRAIT_TAG_PREFIX}.`));
		expect(traitValueRows).toHaveLength(33);
		for (const row of traitValueRows) {
			expect(row.prefix).toBe(TRAIT_TAG_PREFIX);
		}
		expect(units.some((unit) => unit.tag === "srd.sense.darkvision")).toBe(true);
		expect(units.some((unit) => unit.tag === "srd.immunity.magic_sleep")).toBe(true);
	});
});

describe("mechanized trait 1: Resourceful", () => {
	it("RESOURCEFUL_TRAIT_TAG matches the shipped srd.trait.resourceful tag value", () => {
		const resourceful = buildTraitUnits().find((unit) => unit.slug === "resourceful");
		expect(resourceful).toBeDefined();
		expect(RESOURCEFUL_TRAIT_TAG).toBe(`${TRAIT_TAG_PREFIX}.resourceful`);
	});
});

describe("mechanized trait 2: Dwarven Toughness", () => {
	it("dwarvenToughnessHpPerLevelBonus() is the +1 composition constant", () => {
		expect(dwarvenToughnessHpPerLevelBonus()).toBe(1);
	});
});

describe("mechanized trait 3: Skillful", () => {
	it("skillfulProofSkillCapabilityId() resolves to the shipped srd/skill/arcana capability, disjoint from every other hero-granted skill", () => {
		expect(skillfulProofSkillCapabilityId()).toBe("srd/skill/arcana");
	});
});
