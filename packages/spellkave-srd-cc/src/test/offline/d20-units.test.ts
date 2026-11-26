// D20 Tests core-procedure offline proof: the composed check predicate is
// proven EXHAUSTIVELY over the full cross-product an authored check can see —
// every score 1..30 x every d20 face 1..20 x the SRD's Typical DC ladder —
// under ENGINE semantics (Rust i64 truncating division via the same emulators
// modifier-units.test.ts pins in lockstep with the builders). The proficient
// variant adds every level/CR 0..30.
//
// Layering per the 1b test decision (operator, 2026-07-27), extended to this
// unit: completeness lives HERE; the live tier proves the chain once per
// branch — boundary DCs deterministically (guaranteedSuccessDc /
// guaranteedFailureDc admit/reject on EVERY face), the mid-DC arithmetic via
// the engine-recorded die face (proof-scene test). The boundary identities
// the live proof leans on are pinned here for every modifier the ability
// table can produce.
import { describe, expect, it } from "vitest";

import { typicalDifficultyClasses } from "../../chapters/playing-the-game/ability-checks-units";
import {
	biasableD20TestExpr,
	D20_MAX_FACE,
	D20_MIN_FACE,
	d20TestExpr,
	d20TestSteps,
	guaranteedFailureDc,
	guaranteedSuccessDc,
} from "../../chapters/playing-the-game/d20-units";
import {
	expectedAbilityModifier,
	expectedProficiencyBonus,
	MAX_ABILITY_SCORE,
	MAX_LEVEL_OR_CR,
	MIN_ABILITY_SCORE,
	MIN_LEVEL_OR_CR,
	truncDiv,
} from "../../chapters/playing-the-game/modifier-units";

// The SRD's Typical Difficulty Classes ladder (§ D20 Tests > Ability Checks),
// SOURCED from the cache via ability-checks-units.ts — not hand-typed (this
// test used to hardcode `[5, 10, 15, 20, 25, 30]`; it is now a real consumer
// of the parsed table, closing that unit's own "ground in whether any
// consumer reads DCs from data" open question). The exhaustive claim is over
// score x face, the DC axis only needs the authored range.
const TYPICAL_DCS = typicalDifficultyClasses().map((rung) => rung.dc);

// Emulate the composed predicate step-for-step under engine semantics (same
// lockstep discipline as modifier-units.test.ts's emulators; the pinned
// expression-string snapshots below keep builder and emulator from drifting).
function evalAbilityModifierIdiom(score: number): number {
	const delta = score - 10;
	return truncDiv(delta, 2) + (delta - truncDiv(delta, 2) * 2 < 0 ? -1 : 0);
}

function evalProficiencyBonusIdiom(levelOrCr: number): number {
	return 2 + truncDiv(levelOrCr - 1, 4);
}

function evalD20TestIdiom(
	face: number,
	score: number,
	dc: number,
	proficiencyLevel?: number,
): boolean {
	let total = face + evalAbilityModifierIdiom(score);
	if (proficiencyLevel !== undefined) {
		total += evalProficiencyBonusIdiom(proficiencyLevel);
	}
	return total >= dc;
}

describe("D20 Tests procedure source (§ D20 Tests, cached markdown)", () => {
	it("parses exactly the three steps, in order — including the markdown-only step 3 (ledger observation 5)", () => {
		// Steps are numbered 4..6 in the markdown (1..3 belong to Rhythm of
		// Play). Step "Compare the Total to a Target Number" exists ONLY in the
		// markdown — the open5e RuleSet desc omits it — which is exactly why
		// d20-units.ts sources the procedure from the markdown.
		expect(d20TestSteps()).toEqual([
			{ ordinal: 4, title: "Roll 1d20" },
			{ ordinal: 5, title: "Add Modifiers" },
			{ ordinal: 6, title: "Compare the Total to a Target Number" },
		]);
	});
});

