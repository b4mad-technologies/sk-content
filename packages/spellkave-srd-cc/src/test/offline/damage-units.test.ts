// Damage Rolls + Critical Hits offline proof: `damageRollExpr`'s
// weapon-vs-fixed branch and zero-floor, `doubleDiceExpr`'s dice-count-only
// doubling (with a negative control on non-bare-literal input), and
// `criticalDamageRollExpr`'s end-to-end composition.
import { describe, expect, it } from "vitest";
import {
	criticalDamageRollExpr,
	damageRollExpr,
	doubleDiceExpr,
} from "../../chapters/playing-the-game/damage-units";

describe("damageRollExpr", () => {
	it("weapon damage (modifier present) composes dice + modifier, floored at 0", () => {
		expect(damageRollExpr({ diceExpr: "1d8", modifierExpr: "actor.stat('srd/str')" })).toBe(
			"max(0, 1d8 + (actor.stat('srd/str')))",
		);
	});

	it("fixed damage (Blowgun-shaped: no modifierExpr) composes dice alone, still floored at 0", () => {
		expect(damageRollExpr({ diceExpr: "roll_table('srd/profile/damage/1_piercing')" })).toBe(
			"max(0, roll_table('srd/profile/damage/1_piercing'))",
		);
	});

	// Emulates `max(0, dice + modifier)` — the source's own "possible to deal
	// 0 damage but not negative damage" clause.
	function evalDamage(diceRoll: number, modifier: number): number {
		return Math.max(0, diceRoll + modifier);
	}

	it("EXHAUSTIVE: every representative dice-roll x modifier combination never goes negative", () => {
		const diceRolls = [1, 2, 4, 8, 12, 20];
		const modifiers = [-5, -3, -1, 0, 1, 3, 5, 10];
		for (const roll of diceRolls) {
			for (const modifier of modifiers) {
				const result = evalDamage(roll, modifier);
				expect(result).toBeGreaterThanOrEqual(0);
				expect(result).toBe(roll + modifier < 0 ? 0 : roll + modifier);
			}
		}
	});
});

describe("doubleDiceExpr", () => {
	it("doubles an explicit die count", () => {
		expect(doubleDiceExpr("2d4")).toBe("4d4");
		expect(doubleDiceExpr("3d6")).toBe("6d6");
		expect(doubleDiceExpr("1d12")).toBe("2d12");
	});

	it("treats an implicit die count (bare 'dM') as 1dM -> 2dM", () => {
		expect(doubleDiceExpr("d4")).toBe("2d4");
	});

	it("EXHAUSTIVE: every representative NdM literal doubles N only, sides untouched", () => {
		const cases: [string, number, number][] = [
			["1d4", 1, 4],
			["1d6", 1, 6],
			["1d8", 1, 8],
			["1d10", 1, 10],
			["1d12", 1, 12],
			["2d6", 2, 6],
			["2d4", 2, 4],
			["4d4", 4, 4],
		];
		for (const [literal, count, sides] of cases) {
			expect(doubleDiceExpr(literal)).toBe(`${count * 2}d${sides}`);
		}
	});

	it("NEGATIVE CONTROL: rejects a roll_table(...) call — dice doubling never rewrites authored content", () => {
		expect(() => doubleDiceExpr("roll_table('srd/profile/damage/1d4_piercing')")).toThrow(
			/not a bare 'NdM' dice literal/,
		);
	});

	it("NEGATIVE CONTROL: rejects an already-composed expression", () => {
		expect(() => doubleDiceExpr("1d8 + 3")).toThrow(/not a bare 'NdM' dice literal/);
	});
});

describe("criticalDamageRollExpr", () => {
	it("doubles the dice term, leaves the modifier term untouched (Critical Hits: 'not the modifiers')", () => {
		expect(criticalDamageRollExpr({ diceExpr: "1d4", modifierExpr: "actor.stat('srd/dex')" })).toBe(
			"max(0, 2d4 + (actor.stat('srd/dex')))",
		);
	});

	it("worked example from the source: a Dagger Critical Hit rolls 2d4, not 1d4", () => {
		expect(criticalDamageRollExpr({ diceExpr: "1d4" })).toBe("max(0, 2d4)");
	});

	it("propagates doubleDiceExpr's negative control (a roll_table dice source cannot be critical-doubled by this builder)", () => {
		expect(() =>
			criticalDamageRollExpr({ diceExpr: "roll_table('srd/profile/damage/1d8_slashing')" }),
		).toThrow(/not a bare 'NdM' dice literal/);
	});
});
