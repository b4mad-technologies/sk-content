// Skill Proficiencies mechanic offline proof: `skillCheckExpr` is a thin,
// pinned composition of `d20TestExpr` (module header: "no new expression
// idiom") — the exhaustive proficient/unproficient cross-product itself
// already lives in `d20-units.test.ts` (the `proficiencyCapabilityId`
// describe block), proven once at the idiom's actual source rather than
// duplicated here. This file proves the COMPOSITION is correct (right
// options land in the right d20TestExpr fields) and pins the emitted string.
import { describe, expect, it } from "vitest";

import { d20TestExpr } from "../../chapters/playing-the-game/d20-units";
import { skillCheckExpr } from "../../chapters/playing-the-game/skill-proficiency-units";

describe("skillCheckExpr (Skill Proficiencies mechanic)", () => {
	it("is byte-identical to d20TestExpr called with proficiencyCapabilityId = skillCapabilityId (pinned equivalence)", () => {
		const options = {
			scoreExpr: "actor.stat('srd/wis')",
			skillCapabilityId: "srd/skill/perception",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			dc: 15,
		};
		expect(skillCheckExpr(options)).toBe(
			d20TestExpr({
				scoreExpr: options.scoreExpr,
				proficiencyLevelExpr: options.proficiencyLevelExpr,
				proficiencyCapabilityId: options.skillCapabilityId,
				dc: options.dc,
			}),
		);
	});

	it("threads circumstantialExpr through unchanged", () => {
		const withCircumstance = skillCheckExpr({
			scoreExpr: "actor.stat('srd/dex')",
			skillCapabilityId: "srd/skill/stealth",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			circumstantialExpr: "2",
			dc: 12,
		});
		expect(withCircumstance).toContain("+ (2) >= 12");
	});

	it("does NOT gate the check itself — no capability reference outside the cond() bonus term", () => {
		const expr = skillCheckExpr({
			scoreExpr: "actor.stat('srd/wis')",
			skillCapabilityId: "srd/skill/perception",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			dc: 15,
		});
		// has_capability appears exactly once — inside the cond() gate, never as
		// a standalone `&&`-chained eligibility guard (module header: untrained
		// creatures can still attempt the check).
		// Expertise branch + proficient branch.
		expect(expr.split("has_capability").length - 1).toBe(6);
		expect(expr).not.toMatch(/&&\s*actor\.has_capability/);
	});
});
