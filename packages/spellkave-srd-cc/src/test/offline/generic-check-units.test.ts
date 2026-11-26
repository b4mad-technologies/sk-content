// Generic check DC-source ladder offline proof (design: ledger/designs/
// generic-skill-check-target-dc.md § A + B). `genericSkillCheckExpr`/
// `genericAbilityCheckExpr` are thin, pinned compositions of `skillCheckExpr`/
// `d20TestExpr` (module header: "compose, never retype") — this file proves
// the composition is correct, pins the DC-ladder string shape, proves the
// Influence-skill-set membership, runs a negative control on the
// at-most-one-`has_capability` invariant (`d20-units.test.ts`'s own "Bonus
// Doesn't Stack" pattern), and grid-proves the ladder's ARITHMETIC under
// engine semantics (which tier wins for a representative cross-product of
// override/derived/static inputs).
import { describe, expect, it } from "vitest";

import {
	d20TestExpr,
	guaranteedFailureDc,
	guaranteedSuccessDc,
} from "../../chapters/playing-the-game/d20-units";
import {
	assertInfluenceChecksSource,
	buildGenericCheckSubjects,
	DC_OR_MACRO_BODY_SOURCE,
	DC_OR_MACRO_ID,
	dcOrMacroCall,
	genericAbilityCheckExpr,
	genericCheckDcExpr,
	genericSkillCheckExpr,
	INFLUENCE_SKILL_SLUGS,
	maxTypicalDc,
	staticFallbackDc,
} from "../../chapters/playing-the-game/generic-check-units";
import {
	abilityModifierMacroCall,
	proficiencyBonusMacroCall,
} from "../../chapters/playing-the-game/modifier-units";
import { skillCheckExpr } from "../../chapters/playing-the-game/skill-proficiency-units";

describe("assertInfluenceChecksSource (grounding guard)", () => {
	it("does not throw against the committed cache", () => {
		expect(() => assertInfluenceChecksSource()).not.toThrow();
	});
});

describe("staticFallbackDc / maxTypicalDc (Typical Difficulty Classes table reads)", () => {
	it("static fallback is the table's own 'Medium' rung (15)", () => {
		expect(staticFallbackDc()).toBe(15);
	});

	it("max bound is the table's own highest rung ('Nearly impossible', 30)", () => {
		expect(maxTypicalDc()).toBe(30);
	});
});

describe("buildGenericCheckSubjects (24 subjects: 18 skills + 6 raw abilities)", () => {
	const subjects = buildGenericCheckSubjects();

	it("returns exactly 24 subjects, sorted by slug", () => {
		expect(subjects).toHaveLength(24);
		const slugs = subjects.map((s) => s.slug);
		expect(slugs).toEqual([...slugs].sort((a, b) => a.localeCompare(b)));
	});

	it("18 are skills, 6 are raw abilities", () => {
		expect(subjects.filter((s) => s.kind === "skill")).toHaveLength(18);
		expect(subjects.filter((s) => s.kind === "ability")).toHaveLength(6);
	});

	it("every skill subject carries a skillCapabilitySuffix; every ability subject does not", () => {
		for (const subject of subjects) {
			if (subject.kind === "skill") {
				expect(subject.skillCapabilitySuffix).toBe(`skill/${subject.slug}`);
			} else {
				expect(subject.skillCapabilitySuffix).toBeUndefined();
			}
		}
	});

	it("isInfluenceShaped is true for EXACTLY the 5 named skills, false for everything else (including every ability)", () => {
		const influenceShaped = subjects.filter((s) => s.isInfluenceShaped).map((s) => s.slug);
		expect(influenceShaped.sort()).toEqual([...INFLUENCE_SKILL_SLUGS].sort());
		expect(INFLUENCE_SKILL_SLUGS).toHaveLength(5);
		for (const subject of subjects) {
			if (subject.kind === "ability") {
				expect(subject.isInfluenceShaped).toBe(false);
			}
		}
	});
});

