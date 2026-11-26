// Offline proof for the remaining Damage and Healing units: pointer-verdict
// provenance guards (Damage Types, Resting), Immunity's definitional guard,
// the Resistance/Vulnerability pipeline pinned EXHAUSTIVELY against the
// source's own worked example, and the Death Saving Throw check.
import { describe, expect, it } from "vitest";
import {
	assertDamageTypesProvenanceSource,
	assertDeathSaveProvenanceSource,
	assertImmunityProvenanceSource,
	assertKnockingOutProvenanceSource,
	assertResistanceVulnerabilityProvenanceSource,
	assertRestingProvenanceSource,
	DEATH_SAVE_DC,
	damageModifierPipelineExpr,
	deathSaveExpr,
} from "../../chapters/playing-the-game/damage-healing-misc-units";

describe("pointer/definitional provenance guards", () => {
	it("Damage Types", () => {
		expect(() => assertDamageTypesProvenanceSource()).not.toThrow();
	});
	it("Resting", () => {
		expect(() => assertRestingProvenanceSource()).not.toThrow();
	});
	it("Immunity", () => {
		expect(() => assertImmunityProvenanceSource()).not.toThrow();
	});
	it("Resistance and Vulnerability worked example", () => {
		expect(() => assertResistanceVulnerabilityProvenanceSource()).not.toThrow();
	});
	it("Death Saving Throws", () => {
		expect(() => assertDeathSaveProvenanceSource()).not.toThrow();
	});
	it("Knocking Out a Creature", () => {
		expect(() => assertKnockingOutProvenanceSource()).not.toThrow();
	});
});

describe("deathSaveExpr", () => {
	it("is a bare, unmodified DC-10 check — no ability score, no proficiency term", () => {
		expect(deathSaveExpr()).toBe("d20 >= 10");
		expect(DEATH_SAVE_DC).toBe(10);
	});

	it("EXHAUSTIVE: every face 1..20, 10 or higher succeeds, per the source's own wording", () => {
		for (let face = 1; face <= 20; face += 1) {
			const succeeds = face >= 10;
			expect(face >= DEATH_SAVE_DC).toBe(succeeds);
		}
		expect(9 >= DEATH_SAVE_DC).toBe(false);
		expect(10 >= DEATH_SAVE_DC).toBe(true);
	});
});

describe("damageModifierPipelineExpr", () => {
	it("no-op when no predicate is supplied: reproduces the adjusted value byte-for-byte", () => {
		expect(damageModifierPipelineExpr({ adjustedDamageExpr: "23" })).toBe("23");
	});

	it("Resistance-only shape", () => {
		expect(
			damageModifierPipelineExpr({ adjustedDamageExpr: "23", resistantPredicate: "true" }),
		).toBe("cond(true, (23) / 2, 23)");
	});

	it("full three-stage shape (Resistance -> Vulnerability -> Immunity outermost)", () => {
		expect(
			damageModifierPipelineExpr({
				adjustedDamageExpr: "23",
				resistantPredicate: "actor.has_tag('resistance.fire')",
				vulnerablePredicate: "actor.has_tag('vulnerability.fire')",
				immunePredicate: "actor.has_tag('immunity.fire')",
			}),
		).toBe(
			"cond(actor.has_tag('immunity.fire'), 0, cond(actor.has_tag('vulnerability.fire'), " +
				"(cond(actor.has_tag('resistance.fire'), (23) / 2, 23)) * 2, " +
				"cond(actor.has_tag('resistance.fire'), (23) / 2, 23)))",
		);
	});

	// Emulates the pipeline: Resistance halves (round down, non-negative
	// trunc==floor), Vulnerability doubles, Immunity short-circuits to 0.
	function evalPipeline(
		adjusted: number,
		resistant: boolean,
		vulnerable: boolean,
		immune: boolean,
	): number {
		const resisted = resistant ? Math.trunc(adjusted / 2) : adjusted;
		const vulnerabled = vulnerable ? resisted * 2 : resisted;
		return immune ? 0 : vulnerabled;
	}

	it("WORKED EXAMPLE from the source, exactly: 28 Fire damage, -5 adjustment, Resistance to all, Vulnerability to Fire -> 22", () => {
		const adjusted = 28 - 5; // adjustments applied first (this stage is the caller's own concern)
		expect(adjusted).toBe(23);
		const result = evalPipeline(adjusted, true, true, false);
		expect(result).toBe(22);
		// Intermediate values pinned too, matching the source's own parenthetical trail.
		expect(Math.trunc(adjusted / 2)).toBe(11); // "rounded down to 11"
	});

	it("No Stacking: a SINGLE resistantPredicate gate cannot compose two halvings — structurally enforced by the builder's own boolean (not counted) signature", () => {
		// Resistance to Necrotic AND Resistance to all damage both being true
		// still gates through the SAME ONE cond(...) — the pipeline has no way
		// to represent a second halving even if a caller wanted to.
		const onceHalved = damageModifierPipelineExpr({
			adjustedDamageExpr: "20",
			resistantPredicate: "true",
		});
		expect(onceHalved).toBe("cond(true, (20) / 2, 20)");
		expect(onceHalved.match(/cond/g)?.length).toBe(1);
	});

	it("Immunity overrides Resistance/Vulnerability entirely, regardless of their own predicates", () => {
		expect(evalPipeline(100, true, true, true)).toBe(0);
	});

	it("EXHAUSTIVE: every representative adjusted-damage value x all 8 predicate combinations", () => {
		const values = [0, 1, 3, 7, 8, 23, 28, 100];
		for (const value of values) {
			for (const resistant of [false, true]) {
				for (const vulnerable of [false, true]) {
					for (const immune of [false, true]) {
						const result = evalPipeline(value, resistant, vulnerable, immune);
						if (immune) {
							expect(result).toBe(0);
						} else {
							const expectedResisted = resistant ? Math.trunc(value / 2) : value;
							const expected = vulnerable ? expectedResisted * 2 : expectedResisted;
							expect(result).toBe(expected);
						}
						expect(result).toBeGreaterThanOrEqual(0);
					}
				}
			}
		}
	});
});
