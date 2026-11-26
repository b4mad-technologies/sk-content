// Offline proof for the "Creature" / "Creature Type" identity vocabulary
// (design correction: `ledger/designs/generic-skill-check-target-dc.md`
// § "Slice 3" item 1; module header: `creature-type-units.ts`).
import { describe, expect, it } from "vitest";

import {
	assertCreatureTypeSlug,
	buildCreatureTypeUnits,
	CREATURE_NICHE_TAG,
	CREATURE_TYPE_TAG_PREFIX,
	creatureTypeTag,
} from "../../chapters/playing-the-game/creature-type-units";

describe("buildCreatureTypeUnits", () => {
	it("emits exactly the 14 SRD creature types, sorted by slug", () => {
		const units = buildCreatureTypeUnits();
		expect(units).toHaveLength(14);
		const slugs = units.map((u) => u.slug);
		expect(slugs).toEqual([...slugs].sort((a, b) => a.localeCompare(b)));
		expect(slugs).toEqual([
			"aberration",
			"beast",
			"celestial",
			"construct",
			"dragon",
			"elemental",
			"fey",
			"fiend",
			"giant",
			"humanoid",
			"monstrosity",
			"ooze",
			"plant",
			"undead",
		]);
	});

	it("carries a non-empty description and open5e pk for every unit", () => {
		for (const unit of buildCreatureTypeUnits()) {
			expect(unit.description.trim().length).toBeGreaterThan(0);
			expect(unit.pk).toMatch(/^srd-2024_[a-z]+$/);
		}
	});
});

describe("CREATURE_NICHE_TAG", () => {
	it("is the exact srd.creature umbrella tag/niche string", () => {
		expect(CREATURE_NICHE_TAG).toBe("srd.creature");
	});
});

describe("creatureTypeTag", () => {
	it("qualifies every sourced creature type under the exact vocabulary prefix", () => {
		expect(CREATURE_TYPE_TAG_PREFIX).toBe("srd.creature_type");
		for (const unit of buildCreatureTypeUnits()) {
			expect(creatureTypeTag(unit.slug)).toBe(`${CREATURE_TYPE_TAG_PREFIX}.${unit.slug}`);
		}
	});
});

describe("assertCreatureTypeSlug", () => {
	it("does not throw for every one of the 14 sourced slugs", () => {
		for (const unit of buildCreatureTypeUnits()) {
			expect(() => assertCreatureTypeSlug(unit.slug)).not.toThrow();
		}
	});

	it("throws for an invented/unsourced type", () => {
		expect(() => assertCreatureTypeSlug("robot")).toThrow(/not one of the 14 sourced/);
	});
});
