// Ability Checks offline proof: both reference tables (Ability Check
// Examples, Typical Difficulty Classes) parsed from the committed cache and
// checked against the source prose verbatim. The mechanic itself has no new
// idiom to prove here — see `d20-units.test.ts`'s own exhaustive proof of
// `d20TestExpr`, which this table's DC values now ground directly (closing
// the "hand-typed DC list" gap the ability-checks-units.ts module header
// names).
import { describe, expect, it } from "vitest";

import {
	abilityCheckExamples,
	parseAbilityCheckExamples,
	parseTypicalDifficultyClasses,
	typicalDifficultyClasses,
} from "../../chapters/playing-the-game/ability-checks-units";

describe("Ability Check Examples table", () => {
	it("parses exactly the six abilities, in SRD order, with the prose's own wording", () => {
		expect(abilityCheckExamples()).toEqual([
			{ ability: "Strength", makeACheckTo: "Lift, push, pull, or break something" },
			{ ability: "Dexterity", makeACheckTo: "Move nimbly, quickly, or quietly" },
			{ ability: "Constitution", makeACheckTo: "Push your body beyond normal limits" },
			{ ability: "Intelligence", makeACheckTo: "Reason or remember" },
			{
				ability: "Wisdom",
				makeACheckTo: "Notice things in the environment or in creatures’ behavior",
			},
			{ ability: "Charisma", makeACheckTo: "Influence, entertain, or deceive" },
		]);
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseAbilityCheckExamples("no table here")).toThrow(/header/);
	});
});

describe("Typical Difficulty Classes table", () => {
	it("parses exactly the six-rung ladder (5, 10, 15, 20, 25, 30), SRD order", () => {
		expect(typicalDifficultyClasses()).toEqual([
			{ taskDifficulty: "Very easy", dc: 5 },
			{ taskDifficulty: "Easy", dc: 10 },
			{ taskDifficulty: "Medium", dc: 15 },
			{ taskDifficulty: "Hard", dc: 20 },
			{ taskDifficulty: "Very hard", dc: 25 },
			{ taskDifficulty: "Nearly impossible", dc: 30 },
		]);
	});

	it("every DC is a positive integer (sanity bound, not a magic-number assumption)", () => {
		for (const rung of typicalDifficultyClasses()) {
			expect(Number.isInteger(rung.dc)).toBe(true);
			expect(rung.dc).toBeGreaterThan(0);
		}
	});

	it("throws loudly on a non-numeric DC cell (negative control)", () => {
		expect(() =>
			parseTypicalDifficultyClasses("|Task Difficulty|DC|\n|---|---|\n|Very easy|five|"),
		).toThrow(/not a plain non-negative integer/);
	});
});