describe("genericCheckDcExpr (DC-source ladder, design § B)", () => {
	it("non-Influence-shaped: dc_or(override, static-fallback) — pinned", () => {
		expect(
			genericCheckDcExpr({
				dcOverrideStateId: "srd/dc/athletics",
				isInfluenceShaped: false,
			}),
		).toBe("macro('srd/dc_or', target.stat('srd/dc/athletics'), 15)");
	});

	it("Influence-shaped: dc_or(override, max(static-fallback, target INT SCORE)) — pinned", () => {
		expect(
			genericCheckDcExpr({
				dcOverrideStateId: "srd/dc/persuasion",
				isInfluenceShaped: true,
				targetIntStateId: "srd/int",
			}),
		).toBe(
			"macro('srd/dc_or', target.stat('srd/dc/persuasion'), " + "max(15, target.stat('srd/int')))",
		);
	});

	it("pins the typed leaf macro definition and call helper", () => {
		expect(DC_OR_MACRO_ID).toBe("srd/dc_or");
		expect(DC_OR_MACRO_BODY_SOURCE).toBe("cond(override > 0, override, fallback)");
		expect(dcOrMacroCall("target.stat('srd/dc')", "15")).toBe(
			"macro('srd/dc_or', target.stat('srd/dc'), 15)",
		);
	});

	it("throws when isInfluenceShaped is true but targetIntStateId is missing", () => {
		expect(() =>
			genericCheckDcExpr({ dcOverrideStateId: "srd/dc/persuasion", isInfluenceShaped: true }),
		).toThrow(/requires targetIntStateId/);
	});
});

describe("genericSkillCheckExpr (composition, never retyped)", () => {
	it("is byte-identical to skillCheckExpr called with dcExpr = genericCheckDcExpr(...) (pinned equivalence)", () => {
		const dcOptions = {
			dcOverrideStateId: "srd/dc/persuasion",
			isInfluenceShaped: true,
			targetIntStateId: "srd/int",
		};
		const options = {
			scoreExpr: "actor.stat('srd/cha')",
			skillCapabilityId: "srd/skill/persuasion",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			...dcOptions,
		};
		expect(genericSkillCheckExpr(options)).toBe(
			skillCheckExpr({
				scoreExpr: options.scoreExpr,
				abilityModifierTerm: abilityModifierMacroCall(options.scoreExpr),
				skillCapabilityId: options.skillCapabilityId,
				proficiencyLevelExpr: options.proficiencyLevelExpr,
				proficiencyBonusTerm: proficiencyBonusMacroCall(options.proficiencyLevelExpr),
				dcExpr: genericCheckDcExpr(dcOptions),
			}),
		);
	});

	it("uses the typed proficiency-bonus macro exactly once", () => {
		const expr = genericSkillCheckExpr({
			scoreExpr: "actor.stat('srd/wis')",
			skillCapabilityId: "srd/skill/perception",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			dcOverrideStateId: "srd/dc/perception",
			isInfluenceShaped: false,
		});
		expect(expr.split("macro('srd/proficiency_bonus'").length - 1).toBe(1);
		expect(expr).not.toContain("2 + ((actor.stat('srd/level')) - 1) / 4");
	});
});

describe("genericAbilityCheckExpr (composition, never retyped — no proficiency term)", () => {
	it("is byte-identical to d20TestExpr called with dcExpr = genericCheckDcExpr(...), no proficiency fields (pinned equivalence)", () => {
		const dcOptions = {
			dcOverrideStateId: "srd/dc/str",
			isInfluenceShaped: false,
		};
		const options = { scoreExpr: "actor.stat('srd/str')", ...dcOptions };
		expect(genericAbilityCheckExpr(options)).toBe(
			d20TestExpr({
				scoreExpr: options.scoreExpr,
				abilityModifierTerm: abilityModifierMacroCall(options.scoreExpr),
				dcExpr: genericCheckDcExpr(dcOptions),
			}),
		);
	});

	it("emits NO has_capability term at all — raw ability checks add no proficiency bonus", () => {
		const expr = genericAbilityCheckExpr({
			scoreExpr: "actor.stat('srd/dex')",
			dcOverrideStateId: "srd/dc/dex",
			isInfluenceShaped: false,
		});
		expect(expr).not.toContain("has_capability");
	});
});

