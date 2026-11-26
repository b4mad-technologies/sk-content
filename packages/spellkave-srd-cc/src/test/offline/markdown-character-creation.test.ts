import { describe, expect, it } from "vitest";

import {
	fixedHitPointsPerLevelForClass,
	readAbilityScorePointCostsTable,
	readAdjustAbilityScoresProcedure,
	readCharacterAdvancementTable,
	readFixedHitPointsByClassTable,
	readRareLanguagesTable,
	readStandardArrayByClassTable,
	readStandardLanguagesTable,
} from "../../markdown/character-creation";

describe("readStandardLanguagesTable", () => {
	it("parses exactly 10 rows (Common + 9 rollable 1d12 entries) out of the cached chapter markdown", () => {
		const rows = readStandardLanguagesTable();
		expect(rows).toHaveLength(10);
		expect(rows.map((row) => [row.d12, row.name])).toEqual([
			["—", "Common"],
			["1", "Common Sign Language"],
			["2", "Draconic"],
			["3–4", "Dwarvish"],
			["5–6", "Elvish"],
			["7", "Giant"],
			["8", "Gnomish"],
			["9", "Goblin"],
			["10–11", "Halfling"],
			["12", "Orc"],
		]);
	});

	it("every row's line points back at the actual cached markdown line", () => {
		for (const row of readStandardLanguagesTable()) {
			expect(row.line).toBeGreaterThan(0);
		}
		// Rows are printed in ascending source order — lines must be strictly increasing.
		const lines = readStandardLanguagesTable().map((row) => row.line);
		for (let i = 1; i < lines.length; i += 1) {
			expect(lines[i]).toBeGreaterThan(lines[i - 1] as number);
		}
	});
});

describe("readRareLanguagesTable", () => {
	it("flattens the two-column parallel list into exactly 9 languages", () => {
		const rows = readRareLanguagesTable();
		expect(rows.map((row) => row.name)).toEqual([
			"Abyssal",
			"Primordial",
			"Celestial",
			"Sylvan",
			"Deep Speech",
			"Thieves' Cant",
			"Druidic",
			"Undercommon",
			"Infernal",
		]);
	});

	it("marks only Primordial with the dialects footnote (character-creation.md:294)", () => {
		const flagged = readRareLanguagesTable().filter((row) => row.hasFootnoteMarker);
		expect(flagged.map((row) => row.name)).toEqual(["Primordial"]);
	});

	it("Infernal's row has no second-column pair (last <tr>'s right cell is empty)", () => {
		const infernal = readRareLanguagesTable().find((row) => row.name === "Infernal");
		expect(infernal).toBeDefined();
	});
});

// C3 (Ability-Score Generation, `ledger/character-creation.md`'s C3 slice row).
describe("readAbilityScorePointCostsTable", () => {
	it("parses exactly 8 (score, cost) pairs, ascending, out of the cached chapter markdown (:310)", () => {
		const rows = readAbilityScorePointCostsTable();
		expect(rows.map((row) => [row.score, row.cost])).toEqual([
			[8, 0],
			[9, 1],
			[10, 2],
			[11, 3],
			[12, 4],
			[13, 5],
			[14, 7],
			[15, 9],
		]);
	});

	it("every row's line points back at the actual cached markdown line", () => {
		for (const row of readAbilityScorePointCostsTable()) {
			expect(row.line).toBeGreaterThan(0);
		}
	});
});

describe("readStandardArrayByClassTable", () => {
	it("parses exactly 12 classes, in the source's own printed order (:355)", () => {
		const rows = readStandardArrayByClassTable();
		expect(rows.map((row) => row.className)).toEqual([
			"Barbarian",
			"Bard",
			"Cleric",
			"Druid",
			"Fighter",
			"Monk",
			"Paladin",
			"Ranger",
			"Rogue",
			"Sorcerer",
			"Warlock",
			"Wizard",
		]);
	});

	it("Fighter's row is Str 15, Dex 14, Con 13, Int 8, Wis 10, Cha 12 (the C3 proof hero's seed)", () => {
		const fighter = readStandardArrayByClassTable().find((row) => row.className === "Fighter");
		expect(fighter).toMatchObject({ str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 });
	});

	it("every row sums to the Standard Array's own six scores (15+14+13+12+10+8), just reassigned", () => {
		const STANDARD_ARRAY_SUM = 15 + 14 + 13 + 12 + 10 + 8;
		for (const row of readStandardArrayByClassTable()) {
			expect(row.str + row.dex + row.con + row.int + row.wis + row.cha).toBe(STANDARD_ARRAY_SUM);
		}
	});

	it("every row's line points back at the actual cached markdown line", () => {
		for (const row of readStandardArrayByClassTable()) {
			expect(row.line).toBeGreaterThan(0);
		}
	});
});

