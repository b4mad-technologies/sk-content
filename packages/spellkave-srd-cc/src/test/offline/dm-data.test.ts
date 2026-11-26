// Offline proof for the DM Runtime Library's DATA layer (ADR-0096, slice plan
// `ledger/designs/dm-runtime-library-arc.md`, S3 — `src/dm/data/`). Minimal
// by operator ruling (ADR-0096 D-2: the recorded playthrough is the true
// test, unit tests stay minimal) — this file pins ONLY: (1) the cache-derived
// data against the underlying readers directly (the honesty mechanism itself
// — a fork re-sync that changed the source tables would break these
// assertions, not silently ship stale numbers), (2) point-cost boundary
// behavior, (3) ability-modifier spot values, (4) level-1 HP for Fighter plus
// one class per HP group, (5) the two named XP thresholds.

import {
	abilityModifier,
	classCreationData,
	classCreationDataBySlug,
	fixedHpPerLevel,
	level1Hp,
	POINT_BUY_BUDGET,
	pointCost,
	standardArrayScores,
	totalPointCost,
	xpThreshold,
} from "@spellkave/adventure-runtime/dm/data";
import { describe, expect, it } from "vitest";
import {
	fixedHitPointsPerLevelForClass,
	level1HitPointsBaseForClass,
} from "../../markdown/character-creation";

describe("classCreationData: cache-pinning", () => {
	it("returns all 12 SRD classes", () => {
		expect(classCreationData()).toHaveLength(12);
	});

	it("Fighter's data is pinned against the underlying readers directly, not a second hand-typed copy", () => {
		const fighter = classCreationDataBySlug("fighter");
		expect(fighter.displayName).toBe("Fighter");
		expect(fighter.primaryAbilityText).toBe("Strength or Dexterity");
		expect(fighter.hitDieSize).toBe(10);
		expect(fighter.level1HpBase).toBe(level1HitPointsBaseForClass("Fighter"));
		expect(fighter.fixedHpPerLevelBase).toBe(fixedHitPointsPerLevelForClass("Fighter"));
		expect(fighter.level1HpBase).toBe(10);
		expect(fighter.fixedHpPerLevelBase).toBe(6);
	});

	it("one class per Level 1 Hit Points group matches the cache table's own baseline", () => {
		expect(classCreationDataBySlug("barbarian").level1HpBase).toBe(12);
		expect(classCreationDataBySlug("cleric").level1HpBase).toBe(8);
		expect(classCreationDataBySlug("wizard").level1HpBase).toBe(6);
	});
});

describe("standardArrayScores", () => {
	it("derives {15, 14, 13, 12, 10, 8} from the Standard Array by Class table, cross-checked over all 12 rows", () => {
		expect([...standardArrayScores()]).toEqual([15, 14, 13, 12, 10, 8]);
	});
});

describe("pointCost: point-buy boundary behavior", () => {
	it("matches the cache table at both boundary scores", () => {
		expect(pointCost(8)).toBe(0);
		expect(pointCost(15)).toBe(9);
	});

	it("rejects any score the table does not price (outside 8..15)", () => {
		expect(() => pointCost(7)).toThrow();
		expect(() => pointCost(16)).toThrow();
	});
});

describe("totalPointCost", () => {
	it("the Standard Array (15,14,13,12,10,8) costs exactly the 27-point budget", () => {
		expect(totalPointCost({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })).toBe(
			POINT_BUY_BUDGET,
		);
	});

	it("rejects a spread containing any out-of-range score", () => {
		expect(() => totalPointCost({ str: 16, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toThrow();
	});
});

describe("abilityModifier: SRD spot values", () => {
	it("8 -> -1, 10 -> 0, 15 -> +2, 20 -> +5", () => {
		expect(abilityModifier(8)).toBe(-1);
		expect(abilityModifier(10)).toBe(0);
		expect(abilityModifier(15)).toBe(2);
		expect(abilityModifier(20)).toBe(5);
	});
});

describe("level1Hp / fixedHpPerLevel", () => {
	it("Fighter: 10 + Con modifier", () => {
		expect(level1Hp("fighter", 2)).toBe(12);
		expect(level1Hp("fighter", -1)).toBe(9);
	});

	it("one class per HP group, level-1 baseline plus Con modifier", () => {
		expect(level1Hp("barbarian", 3)).toBe(15);
		expect(level1Hp("cleric", 1)).toBe(9);
		expect(level1Hp("wizard", 0)).toBe(6);
	});

	it("fixedHpPerLevel: Fighter's per-level-up grant is 6 + Con modifier", () => {
		expect(fixedHpPerLevel("fighter", 2)).toBe(8);
	});
});

describe("xpThreshold", () => {
	it("level 2 -> 300, level 20 -> 355000", () => {
		expect(xpThreshold(2)).toBe(300);
		expect(xpThreshold(20)).toBe(355_000);
	});
});