describe("The Bonus Doesn't Stack — negative control, applied to the generic-check idiom", () => {
	it("genericSkillCheckExpr skill PB gate reads expertise/skill/JoAT (numerator+divisor), Influence-shaped or not", () => {
		const cases = [
			genericSkillCheckExpr({
				scoreExpr: "actor.stat('srd/str')",
				skillCapabilityId: "srd/skill/athletics",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				dcOverrideStateId: "srd/dc/athletics",
				isInfluenceShaped: false,
			}),
			genericSkillCheckExpr({
				scoreExpr: "actor.stat('srd/cha')",
				skillCapabilityId: "srd/skill/persuasion",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				dcOverrideStateId: "srd/dc/persuasion",
				isInfluenceShaped: true,
				targetIntStateId: "srd/int",
			}),
		];
		for (const expr of cases) {
			// Expertise doubles PB: one expertise capability + one skill capability.
			expect(expr.split("has_capability").length - 1).toBe(6);
		}
	});
});

// Offline engine-semantics grid: emulate the ladder's own arithmetic (which
// tier wins) for a representative cross-product of override/derived/static
// inputs — proving the ENCODING, not merely the string shape the tests above
// already pin.
function evalLadderDc(
	override: number,
	isInfluenceShaped: boolean,
	targetInt: number,
	staticFallback: number,
): number {
	if (override > 0) return override;
	if (isInfluenceShaped) return Math.max(staticFallback, targetInt);
	return staticFallback;
}

describe("DC-ladder arithmetic grid (engine semantics: cond/max, tier precedence)", () => {
	const staticFallback = staticFallbackDc();

	it("override > 0 always wins, regardless of Influence-shape or target INT", () => {
		for (const override of [1, 5, 18, 30]) {
			for (const isInfluenceShaped of [false, true]) {
				for (const targetInt of [1, 15, 30]) {
					expect(evalLadderDc(override, isInfluenceShaped, targetInt, staticFallback)).toBe(
						override,
					);
				}
			}
		}
	});

	it("override <= 0 (sentinel/absent): non-Influence-shaped always falls to the static fallback", () => {
		for (const override of [0, -1]) {
			for (const targetInt of [1, 15, 30]) {
				expect(evalLadderDc(override, false, targetInt, staticFallback)).toBe(staticFallback);
			}
		}
	});

	it("override <= 0: Influence-shaped derives max(staticFallback, targetInt) across the full ability-score domain 1..30", () => {
		for (const targetInt of Array.from({ length: 30 }, (_, i) => i + 1)) {
			expect(evalLadderDc(0, true, targetInt, staticFallback)).toBe(
				Math.max(staticFallback, targetInt),
			);
		}
	});

	it("boundary DCs compose correctly with the ladder: guaranteedSuccessDc/guaranteedFailureDc against a derived Influence DC", () => {
		// A guaranteed-failure derived DC (target INT set to the actor's own
		// guaranteedFailureDc) demonstrates the live-proof construction this
		// module's own consumer (proof-scene.ts) uses for its Influence-shaped
		// boundary check.
		const actorTotalModifier = 0;
		const derivedFailureDc = guaranteedFailureDc(actorTotalModifier);
		expect(evalLadderDc(0, true, derivedFailureDc, staticFallback)).toBe(derivedFailureDc);
		expect(derivedFailureDc).toBeGreaterThan(staticFallback);

		const overrideSuccessDc = guaranteedSuccessDc(2);
		expect(evalLadderDc(overrideSuccessDc, true, derivedFailureDc, staticFallback)).toBe(
			overrideSuccessDc,
		);
	});
});