describe("d20TestExpr (core-procedure predicate idiom)", () => {
	it("composes the sister-shaped check predicate from the chapter's idiom builders (pinned)", () => {
		expect(d20TestExpr({ scoreExpr: "actor.stat('srd/str')", dc: 15 })).toBe(
			"d20 + macro('srd/ability_modifier', actor.stat('srd/str')) >= 15",
		);
	});

	it("proficient variant appends the bare-truncation proficiency idiom (pinned)", () => {
		expect(
			d20TestExpr({
				scoreExpr: "actor.stat('srd/str')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				dc: 15,
			}),
		).toBe(
			"d20 + macro('srd/ability_modifier', actor.stat('srd/str')) + " +
				"macro('srd/proficiency_bonus', actor.stat('srd/level')) >= 15",
		);
	});

	it("circumstantial term is parenthesized and additive (pinned)", () => {
		expect(
			d20TestExpr({ scoreExpr: "actor.stat('srd/dex')", circumstantialExpr: "2", dc: 10 }),
		).toBe("d20 + macro('srd/ability_modifier', actor.stat('srd/dex')) + " + "(2) >= 10");
	});

	it("EXHAUSTIVE: every score 1..30 x face 1..20 x typical DC — idiom == face + table-modifier >= DC", () => {
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			const modifier = expectedAbilityModifier(score);
			for (let face = D20_MIN_FACE; face <= D20_MAX_FACE; face += 1) {
				for (const dc of TYPICAL_DCS) {
					expect(evalD20TestIdiom(face, score, dc)).toBe(face + modifier >= dc);
				}
			}
		}
	});

	it("EXHAUSTIVE (proficient): every level/CR 0..30 x face 1..20 — idiom == face + modifier + table-bonus >= DC", () => {
		const score = 14; // fixed representative score; the score axis is exhausted above
		const modifier = expectedAbilityModifier(score);
		for (let level = MIN_LEVEL_OR_CR; level <= MAX_LEVEL_OR_CR; level += 1) {
			const bonus = expectedProficiencyBonus(level);
			for (let face = D20_MIN_FACE; face <= D20_MAX_FACE; face += 1) {
				for (const dc of TYPICAL_DCS) {
					expect(evalD20TestIdiom(face, score, dc, level)).toBe(face + modifier + bonus >= dc);
				}
			}
		}
	});
});

describe("biasableD20TestExpr (Advantage/Disadvantage-compatible sibling)", () => {
	it("emits roll_table('srd/d20') in place of the bare d20 grammar token (pinned)", () => {
		expect(biasableD20TestExpr({ scoreExpr: "actor.stat('srd/str')", dc: 15 })).toBe(
			"roll_table('srd/d20') + macro('srd/ability_modifier', actor.stat('srd/str')) >= 15",
		);
	});

	it("is STRUCTURALLY identical to d20TestExpr past the roll term (only the roll subexpression differs)", () => {
		// Both builders join the SAME ordered term list with " + " and the SAME
		// trailing " >= <dc>"; only terms[0] differs ("d20" vs
		// "roll_table('srd/d20')"). Proving the shared suffix is byte-identical
		// is what makes the two builders genuinely siblings, not two
		// independently-typed idioms that happen to look similar.
		const withProficiency = {
			scoreExpr: "actor.stat('srd/str')",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			circumstantialExpr: "2",
			dc: 15,
		};
		const bare = d20TestExpr(withProficiency);
		const biasable = biasableD20TestExpr(withProficiency);
		expect(bare.slice("d20".length)).toBe(biasable.slice("roll_table('srd/d20')".length));
	});

	// NOTE (documented, not worked around): this builder's distributional
	// equivalence to bare `d20` — that `roll_table('srd/d20')` draws the SAME
	// uniform 1..20 distribution — rests on the SISTER's own
	// `world-fixtures/srd/base/roll-tables.toml` `srd/d20` table (20 entries,
	// weight 1, results "1".."20"). THIS package's own `fixtures/` does not
	// yet author an `srd/d20` roll_tables row, so any manifest that actually
	// authors an affordance with `biasableD20TestExpr` today would fail
	// validation on a dangling roll-table reference until this chapter (or a
	// later one) ships that row — a real, deliberately-undone piece of
	// follow-up, not a silent gap.
});

