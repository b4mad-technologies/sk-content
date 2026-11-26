import { describe, expect, it } from "vitest";

import {
	ABILITY_CODES,
	abilityScoreBands,
	buildAbilityUnits,
	parseAbilityScoreBands,
} from "../../chapters/playing-the-game/ability-units";

describe("buildAbilityUnits", () => {
	it("emits exactly the 6 ability records, one per ABILITY_CODES entry", () => {
		const units = buildAbilityUnits();
		expect(units).toHaveLength(6);
		expect(units.map((u) => u.code).sort()).toEqual([...ABILITY_CODES].sort());
	});

	it("sorts units by code for deterministic output", () => {
		const units = buildAbilityUnits();
		const codes = units.map((u) => u.code);
		expect(codes).toEqual([...codes].sort());
	});

	it("carries a non-empty description and open5e pk for every unit", () => {
		for (const unit of buildAbilityUnits()) {
			expect(unit.description.trim().length).toBeGreaterThan(0);
			expect(unit.sourcePk).toMatch(/^srd-2024_[a-z]{3}$/);
			expect(unit.displayName.length).toBeGreaterThan(0);
		}
	});

	it("uses the standard ability display names", () => {
		const byCode = Object.fromEntries(buildAbilityUnits().map((u) => [u.code, u.displayName]));
		expect(byCode).toEqual({
			str: "Strength",
			dex: "Dexterity",
			con: "Constitution",
			int: "Intelligence",
			wis: "Wisdom",
			cha: "Charisma",
		});
	});
});

describe("Ability Scores meaning table", () => {
	it("parses the seven contiguous 1–30 meaning bands with the SRD wording", () => {
		expect(abilityScoreBands()).toEqual([
			{
				minScore: 1,
				maxScore: 1,
				meaning:
					"This is the lowest a score can normally go. If an effect reduces a score to 0, that effect explains what happens.",
			},
			{ minScore: 2, maxScore: 9, meaning: "This represents a weak capability." },
			{ minScore: 10, maxScore: 11, meaning: "This represents the human average." },
			{ minScore: 12, maxScore: 19, meaning: "This represents a strong capability." },
			{
				minScore: 20,
				maxScore: 20,
				meaning:
					"This is the highest an adventurer's score can go unless a feature says otherwise.",
			},
			{
				minScore: 21,
				maxScore: 29,
				meaning: "This represents an extraordinary capability.",
			},
			{ minScore: 30, maxScore: 30, meaning: "This is the highest a score can go." },
		]);
	});

	it("throws loudly when the bands leave a gap", () => {
		expect(() =>
			parseAbilityScoreBands("|Score|Meaning|\n|---|---|\n|1|Lowest.|\n|3–30|Everything else.|"),
		).toThrow(/contiguous/);
	});
});
