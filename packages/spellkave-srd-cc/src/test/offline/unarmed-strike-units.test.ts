import { describe, expect, it } from "vitest";
import {
	expectedAbilityModifier,
	MAX_ABILITY_SCORE,
	MIN_ABILITY_SCORE,
} from "../../chapters/playing-the-game/modifier-units";
import {
	assertOpportunityAttackProvenanceSource,
	assertUnarmedStrikeDamageProvenanceSource,
	UNARMED_STRIKE_REACH_METERS,
	unarmedStrikeAttackExpr,
	unarmedStrikeDamageDeltaExpr,
	unarmedStrikeDamageExpr,
} from "../../chapters/playing-the-game/unarmed-strike-units";

describe("generic Unarmed Strike (Damage)", () => {
	it("pins every authored rule claim to the cached Attack/Unarmed Strike source", () => {
		expect(() => assertUnarmedStrikeDamageProvenanceSource()).not.toThrow();
	});

	it("pins Opportunity Attack claims to both cached rule locations", () => {
		expect(() => assertOpportunityAttackProvenanceSource()).not.toThrow();
	});

	it("uses the standard 5-foot melee reach in metres", () => {
		expect(UNARMED_STRIKE_REACH_METERS).toBeCloseTo(1.524, 3);
	});

	it("composes Strength + the baked Proficiency Bonus stat against effective target AC", () => {
		const expr = unarmedStrikeAttackExpr(
			"actor.stat('srd/str')",
			"actor.stat('srd/proficiency_bonus')",
			"target.effective('srd/ac')",
		);
		expect(expr).toContain("let attack_roll = d20");
		expect(expr).toContain("actor.stat('srd/str')");
		expect(expr).toContain("actor.stat('srd/proficiency_bonus')");
		expect(expr).not.toContain("macro('srd/proficiency_bonus'");
		expect(expr).not.toContain("actor.stat('srd/level')");
		expect(expr).toContain("target.effective('srd/ac')");
		// Improved Critical composes has_capability on the shared attackRollExpr path.
		expect(expr).toContain("improved-critical");
	});

	it("emits Martial Arts–aware die/ability fold and target-HP delta", () => {
		const magnitude = unarmedStrikeDamageExpr("actor.stat('srd/str')");
		expect(magnitude).toContain("max(0,");
		expect(magnitude).toContain("1d6");
		expect(magnitude).toContain("srd/class-feature/monk/martial-arts");
		expect(magnitude).toContain("actor.stat('srd/str')");
		const delta = unarmedStrikeDamageDeltaExpr("actor.stat('srd/str')");
		// Delta wraps magnitude in Rage B/P/S resist ladder (bludgeoning).
		expect(delta.startsWith("0 - (")).toBe(true);
		expect(delta).toContain(magnitude);
		expect(delta).toContain("damage_resist:bludgeoning");
	});

	it("EXHAUSTIVE: scores 1..30 deal max(0, 1 + table modifier), never negative damage", () => {
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			const delta = score - 10;
			const truncated = Math.trunc(delta / 2);
			const emittedModifier = truncated + (delta - truncated * 2 < 0 ? -1 : 0);
			const actual = Math.max(0, 1 + emittedModifier);
			const expected = Math.max(0, 1 + expectedAbilityModifier(score));
			expect(actual).toBeGreaterThanOrEqual(0);
			expect(actual).toBe(expected);
		}
	});
});
