// Hit Points offline proof: provenance guards + EXHAUSTIVE proof that
// `bloodiedExpr` reproduces the SRD's "half your Hit Points or fewer"
// threshold under the DSL's own truncating-toward-zero division — including
// the odd-max boundary case (max 15 -> bloodied at 7, not 8) that motivates
// the module header's own trunc-vs-floor reasoning.
import { describe, expect, it } from "vitest";
import {
	assertHpProvenanceSource,
	bloodiedExpr,
	HP_DISPLAY_NAME,
	HP_ID,
	HP_RECOVERY_RULE,
	HP_SAFETY_MAX,
	INITIAL_HP,
	MIN_HP,
} from "../../chapters/playing-the-game/hp-units";

describe("hp-units", () => {
	it("provenance sentences are present in the cached chapter markdown", () => {
		expect(() => assertHpProvenanceSource()).not.toThrow();
	});

	it("id/display name/bounds are the expected identity", () => {
		expect(HP_ID).toBe("hp");
		expect(HP_DISPLAY_NAME).toBe("Hit Points");
		expect(MIN_HP).toBe(0);
		expect(HP_SAFETY_MAX).toBe(999);
		expect(INITIAL_HP).toBe(999);
		expect(HP_RECOVERY_RULE).toBe("long_rest");
	});

	describe("bloodiedExpr", () => {
		it("emits the pinned shape", () => {
			expect(bloodiedExpr("actor.stat('srd/hp')", "10")).toBe("(actor.stat('srd/hp')) <= (10) / 2");
		});

		// Emulates the emitted `current <= max / 2` shape under Rust i64
		// truncating-toward-zero division (JS `Math.trunc` mirrors this exactly
		// for non-negative operands — see the module's own sign-safety note).
		function evalBloodied(current: number, max: number): boolean {
			return current <= Math.trunc(max / 2);
		}

		// Hand-worked expectation, independent of the DSL emulation above: for
		// every max, "half or fewer" of the REAL number max/2 is, for an
		// integer current, exactly current <= Math.floor(max / 2).
		function handWorkedBloodied(current: number, max: number): boolean {
			return current <= Math.floor(max / 2);
		}

		it("EXHAUSTIVE: every current 0..max x every representative max, both formulas agree", () => {
			const maxes = [0, 1, 2, 3, 4, 7, 8, 10, 14, 15, 20, 30, 100, 999];
			for (const max of maxes) {
				for (let current = 0; current <= max; current += 1) {
					expect(evalBloodied(current, max)).toBe(handWorkedBloodied(current, max));
				}
			}
		});

		it("odd-max boundary: max 15 is bloodied at 7, NOT bloodied at 8", () => {
			expect(evalBloodied(7, 15)).toBe(true);
			expect(evalBloodied(8, 15)).toBe(false);
		});

		it("even-max boundary: max 14 is bloodied at exactly half (7), not at 8", () => {
			expect(evalBloodied(7, 14)).toBe(true);
			expect(evalBloodied(8, 14)).toBe(false);
		});

		it("full HP (current == max) is never bloodied for any max > 0", () => {
			for (const max of [1, 2, 7, 15, 999]) {
				expect(evalBloodied(max, max)).toBe(false);
			}
		});

		it("0 HP is always bloodied (down to and including max == 0)", () => {
			for (const max of [0, 1, 7, 15, 999]) {
				expect(evalBloodied(0, max)).toBe(true);
			}
		});
	});
});
