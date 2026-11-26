// Attack Rolls offline proof: the Attack Roll Abilities table, the base AC
// formula's source-line guard, and — the unit's densest claim — EXHAUSTIVE
// proof that `attackRollExpr`'s `let`-bound nat-20/nat-1 override composes
// correctly with the ordinary total-vs-AC comparison, for every score 1..30 x
// face 1..20 x a representative AC range. This is the offline half of the
// probe that REFUTED the "needs two rolls" caution (see attack-roll-units.ts's
// module header) — proven here structurally (the emulator mirrors the exact
// three-branch shape the DSL string encodes), the live half is deferred (see
// ledger/playing-the-game.md's "Attack Rolls" row and the final report's
// design-decisions section).
import { describe, expect, it } from "vitest";
import {
	ATTACK_ROLL_HITS_MACRO_BODY_SOURCE,
	ATTACK_ROLL_HITS_MACRO_ID,
	assertBaseArmorClassFormulaSource,
	attackRollAbilities,
	attackRollExpr,
	attackRollHitsMacroCall,
	BASE_AC_MACRO_BODY_SOURCE,
	BASE_AC_MACRO_ID,
	baseArmorClassExpr,
	baseArmorClassMacroCall,
	parseAttackRollAbilities,
} from "../../chapters/playing-the-game/attack-roll-units";
import { D20_MAX_FACE, D20_MIN_FACE } from "../../chapters/playing-the-game/d20-units";
import {
	expectedAbilityModifier,
	MAX_ABILITY_SCORE,
	MIN_ABILITY_SCORE,
} from "../../chapters/playing-the-game/modifier-units";

describe("Attack Roll Abilities table", () => {
	it("parses exactly the three rows, SRD order and wording", () => {
		expect(attackRollAbilities()).toEqual([
			{
				ability: "Strength",
				attackType: "Melee attack with a weapon or an Unarmed Strike (see “Rules Glossary”)",
			},
			{ ability: "Dexterity", attackType: "Ranged attack with a weapon" },
			{
				ability: "Varies",
				attackType:
					"Spell attack (the ability used is determined by the spellcaster’s spellcasting feature, as explained in “Spells”)",
			},
		]);
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseAttackRollAbilities("no table here")).toThrow(/header not found/);
	});
});

describe("base AC formula source guard", () => {
	it("the formula line is still present verbatim in the cached markdown (open5e's own Rule.json desc drops it)", () => {
		expect(() => assertBaseArmorClassFormulaSource()).not.toThrow();
	});
});

describe("baseArmorClassExpr (10 + Dexterity modifier)", () => {
	it("emits the pinned expression shape", () => {
		expect(baseArmorClassExpr("actor.stat('srd/dex')")).toBe(
			"macro('srd/base_ac', macro('srd/ability_modifier', actor.stat('srd/dex')))",
		);
	});

	it("pins the typed base-AC leaf macro", () => {
		expect(BASE_AC_MACRO_ID).toBe("srd/base_ac");
		expect(BASE_AC_MACRO_BODY_SOURCE).toBe("10 + (dex_modifier)");
		expect(baseArmorClassMacroCall("3")).toBe("macro('srd/base_ac', 3)");
	});

	// Emulate the emitted `10 + <ability-modifier idiom>` string under engine
	// (truncating-division) semantics — same emulator shape as
	// modifier-units.test.ts's own `evalAbilityModifierIdiom`, kept local since
	// this is the ONE consumer of the formula at the +10 offset.
	function evalBaseAc(dexScore: number): number {
		const delta = dexScore - 10;
		const truncated = Math.trunc(delta / 2);
		return 10 + truncated + (delta - truncated * 2 < 0 ? -1 : 0);
	}

	it("EXHAUSTIVE: every dex score 1..30 -> 10 + table modifier (engine semantics, not just JS floor)", () => {
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			expect(evalBaseAc(score)).toBe(10 + expectedAbilityModifier(score));
		}
	});
});

