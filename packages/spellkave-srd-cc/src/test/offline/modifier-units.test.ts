// DOC-PROMISE: derived-values#rounding-two-tables-opposite-semantics
// Slice 1b offline proof: BOTH lookup tables of the chapter are reproduced
// EXHAUSTIVELY (every score 1..30, every level/CR 0..30) from the committed
// cache, and the DSL expression builders are proven to reproduce them under
// ENGINE semantics (Rust i64 truncating division), not JS semantics.
//
// Layering per the 1b test decision (operator, 2026-07-27): completeness
// lives HERE (offline, every table row is an assertion); the live tier only
// proves the chain once (proof scene, one score -> one modifier through a
// real predicate). See `modifier-units.ts`'s module header for why the two
// tables need OPPOSITE rounding semantics — the two negative controls below
// pin exactly that, so a future "simplification" of either builder fails
// loudly here instead of silently shifting 5e math.
import { describe, expect, it } from "vitest";
import {
	ABILITY_MODIFIER_MACRO_BODY_SOURCE,
	ABILITY_MODIFIER_MACRO_ID,
	ACTOR_ABILITY_MODIFIER_MACROS,
	abilityModifierExpr,
	abilityModifierMacroCall,
	abilityModifierTable,
	expectedAbilityModifier,
	expectedProficiencyBonus,
	MAX_ABILITY_SCORE,
	MAX_LEVEL_OR_CR,
	MIN_ABILITY_SCORE,
	MIN_LEVEL_OR_CR,
	PROFICIENCY_BONUS_MACRO_BODY_SOURCE,
	PROFICIENCY_BONUS_MACRO_ID,
	proficiencyBonusMacroCall,
	proficiencyBonusTable,
	truncDiv,
} from "../../chapters/playing-the-game/modifier-units";
import { srdEvidence } from "../srd-coverage/evidence";

// Emulate the builder's emitted algebra step-for-step under engine semantics.
// Kept in lockstep with `abilityModifierExpr` — the structural snapshot test
// below pins the emitted string so the two cannot drift apart silently.
function evalAbilityModifierIdiom(score: number): number {
	const delta = score - 10;
	return truncDiv(delta, 2) + (delta - truncDiv(delta, 2) * 2 < 0 ? -1 : 0);
}

function evalProficiencyBonusIdiom(levelOrCr: number): number {
	return 2 + truncDiv(levelOrCr - 1, 4);
}

describe("ability-modifier table (slice 1b)", () => {
	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "ability-modifiers",
			aspect: "source",
			claim: "the SRD table covers every ability score from 1 through 30",
		},
		() => {
			const bands = abilityModifierTable();
			expect(bands).toHaveLength(16);
			expect(bands[0]?.minScore).toBe(MIN_ABILITY_SCORE);
			expect(bands.at(-1)?.maxScore).toBe(MAX_ABILITY_SCORE);
			for (let index = 1; index < bands.length; index += 1) {
				expect(bands[index]?.minScore).toBe((bands[index - 1]?.maxScore ?? Number.NaN) + 1);
			}
			// modifiers ascend by exactly 1 per band: -5 .. +10
			expect(bands.map((band) => band.modifier)).toEqual(
				Array.from({ length: 16 }, (_, index) => index - 5),
			);
		},
	);

	it("every score 1..30: table == floor((score-10)/2)", () => {
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			expect(expectedAbilityModifier(score)).toBe(Math.floor((score - 10) / 2));
		}
	});

	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "ability-modifiers",
			aspect: "mechanic",
			claim: "the emitted DSL idiom reproduces every row under engine division semantics",
		},
		() => {
			for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
				expect(evalAbilityModifierIdiom(score)).toBe(expectedAbilityModifier(score));
			}
		},
	);

	it("NEGATIVE CONTROL: bare truncating division (no correction idiom) diverges at odd scores below 10", () => {
		const divergent = [];
		for (let score = MIN_ABILITY_SCORE; score <= MAX_ABILITY_SCORE; score += 1) {
			if (truncDiv(score - 10, 2) !== expectedAbilityModifier(score)) {
				divergent.push(score);
			}
		}
		// exactly the odd scores 1,3,5,7,9 — proof the sister's correction is load-bearing
		expect(divergent).toEqual([1, 3, 5, 7, 9]);
	});

	it("routes the legacy helper through the single typed macro", () => {
		expect(abilityModifierExpr("actor.stat('srd/str')")).toBe(
			"macro('srd/ability_modifier', actor.stat('srd/str'))",
		);
	});

	it("emits the typed macro call and retains the correction in its declared body", () => {
		expect(abilityModifierMacroCall("actor.stat('srd/str')")).toBe(
			"macro('srd/ability_modifier', actor.stat('srd/str'))",
		);
		expect(ABILITY_MODIFIER_MACRO_ID).toBe("srd/ability_modifier");
		expect(ABILITY_MODIFIER_MACRO_BODY_SOURCE).toBe(
			"((score) - 10) / 2 + cond(((score) - 10) - (((score) - 10) / 2) * 2 < 0, -1, 0)",
		);
	});

	it("uses canonical zero-argument macros only for exact actor effective ability reads", () => {
		for (const macro of ACTOR_ABILITY_MODIFIER_MACROS) {
			expect(abilityModifierMacroCall(`actor.effective('${macro.abilityId}')`)).toBe(
				`macro('${macro.id}')`,
			);
		}
		expect(abilityModifierMacroCall("cond(true, actor.effective('srd/str'), 10)")).toBe(
			"macro('srd/ability_modifier', cond(true, actor.effective('srd/str'), 10))",
		);
	});
});

describe("proficiency-bonus table (slice 1b)", () => {
	it("parses 8 contiguous bands covering exactly level/CR 0..30", () => {
		const bands = proficiencyBonusTable();
		expect(bands).toHaveLength(8);
		expect(bands[0]?.minLevelOrCr).toBe(MIN_LEVEL_OR_CR);
		expect(bands.at(-1)?.maxLevelOrCr).toBe(MAX_LEVEL_OR_CR);
		for (let index = 1; index < bands.length; index += 1) {
			expect(bands[index]?.minLevelOrCr).toBe((bands[index - 1]?.maxLevelOrCr ?? Number.NaN) + 1);
		}
		expect(bands.map((band) => band.bonus)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it("every level/CR 0..30: the emitted DSL idiom (bare truncation) reproduces the table", () => {
		for (let level = MIN_LEVEL_OR_CR; level <= MAX_LEVEL_OR_CR; level += 1) {
			expect(evalProficiencyBonusIdiom(level)).toBe(expectedProficiencyBonus(level));
		}
	});

	it("NEGATIVE CONTROL: a floor-'corrected' variant would be WRONG at CR 0 (table says +2, floor says +1)", () => {
		expect(2 + Math.floor((0 - 1) / 4)).toBe(1);
		expect(expectedProficiencyBonus(0)).toBe(2);
	});

	it("exposes the same table formula as a typed leaf macro", () => {
		expect(PROFICIENCY_BONUS_MACRO_ID).toBe("srd/proficiency_bonus");
		expect(PROFICIENCY_BONUS_MACRO_BODY_SOURCE).toBe("2 + ((level_or_cr) - 1) / 4");
		expect(proficiencyBonusMacroCall("actor.stat('srd/level')")).toBe(
			"macro('srd/proficiency_bonus', actor.stat('srd/level'))",
		);
	});
});