// C4 (Level Advancement, `ledger/character-creation.md`'s C4 row).
describe("readCharacterAdvancementTable", () => {
	it("parses exactly 20 rows (level 1..20), in ascending source order (:657)", () => {
		const rows = readCharacterAdvancementTable();
		expect(rows.map((row) => row.level)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
		]);
	});

	it("levels 1, 5, and 20 carry the exact SRD XP thresholds (spot values)", () => {
		const rows = readCharacterAdvancementTable();
		expect(rows.find((row) => row.level === 1)).toMatchObject({ xp: 0, proficiencyBonus: 2 });
		expect(rows.find((row) => row.level === 5)).toMatchObject({ xp: 6500, proficiencyBonus: 3 });
		expect(rows.find((row) => row.level === 20)).toMatchObject({ xp: 355000, proficiencyBonus: 6 });
	});

	it("parses every comma-separated XP value (thousands separator stripped)", () => {
		const rows = readCharacterAdvancementTable();
		expect(rows.map((row) => row.xp)).toEqual([
			0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
			165000, 195000, 225000, 265000, 305000, 355000,
		]);
	});

	it("every row's line points back at the actual cached markdown line, strictly increasing", () => {
		const lines = readCharacterAdvancementTable().map((row) => row.line);
		for (const line of lines) expect(line).toBeGreaterThan(0);
		for (let i = 1; i < lines.length; i += 1) {
			expect(lines[i]).toBeGreaterThan(lines[i - 1] as number);
		}
	});
});

describe("readFixedHitPointsByClassTable / fixedHitPointsPerLevelForClass", () => {
	it("parses exactly 4 class-group rows, in the source's own printed order (:779)", () => {
		const rows = readFixedHitPointsByClassTable();
		expect(rows.map((row) => row.classNames)).toEqual([
			["Barbarian"],
			["Fighter", "Paladin", "Ranger"],
			["Bard", "Cleric", "Druid", "Monk", "Rogue", "Warlock"],
			["Sorcerer", "Wizard"],
		]);
		expect(rows.map((row) => row.flatHpPerLevel)).toEqual([7, 6, 5, 4]);
	});

	it("looks up the Fighter row's flat number (the C4 proof hero's hp_per_level seed)", () => {
		expect(fixedHitPointsPerLevelForClass("Fighter")).toBe(6);
	});

	it("looks up every class name in a multi-class row (Paladin/Ranger share Fighter's row)", () => {
		expect(fixedHitPointsPerLevelForClass("Paladin")).toBe(6);
		expect(fixedHitPointsPerLevelForClass("Ranger")).toBe(6);
		expect(fixedHitPointsPerLevelForClass("Barbarian")).toBe(7);
		expect(fixedHitPointsPerLevelForClass("Sorcerer")).toBe(4);
	});

	it("throws loudly for an unknown class name rather than silently returning undefined", () => {
		expect(() => fixedHitPointsPerLevelForClass("Artificer")).toThrow();
	});

	it("every row's line points back at the actual cached markdown line, strictly increasing", () => {
		const lines = readFixedHitPointsByClassTable().map((row) => row.line);
		for (const line of lines) expect(line).toBeGreaterThan(0);
		for (let i = 1; i < lines.length; i += 1) {
			expect(lines[i]).toBeGreaterThan(lines[i - 1] as number);
		}
	});
});

describe("readAdjustAbilityScoresProcedure", () => {
	it("parses the exact background +2/+1 adjustment procedure (character-creation.md:481-485)", () => {
		expect(readAdjustAbilityScoresProcedure()).toBe(
			"After assigning your ability scores, adjust them according to your background. Your " +
				"background lists three abilities; increase one of those scores by 2 and a different " +
				"one by 1, or increase all three by 1. None of these increases can raise a score above " +
				"20. Some players like to increase their class's primary ability, while others prefer " +
				"to increase a low score.",
		);
	});
});
