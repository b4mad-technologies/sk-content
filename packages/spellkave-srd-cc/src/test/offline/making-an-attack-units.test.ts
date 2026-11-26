// Making an Attack offline proof: the 3-step procedure, exhaustive, pinned
// against the cached SRD text. Row-less provenance unit (no new idiom — see
// making-an-attack-units.ts's own module header for the mapping onto
// cover-units.ts / attack-roll-units.ts).
import { describe, expect, it } from "vitest";

import {
	attackProcedureSteps,
	parseAttackProcedureSteps,
} from "../../chapters/playing-the-game/making-an-attack-units";

describe("Making an Attack procedure", () => {
	it("parses exactly 3 steps, in order, with titles pinned", () => {
		const steps = attackProcedureSteps();
		expect(steps).toHaveLength(3);
		expect(steps.map((s) => s.ordinal)).toEqual([1, 2, 3]);
		expect(steps.map((s) => s.title)).toEqual([
			"Choose a Target",
			"Determine Modifiers",
			"Resolve the Attack",
		]);
	});

	it("step 2 (Determine Modifiers) names Cover explicitly — this chapter's own compose-level hook", () => {
		const step2 = attackProcedureSteps().find((s) => s.ordinal === 2);
		expect(step2?.text).toMatch(/Cover/);
		expect(step2?.text).toMatch(/Advantage or Disadvantage/);
	});

	it("step 3 (Resolve the Attack) names the attack roll and damage-on-a-hit", () => {
		const step3 = attackProcedureSteps().find((s) => s.ordinal === 3);
		expect(step3?.text).toMatch(/attack roll/);
		expect(step3?.text).toMatch(/roll damage/);
	});

	it("throws loudly when no numbered steps are present (negative control)", () => {
		expect(() => parseAttackProcedureSteps("no procedure here at all")).toThrow(
			/no 'N\. \*\*Title\.\*\* text' procedure steps parsed/,
		);
	});
});
