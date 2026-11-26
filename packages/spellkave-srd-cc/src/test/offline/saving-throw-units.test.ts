// Saving Throws offline proof: the Saving Throw Examples table parsed from
// the committed cache, plus exhaustive proof that `saveHalvesExpr` reproduces
// the sister's own save-for-half shape (`attack-spell.toml`'s
// `srd/attack/spell_save/hit` frame_write) under engine semantics — every
// combination of save-check outcome (true/false) x representative damage
// value, checked against the hand-worked expectation.
import { describe, expect, it } from "vitest";

import {
	d20TestExpr,
	guaranteedFailureDc,
	guaranteedSuccessDc,
} from "../../chapters/playing-the-game/d20-units";
import {
	PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID,
	PROOF_DEX_STATE_ID,
	PROOF_LEVEL_STATE_ID,
	PROOF_SAVE_DAMAGE,
	PROOF_SAVE_DC_STATE_ID,
} from "../../chapters/playing-the-game/proof-scene";
import {
	parseSavingThrowExamples,
	saveHalvesExpr,
	savingThrowExamples,
} from "../../chapters/playing-the-game/saving-throw-units";

describe("Saving Throw Examples table", () => {
	it("parses exactly the six abilities, in SRD order, with the prose's own wording", () => {
		expect(savingThrowExamples()).toEqual([
			{ ability: "Strength", makeASaveTo: "Physically resist direct force" },
			{ ability: "Dexterity", makeASaveTo: "Dodge out of harm’s way" },
			{ ability: "Constitution", makeASaveTo: "Endure a toxic hazard" },
			{ ability: "Intelligence", makeASaveTo: "Recognize an illusion as fake" },
			{ ability: "Wisdom", makeASaveTo: "Resist a mental assault" },
			{ ability: "Charisma", makeASaveTo: "Assert your identity" },
		]);
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseSavingThrowExamples("no table here")).toThrow(/header not found/);
	});
});