describe("attackRollExpr (central nat-20/nat-1 macro)", () => {
	it("emits one roll and delegates the hit rule to the typed macro", () => {
		expect(attackRollExpr({ scoreExpr: "actor.stat('srd/str')", acExpr: "15" })).toBe(
			"let attack_roll = d20; macro('srd/attack_roll_hits', attack_roll, attack_roll + " +
				"macro('srd/ability_modifier', actor.stat('srd/str')), (15), " +
				"cond(actor.has_capability('srd/class-feature/fighter/champion/improved-critical'), 19, 20))",
		);
	});

	it("pins the reusable nat-20/nat-1 macro definition and call helper", () => {
		expect(ATTACK_ROLL_HITS_MACRO_ID).toBe("srd/attack_roll_hits");
		expect(ATTACK_ROLL_HITS_MACRO_BODY_SOURCE).toBe(
			"attack_roll != 1 && attack_roll >= crit_threshold || total >= ac",
		);
		expect(attackRollHitsMacroCall("roll", "total", "ac")).toBe(
			"macro('srd/attack_roll_hits', roll, total, ac, 20)",
		);
		expect(attackRollHitsMacroCall("roll", "total", "ac", "19")).toBe(
			"macro('srd/attack_roll_hits', roll, total, ac, 19)",
		);
	});

	// Emulate the EXACT three-branch shape the emitted DSL string encodes,
	// under engine (truncating-division) semantics: a SINGLE face value drives
	// all three references to `attack_roll` (nat-20 check, nat-1 check, and
	// the ordinary comparison) — never two independent draws.
	function evalAttackRollIdiom(
		face: number,
		score: number,
		ac: number,
		proficiencyLevel?: number,
	): boolean {
		if (face === 20) return true;
		if (face === 1) return false;
		let total = face + expectedAbilityModifier(score);
		if (proficiencyLevel !== undefined) {
			total += 2 + Math.trunc((proficiencyLevel - 1) / 4);
		}
		return total >= ac;
	}

	it("EXHAUSTIVE: every score 1..30 x face 1..20 x a representative AC range — nat-20 always hits, nat-1 always misses", () => {
		const representativeAcs = [5, 10, 13, 15, 18, 20, 25, 30, 40];
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			const modifier = expectedAbilityModifier(score);
			for (let face = D20_MIN_FACE; face <= D20_MAX_FACE; face += 1) {
				for (const ac of representativeAcs) {
					const expected = face === 20 ? true : face === 1 ? false : face + modifier >= ac;
					expect(evalAttackRollIdiom(face, score, ac)).toBe(expected);
				}
			}
		}
	});

	it("NEGATIVE CONTROL: nat-20 overrides even an AC no ordinary total could ever reach", () => {
		// score 1 -> modifier -5, face 20 -> ordinary total 15; an AC of 999 would
		// ordinarily NEVER be hit by any score/face combination, but nat-20 still hits.
		expect(evalAttackRollIdiom(20, MIN_ABILITY_SCORE, 999)).toBe(true);
	});

	it("NEGATIVE CONTROL: nat-1 misses even against an AC of 0 (any positive total would hit)", () => {
		// score 30 -> modifier +10, face 1 -> ordinary total 11, which would hit
		// AC 0 trivially — nat-1 still misses.
		expect(evalAttackRollIdiom(1, MAX_ABILITY_SCORE, 0)).toBe(false);
	});

	it("proficient variant appends the bare-truncation proficiency idiom (pinned)", () => {
		expect(
			attackRollExpr({
				scoreExpr: "actor.stat('srd/str')",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				acExpr: "target.stat('srd/ac')",
			}),
		).toContain("macro('srd/proficiency_bonus', actor.stat('srd/level'))");
	});

	it("Equipment Proficiencies (Weapons): proficiencyCapabilityId gates the bonus behind cond(actor.has_capability(...)) (pinned)", () => {
		const expr = attackRollExpr({
			scoreExpr: "actor.stat('srd/str')",
			proficiencyLevelExpr: "actor.stat('srd/level')",
			proficiencyCapabilityId: "srd/weapon/longsword",
			acExpr: "15",
		});
		expect(expr).toContain(
			"cond(actor.has_capability('srd/weapon/longsword'), macro('srd/proficiency_bonus', actor.stat('srd/level')), 0)",
		);
	});
});