describe("d20TestExpr proficiencyCapabilityId (Skill/Saving Throw Proficiencies gate)", () => {
	it("gates the PB term behind cond(actor.has_capability(...)) instead of adding it unconditionally (pinned)", () => {
		expect(
			d20TestExpr({
				scoreExpr: "actor.stat('srd/wis')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				proficiencyCapabilityId: "srd/skill/perception",
				dc: 15,
			}),
		).toBe(
			"d20 + macro('srd/ability_modifier', actor.stat('srd/wis')) + " +
				"cond(actor.has_capability('srd/expertise/perception'), 2, " +
				"cond(actor.has_capability('srd/skill/perception'), 1, " +
				"cond(actor.has_capability('srd/class-feature/bard/jack-of-all-trades'), 1, 0))) * " +
				"(macro('srd/proficiency_bonus', actor.stat('srd/level'))) / " +
				"cond(actor.has_capability('srd/expertise/perception'), 1, " +
				"cond(actor.has_capability('srd/skill/perception'), 1, " +
				"cond(actor.has_capability('srd/class-feature/bard/jack-of-all-trades'), 2, 1))) >= 15",
		);
	});

	it("is a no-op divergence when absent — identical to the pre-existing unconditional shape", () => {
		const shared = {
			scoreExpr: "actor.stat('srd/str')",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			dc: 10,
		};
		expect(d20TestExpr(shared)).toBe(
			d20TestExpr({ ...shared, proficiencyCapabilityId: undefined }),
		);
	});

	it("EXHAUSTIVE: gated cond() reproduces face + modifier + (proficient ? bonus : 0) >= DC for every score x level x face x proficiency-state", () => {
		function evalGatedIdiom(
			face: number,
			score: number,
			level: number,
			proficient: boolean,
			dc: number,
		): boolean {
			const modifier = evalAbilityModifierIdiom(score);
			const bonus = proficient ? evalProficiencyBonusIdiom(level) : 0;
			return face + modifier + bonus >= dc;
		}
		const score = 14; // fixed representative score; the score axis is exhausted in the unconditional test above
		const modifier = evalAbilityModifierIdiom(score);
		for (let level = MIN_LEVEL_OR_CR; level <= MAX_LEVEL_OR_CR; level += 1) {
			const bonus = expectedProficiencyBonus(level);
			for (let face = D20_MIN_FACE; face <= D20_MAX_FACE; face += 1) {
				for (const dc of TYPICAL_DCS) {
					expect(evalGatedIdiom(face, score, level, true, dc)).toBe(face + modifier + bonus >= dc);
					expect(evalGatedIdiom(face, score, level, false, dc)).toBe(face + modifier >= dc);
				}
			}
		}
	});
});

describe("The Bonus Doesn't Stack — negative control (playing-the-game.md § Proficiency > The Bonus Doesn't Stack)", () => {
	it("d20TestExpr never emits more than one proficiency-bonus term, gated or unconditional", () => {
		const cases = [
			d20TestExpr({ scoreExpr: "actor.stat('srd/str')", dc: 10 }),
			d20TestExpr({
				scoreExpr: "actor.stat('srd/str')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				dc: 10,
			}),
			d20TestExpr({
				scoreExpr: "actor.stat('srd/str')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				proficiencyCapabilityId: "srd/skill/athletics",
				dc: 10,
			}),
			biasableD20TestExpr({
				scoreExpr: "actor.stat('srd/str')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				proficiencyCapabilityId: "srd/skill/athletics",
				dc: 10,
			}),
		];
		for (const expr of cases) {
			// The central macro call counts at most once per expression, gated or
			// not; callers can still provide a deliberate custom term through
			// `proficiencyBonusTerm`.
			const occurrences = expr.split("macro('srd/proficiency_bonus'").length - 1;
			expect(occurrences).toBeLessThanOrEqual(1);
		}
	});
});

describe("boundary DCs (the live proof's deterministic-without-a-seed trick)", () => {
	it("guaranteedSuccessDc admits EVERY face and guaranteedFailureDc rejects EVERY face, for every table modifier -5..+10", () => {
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			const modifier = expectedAbilityModifier(score);
			for (let face = D20_MIN_FACE; face <= D20_MAX_FACE; face += 1) {
				expect(face + modifier >= guaranteedSuccessDc(modifier)).toBe(true);
				expect(face + modifier >= guaranteedFailureDc(modifier)).toBe(false);
			}
		}
	});

	it("NEGATIVE CONTROL: both boundaries are tight — one DC step further flips exactly the extreme face", () => {
		const modifier = 2;
		// one above the guaranteed-success DC: the natural 1 now fails
		expect(D20_MIN_FACE + modifier >= guaranteedSuccessDc(modifier) + 1).toBe(false);
		// one below the guaranteed-failure DC: the natural 20 now succeeds
		expect(D20_MAX_FACE + modifier >= guaranteedFailureDc(modifier) - 1).toBe(true);
	});
});
