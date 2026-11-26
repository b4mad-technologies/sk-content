import { describe, expect, it } from "vitest";
import { readSkillProficienciesTable } from "../../markdown/playing-the-game";
import { readSkillDescriptions } from "../../open5e/skill-description";

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

describe("readSkillProficienciesTable", () => {
	it("parses exactly 18 rows out of the cached chapter markdown", () => {
		const rows = readSkillProficienciesTable();
		expect(rows).toHaveLength(18);
		for (const row of rows) {
			expect(row.skillName.length).toBeGreaterThan(0);
			expect(row.abilityName.length).toBeGreaterThan(0);
			expect(row.exampleUses.length).toBeGreaterThan(0);
		}
	});

	it("matches the well-known SRD skill -> ability table verbatim", () => {
		const bySkill = Object.fromEntries(
			readSkillProficienciesTable().map((row) => [row.skillName, row.abilityName]),
		);
		expect(bySkill).toEqual({
			Acrobatics: "Dexterity",
			"Animal Handling": "Wisdom",
			Arcana: "Intelligence",
			Athletics: "Strength",
			Deception: "Charisma",
			History: "Intelligence",
			Insight: "Wisdom",
			Intimidation: "Charisma",
			Investigation: "Intelligence",
			Medicine: "Wisdom",
			Nature: "Intelligence",
			Perception: "Wisdom",
			Performance: "Charisma",
			Persuasion: "Charisma",
			Religion: "Intelligence",
			"Sleight of Hand": "Dexterity",
			Stealth: "Dexterity",
			Survival: "Wisdom",
		});
	});

	/**
	 * Bonus consistency check (team-lead follow-up): the markdown table and
	 * `SkillDescription.json` are two INDEPENDENT cached sources describing
	 * the same 18 skills. `skill-units.ts`'s `buildSkillUnits` already asserts
	 * this at generation time; this test proves it directly against the two
	 * readers so a fork re-sync that changes either side fails loudly here
	 * too, not only inside the generator.
	 */
	it("names the exact same 18 skills as SkillDescription.json (name normalization allowed)", () => {
		const markdownSlugs = readSkillProficienciesTable()
			.map((row) => slugify(row.skillName))
			.sort();
		const jsonSlugs = readSkillDescriptions()
			.map((record) => record.describes)
			.sort();
		expect(markdownSlugs).toEqual(jsonSlugs);
	});
});
