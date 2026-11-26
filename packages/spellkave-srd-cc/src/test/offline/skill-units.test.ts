import { describe, expect, it } from "vitest";

import { ABILITY_CODES } from "../../chapters/playing-the-game/ability-units";
import { buildSkillUnits } from "../../chapters/playing-the-game/skill-units";

describe("buildSkillUnits", () => {
	it("emits exactly the 18 SRD skills", () => {
		const units = buildSkillUnits();
		expect(units).toHaveLength(18);
		expect(units.map((u) => u.slug).sort()).toEqual(
			[
				"acrobatics",
				"animal-handling",
				"arcana",
				"athletics",
				"deception",
				"history",
				"insight",
				"intimidation",
				"investigation",
				"medicine",
				"nature",
				"perception",
				"performance",
				"persuasion",
				"religion",
				"sleight-of-hand",
				"stealth",
				"survival",
			].sort(),
		);
	});

	it("sorts units by slug for deterministic output", () => {
		const units = buildSkillUnits();
		const slugs = units.map((u) => u.slug);
		expect(slugs).toEqual([...slugs].sort());
	});

	it("every skill's governing ability passes the centralized ABILITY_CODES lint", () => {
		for (const unit of buildSkillUnits()) {
			expect(ABILITY_CODES).toContain(unit.governingAbility);
		}
	});

	it("carries a non-empty description and open5e pk for every unit", () => {
		for (const unit of buildSkillUnits()) {
			expect(unit.description.trim().length).toBeGreaterThan(0);
			expect(unit.sourcePk).toMatch(/^srd-2024_[a-z-]+$/);
			expect(unit.displayName).toMatch(/^Skill: /);
		}
	});

	it("matches the well-known SRD skill -> governing-ability table", () => {
		const byGoverning = Object.fromEntries(
			buildSkillUnits().map((u) => [u.slug, u.governingAbility]),
		);
		expect(byGoverning).toEqual({
			acrobatics: "dex",
			"animal-handling": "wis",
			arcana: "int",
			athletics: "str",
			deception: "cha",
			history: "int",
			insight: "wis",
			intimidation: "cha",
			investigation: "int",
			medicine: "wis",
			nature: "int",
			perception: "wis",
			performance: "cha",
			persuasion: "cha",
			religion: "int",
			"sleight-of-hand": "dex",
			stealth: "dex",
			survival: "wis",
		});
	});
});