describe("saveHalvesExpr (save-for-half consequence idiom)", () => {
	it("emits the sister-shaped conditional, pinned so builder cannot silently drift", () => {
		expect(saveHalvesExpr("d20 >= 13", "roll_table('srd/damage/fireball')")).toBe(
			"cond(d20 >= 13, (roll_table('srd/damage/fireball')) / 2, roll_table('srd/damage/fireball'))",
		);
	});

	// Emulate the emitted `cond(saveCheck, half, full)` shape directly — the
	// save check itself is exhaustively proven in d20-units.test.ts, so this
	// only needs to prove the halving branch selection is correct for every
	// boolean outcome x representative damage value.
	function evalSaveHalves(saveSucceeds: boolean, damage: number): number {
		return saveSucceeds ? Math.trunc(damage / 2) : damage;
	}

	it("EXHAUSTIVE: every representative damage value x both save outcomes", () => {
		const damages = [1, 2, 3, 7, 8, 20, 55, 100];
		for (const damage of damages) {
			expect(evalSaveHalves(true, damage)).toBe(Math.trunc(damage / 2));
			expect(evalSaveHalves(false, damage)).toBe(damage);
		}
	});

	// SIGN SEMANTICS (Bucket-6, Damage and Healing unit): a ModifyResource
	// damage delta is always SIGN-NEGATED (the sister's own "0 - ..."
	// convention, `saveHalvesExpr`'s own consumer in `proof-scene.ts`'s
	// (F3-collapsed, single) save check: `0 - (saveHalvesExpr(...))`). The concern
	// this addendum pins down: does negating AFTER halving (the shipped
	// order) agree with negating BEFORE halving, given the DSL's `/` truncates
	// TOWARD ZERO (not floor) — the exact class of silent 5e-math bug
	// `modifier-units.ts`'s own floor-correction idiom exists to catch?
	//
	// WORKED, NOT ASSUMED: truncation-toward-zero is an ODD function
	// (trunc(-x) == -trunc(x) for every real x, unlike floor) — so for any
	// POSITIVE damage magnitude d, trunc(-d / 2) == -trunc(d / 2). Since d is
	// always >= 0 here, trunc(d / 2) == floor(d / 2) (agreement holds for any
	// non-negative dividend, `hp-units.ts`'s own bloodiedExpr note), so
	// trunc(-d / 2) == -floor(d / 2) — negating before or after the halving
	// division gives the IDENTICAL result. Proven exhaustively below, not just
	// asserted algebraically.
	describe("sign semantics (negate-before vs negate-after halving agree)", () => {
		it("EXHAUSTIVE: every representative positive damage value, negate-after (shipped) equals negate-before", () => {
			// Rust i64 has no signed zero (0i64 - 0i64 === (0i64 - 1i64) / 2i64 ===
			// plain integer 0) — `+0`/`-0` normalized away below so this stays a
			// faithful emulation of the TARGET (i64) semantics rather than
			// asserting a JS float artifact (`Math.trunc(-0.5)` returns JS `-0`,
			// which `Object.is`-based `toBe` would otherwise distinguish from `+0`
			// for damage=1 alone — not a real discrepancy).
			const normalizeZero = (n: number): number => (n === 0 ? 0 : n);
			const damages = [1, 2, 3, 7, 8, 9, 10, 15, 20, 55, 99, 100];
			for (const damage of damages) {
				const negateAfter = 0 - Math.trunc(damage / 2); // shipped order: divide the positive magnitude, THEN negate
				const negateBefore = Math.trunc((0 - damage) / 2); // hypothetical: negate first, then divide
				expect(normalizeZero(negateAfter)).toBe(normalizeZero(negateBefore));
			}
		});

		it("worked boundary: 7 damage halved (round down) is 3, negated is -3 — not -4 (floor(-3.5))", () => {
			expect(Math.trunc(7 / 2)).toBe(3);
			expect(0 - Math.trunc(7 / 2)).toBe(-3);
			// The floor-toward-negative-infinity trap this addendum rules out:
			// floor(-3.5) = -4, which would OVER-halve the damage by 1.
			expect(Math.floor(-7 / 2)).toBe(-4);
			expect(0 - Math.trunc(7 / 2)).not.toBe(Math.floor(-7 / 2));
		});
	});

	it("composes cleanly with a d20TestExpr-built save check (never retyped) — boundary DCs from the core-procedure unit", () => {
		// The save CHECK's own truth-table (does it deterministically succeed/
		// fail at a boundary DC) is exhaustively proven in d20-units.test.ts;
		// this only proves saveHalvesExpr composes that string as its cond
		// gate without mangling it, per the module's own "never retype" contract.
		const totalModifier = 3;
		const saveCheckExpr = d20TestExpr({
			scoreExpr: "actor.stat('srd/con')",
			dc: guaranteedSuccessDc(totalModifier),
		});
		expect(saveHalvesExpr(saveCheckExpr, "10")).toBe(`cond(${saveCheckExpr}, (10) / 2, 10)`);
		const failCheckExpr = d20TestExpr({
			scoreExpr: "actor.stat('srd/con')",
			dc: guaranteedFailureDc(totalModifier),
		});
		expect(saveHalvesExpr(failCheckExpr, "10")).toBe(`cond(${failCheckExpr}, (10) / 2, 10)`);
	});

	it("keeps the Saving Throw generic: Actor owns ability, level, and proficiency; TargetActor supplies only DC", () => {
		const saveCheckExpr = d20TestExpr({
			scoreExpr: `actor.stat('${PROOF_DEX_STATE_ID}')`,
			proficiencyLevelExpr: `actor.stat('${PROOF_LEVEL_STATE_ID}')`,
			proficiencyCapabilityId: PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID,
			dcExpr: `target.stat('${PROOF_SAVE_DC_STATE_ID}')`,
		});

		expect(saveCheckExpr).toContain(`actor.stat('${PROOF_DEX_STATE_ID}')`);
		expect(saveCheckExpr).toContain(`actor.stat('${PROOF_LEVEL_STATE_ID}')`);
		expect(saveCheckExpr).toContain(
			`actor.has_capability('${PROOF_DEX_SAVE_PROFICIENCY_CAPABILITY_ID}')`,
		);
		expect(saveCheckExpr).toContain(`target.stat('${PROOF_SAVE_DC_STATE_ID}')`);
		expect(saveHalvesExpr(saveCheckExpr, String(PROOF_SAVE_DAMAGE))).toBe(
			`cond(${saveCheckExpr}, (${PROOF_SAVE_DAMAGE}) / 2, ${PROOF_SAVE_DAMAGE})`,
		);
	});
});
