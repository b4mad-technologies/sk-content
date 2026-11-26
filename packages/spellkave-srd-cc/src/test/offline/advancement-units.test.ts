// C4 (Level Advancement, `ledger/character-creation.md`'s C4 row; scope
// contract: `ledger/designs/character-advancement.md`) offline proof. Fixture
// row shape (bounds/id) is proven by `fixtures-author-tool/resources.test.ts`
// and `capabilities.test.ts` reading the committed fixture back, same posture
// as `level-units.test.ts`; this file proves the GENERATOR module's own
// building blocks — the macro body builder, the TS-side threshold mirror, and
// the gate predicate text.
import { describe, expect, it } from "vitest";
import {
	HP_PER_LEVEL_ID,
	INITIAL_HP_PER_LEVEL,
	INITIAL_XP,
	LEVEL_UP_ACTION_ID,
	LEVEL_UP_CAPABILITY_ID,
	levelUpGatePredicateSource,
	MAX_HP_PER_LEVEL,
	MAX_XP,
	MIN_HP_PER_LEVEL,
	MIN_XP,
	XP_ID,
	XP_THRESHOLD_MACRO_ID,
	xpThresholdForLevel,
	xpThresholdMacroBodySource,
} from "../../chapters/character-creation/advancement-units";
import { readCharacterAdvancementTable } from "../../markdown/character-creation";

describe("advancement-units: identity", () => {
	it("srd/xp bounds: min 0, initial 0, max a safety-bound ceiling above the level-20 threshold (355,000)", () => {
		expect(XP_ID).toBe("xp");
		expect(MIN_XP).toBe(0);
		expect(INITIAL_XP).toBe(0);
		expect(MAX_XP).toBeGreaterThan(355_000);
	});

	it("srd/hp_per_level bounds: min 0, initial 0, a small safety-bound ceiling", () => {
		expect(HP_PER_LEVEL_ID).toBe("hp_per_level");
		expect(MIN_HP_PER_LEVEL).toBe(0);
		expect(INITIAL_HP_PER_LEVEL).toBe(0);
		expect(MAX_HP_PER_LEVEL).toBeGreaterThan(0);
	});

	it("ONE level-up action/capability id — never a per-level row", () => {
		expect(LEVEL_UP_ACTION_ID).toBe("srd/advancement/level-up");
		expect(LEVEL_UP_CAPABILITY_ID).toBe("srd/action/advancement/level-up");
	});
});

describe("xpThresholdMacroBodySource", () => {
	it("matches the design doc's exact 19-deep cond ladder, byte for byte (ledger/designs/character-advancement.md Proposal §2)", () => {
		expect(xpThresholdMacroBodySource()).toBe(
			"cond(level <= 1, 0, " +
				"cond(level == 2, 300, " +
				"cond(level == 3, 900, " +
				"cond(level == 4, 2700, " +
				"cond(level == 5, 6500, " +
				"cond(level == 6, 14000, " +
				"cond(level == 7, 23000, " +
				"cond(level == 8, 34000, " +
				"cond(level == 9, 48000, " +
				"cond(level == 10, 64000, " +
				"cond(level == 11, 85000, " +
				"cond(level == 12, 100000, " +
				"cond(level == 13, 120000, " +
				"cond(level == 14, 140000, " +
				"cond(level == 15, 165000, " +
				"cond(level == 16, 195000, " +
				"cond(level == 17, 225000, " +
				"cond(level == 18, 265000, " +
				"cond(level == 19, 305000, 355000)))))))))))))))))))",
		);
	});

	it("contains a rung for every level 2..19, sourced from the parsed table (never hand-typed); level 20's XP is the trailing else with no explicit rung", () => {
		const body = xpThresholdMacroBodySource();
		for (const row of readCharacterAdvancementTable()) {
			if (row.level === 1 || row.level === 20) continue;
			expect(body).toContain(`cond(level == ${row.level}, ${row.xp}`);
		}
		expect(body).not.toContain("cond(level == 20");
		expect(body).toContain("level <= 1, 0");
		// level 20's XP (355000) appears exactly once, as the ladder's final else.
		expect(body.match(/355000/g)).toHaveLength(1);
	});
});

describe("xpThresholdForLevel (TS-side mirror, same source table, never a second literal copy)", () => {
	it("levels 1, 5, and 20 — the spot values this slice's builder brief asks to pin", () => {
		expect(xpThresholdForLevel(1)).toBe(0);
		expect(xpThresholdForLevel(5)).toBe(6500);
		expect(xpThresholdForLevel(20)).toBe(355000);
	});

	it("kavemouth post-Warden total (slime 100 + warden 300 = 400) still clears the level-2 threshold", () => {
		expect(400).toBeGreaterThanOrEqual(xpThresholdForLevel(2));
	});

	it("level <= 1 clamps to 0, matching the macro's own clamp", () => {
		expect(xpThresholdForLevel(0)).toBe(0);
		expect(xpThresholdForLevel(1)).toBe(0);
	});

	it("level 6 (the level 5->6 step the live proof exercises): 14,000 XP", () => {
		expect(xpThresholdForLevel(6)).toBe(14000);
	});

	it("level > 20 falls through to the level-20 threshold (authoring-hygiene note, design doc open decision 3 — never reached by the shipped predicate itself)", () => {
		expect(xpThresholdForLevel(21)).toBe(355000);
	});

	it("every table row's own level maps back to its own xp value", () => {
		for (const row of readCharacterAdvancementTable()) {
			expect(xpThresholdForLevel(row.level)).toBe(row.xp);
		}
	});
});

describe("levelUpGatePredicateSource", () => {
	it("matches the design doc's exact gate predicate text, byte for byte (Proposal §3; macro form live-verified per finding #82's retraction trail)", () => {
		expect(levelUpGatePredicateSource()).toBe(
			"actor.stat('srd/xp') >= macro('srd/xp_threshold', actor.stat('srd/level') + 1)" +
				" && actor.stat('srd/level') < 20",
		);
	});

	it("carries an explicit '< 20' term — never relies on srd/level's own max_value clamp alone (operator decision)", () => {
		expect(levelUpGatePredicateSource()).toContain("actor.stat('srd/level') < 20");
	});

	it("names the macro id and both stat reads it composes", () => {
		const predicate = levelUpGatePredicateSource();
		expect(predicate).toContain(`macro('${XP_THRESHOLD_MACRO_ID}'`);
		expect(predicate).toContain("actor.stat('srd/xp')");
		expect(predicate).toContain("actor.stat('srd/level')");
	});
});
