// Temporary Hit Points offline proof: `temporaryHpGainExpr`'s take-higher
// identity and `tempHpLoseFirstDeltas`'s two-ordinal pattern, both pinned
// against the source's own worked examples.
import { describe, expect, it } from "vitest";
import {
	assertTempHpProvenanceSource,
	INITIAL_TEMP_HP,
	MIN_TEMP_HP,
	TEMP_HP_DISPLAY_NAME,
	TEMP_HP_ID,
	TEMP_HP_RECOVERY_RULE,
	TEMP_HP_SAFETY_MAX,
	tempHpLoseFirstDeltas,
	temporaryHpGainExpr,
} from "../../chapters/playing-the-game/temp-hp-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "playing-the-game";
const DETAILS = "ledger/archive/playing-the-game-details.md";
const RECOVERY_FINDING = "ledger/archive/findings-details.md";

describe("temp-hp-units", () => {
	for (const unit of [
		"temporary-hit-points-identity",
		"temporary-hit-points-take-higher",
		"temporary-hit-points-lose-first",
		"temporary-hit-points-duration",
		"temporary-hit-points-not-healing",
	] as const) {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit,
				aspect: "source",
				claim: "the cached chapter retains the complete Temporary Hit Points rule",
				references: [DETAILS],
			},
			() => expect(() => assertTempHpProvenanceSource()).not.toThrow(),
		);
	}

	it("id/display name/bounds are the expected identity", () => {
		expect(TEMP_HP_ID).toBe("temp_hp");
		expect(TEMP_HP_DISPLAY_NAME).toBe("Temporary Hit Points");
		expect(MIN_TEMP_HP).toBe(0);
		expect(TEMP_HP_SAFETY_MAX).toBe(999);
		expect(INITIAL_TEMP_HP).toBe(0);
		// Deliberately "persistent", NOT "long_rest" — see the module header's
		// recovery_rule caveat (finding #31: the field is currently
		// unenforced server-side metadata).
		expect(TEMP_HP_RECOVERY_RULE).toBe("persistent");
	});

	describe("temporaryHpGainExpr (They Don't Stack — take the higher)", () => {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit: "temporary-hit-points-take-higher",
				aspect: "mechanic",
				claim: "the gain expression keeps the higher pool instead of stacking grants",
				references: [DETAILS],
			},
			() => {
				expect(temporaryHpGainExpr("12", "actor.stat('srd/temp_hp')")).toBe(
					"max(0, (12) - (actor.stat('srd/temp_hp')))",
				);
			},
		);

		// Emulates ModifyResource's own proven clamp-add semantics
		// (current.saturating_add(delta), module header's derivation) composed
		// with this delta: current + max(0, newAmount - current).
		function evalGain(current: number, newAmount: number): number {
			return current + Math.max(0, newAmount - current);
		}

		it("worked example from the source: 10 current + a 12-grant -> 12 (keep the higher, never 22)", () => {
			expect(evalGain(10, 12)).toBe(12);
			expect(evalGain(10, 12)).not.toBe(22);
		});

		it("EXHAUSTIVE: composed result always equals max(current, newAmount) — never additive", () => {
			const currents = [0, 1, 5, 10, 12, 50, 999];
			const grants = [0, 1, 5, 10, 12, 50, 999];
			for (const current of currents) {
				for (const grant of grants) {
					expect(evalGain(current, grant)).toBe(Math.max(current, grant));
				}
			}
		});

		it("a lower or equal new grant changes nothing (you may keep what you have)", () => {
			expect(evalGain(10, 5)).toBe(10);
			expect(evalGain(10, 10)).toBe(10);
		});
	});

	describe("tempHpLoseFirstDeltas (Lose Temporary Hit Points First)", () => {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit: "temporary-hit-points-lose-first",
				aspect: "mechanic",
				claim: "the two deltas drain temporary HP before spilling damage into real HP",
				references: [DETAILS],
			},
			() => {
				const deltas = tempHpLoseFirstDeltas({
					damageExpr: "7",
					tempHpExpr: "actor.stat('srd/temp_hp')",
				});
				expect(deltas.hpDeltaSource).toBe("0 - max(0, (7) - (actor.stat('srd/temp_hp')))");
				expect(deltas.tempHpDeltaSource).toBe("0 - min(actor.stat('srd/temp_hp'), 7)");
			},
		);

		// Emulates both ordinals' arithmetic, applied via the SAME clamp-add
		// semantics `temporaryHpGainExpr`'s own emulator uses — both deltas read
		// the SAME pre-drain tempHp value (the pattern's own ordering contract).
		function evalLoseFirst(
			tempHp: number,
			hp: number,
			damage: number,
		): { hp: number; tempHp: number } {
			const hpDelta = -Math.max(0, damage - tempHp);
			const tempHpDelta = -Math.min(tempHp, damage);
			return { hp: hp + hpDelta, tempHp: tempHp + tempHpDelta };
		}

		it("worked example from the source: 5 Temp HP + 7 damage -> lose the 5, then lose 2 HP", () => {
			const result = evalLoseFirst(5, 20, 7);
			expect(result.tempHp).toBe(0);
			expect(result.hp).toBe(18); // 20 - 2
		});

		it("damage fully absorbed by Temp HP: no spillover to real HP", () => {
			const result = evalLoseFirst(5, 20, 3);
			expect(result.tempHp).toBe(2);
			expect(result.hp).toBe(20);
		});

		it("no Temp HP at all: full damage goes straight to real HP", () => {
			const result = evalLoseFirst(0, 20, 7);
			expect(result.tempHp).toBe(0);
			expect(result.hp).toBe(13);
		});

		it("EXHAUSTIVE: total HP+tempHp lost always equals the damage dealt", () => {
			const tempHps = [0, 1, 2, 5, 10, 20];
			const damages = [0, 1, 3, 5, 7, 10, 15, 25];
			for (const tempHp of tempHps) {
				for (const damage of damages) {
					const startHp = 999;
					const result = evalLoseFirst(tempHp, startHp, damage);
					const totalLost = tempHp - result.tempHp + (startHp - result.hp);
					expect(totalLost).toBe(damage);
					expect(result.tempHp).toBeGreaterThanOrEqual(0);
				}
			}
		});
	});

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "temporary-hit-points-identity",
		aspect: "mechanic",
		reason: "the resource identity has no independent behavior",
		references: [DETAILS],
	});
	for (const aspect of ["fixture", "live"] as const) {
		srdUnencoded({
			chapter: CHAPTER,
			unit: "temporary-hit-points-identity",
			aspect,
			claim: `the temporary-HP resource identity needs ${aspect} evidence`,
			references: [DETAILS],
		});
	}
	for (const unit of [
		"temporary-hit-points-take-higher",
		"temporary-hit-points-lose-first",
	] as const) {
		for (const aspect of ["fixture", "live"] as const) {
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: `a concrete temporary-HP consumer must prove the ${aspect} axis`,
				references: [DETAILS],
			});
		}
	}
	for (const unit of [
		"temporary-hit-points-duration",
		"temporary-hit-points-not-healing",
	] as const) {
		for (const aspect of ["mechanic", "fixture", "live"] as const) {
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: `the ${unit} rule still needs executable ${aspect} evidence`,
				references:
					unit === "temporary-hit-points-duration" ? [DETAILS, RECOVERY_FINDING] : [DETAILS],
			});
		}
	}
});
