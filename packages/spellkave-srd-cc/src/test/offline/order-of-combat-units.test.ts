// The Order of Combat offline proof: Combat Step by Step (3 steps) and the
// Initiative sub-rules (Surprise/Initiative Order/Ties), pinned against the
// cached SRD text, plus `initiativeRollExpr`'s composition. This unit's real
// deliverable is the reconciliation verdict recorded in its own module
// header (SRD step -> substrate mechanism / gap, incl. NEW finding
// finding #26) — this test grounds the verdict's quoted text, not a new
// mechanic.
import { describe, expect, it } from "vitest";
import { abilityModifierExpr } from "../../chapters/playing-the-game/modifier-units";
import {
	combatSteps,
	initiativeRollExpr,
	initiativeSubRules,
	parseCombatSteps,
	parseInitiativeSubRules,
} from "../../chapters/playing-the-game/order-of-combat-units";

describe("Combat Step by Step", () => {
	it("parses exactly 3 steps, in order, with titles pinned", () => {
		const steps = combatSteps();
		expect(steps.map((s) => s.ordinal)).toEqual([1, 2, 3]);
		expect(steps.map((s) => s.title)).toEqual([
			"Establish Positions",
			"Roll Initiative",
			"Take Turns",
		]);
	});

	it("throws loudly when the Combat Step by Step heading is absent (negative control)", () => {
		expect(() => parseCombatSteps("no heading here")).toThrow(/heading not found/);
	});

	it("throws loudly when the heading is present but no numbered steps follow (negative control)", () => {
		expect(() =>
			parseCombatSteps("## Combat Step by Step\n\nno numbered steps here\n\n## Initiative"),
		).toThrow(/no numbered Combat Step by Step steps parsed/);
	});
});

describe("Initiative sub-rules", () => {
	it("parses exactly Surprise/Initiative Order/Ties, in SRD order", () => {
		const rules = initiativeSubRules();
		expect(rules.map((r) => r.label)).toEqual(["Surprise", "Initiative Order", "Ties"]);
	});

	it("Surprise imposes Disadvantage on the surprised combatant's Initiative roll", () => {
		const surprise = initiativeSubRules().find((r) => r.label === "Surprise");
		expect(surprise?.text).toMatch(/Disadvantage on their Initiative roll/);
	});

	it("Ties: the GM/players decide — the substrate's own deterministic tiebreak is a confirmed, necessary divergence", () => {
		const ties = initiativeSubRules().find((r) => r.label === "Ties");
		expect(ties?.text).toMatch(/the GM decides the order/);
		expect(ties?.text).toMatch(/the players decide the order/);
	});

	it("throws loudly when the Initiative heading is absent (negative control)", () => {
		expect(() => parseInitiativeSubRules("no heading here")).toThrow(/heading not found/);
	});

	it("throws loudly when Initiative has no following Your Turn heading (negative control)", () => {
		expect(() =>
			parseInitiativeSubRules("## Initiative\n\nsome prose, no Your Turn heading"),
		).toThrow(/no following '## Your Turn' heading/);
	});

	it("throws loudly when a labelled sub-rule is missing (negative control)", () => {
		expect(() =>
			parseInitiativeSubRules("## Initiative\n\n**Surprise.** text\n\n## Your Turn"),
		).toThrow(/no '\*\*Initiative Order\.\*\* \.\.\.' Initiative sub-rule found/);
	});
});

describe("initiativeRollExpr", () => {
	it("composes d20 + the ability-modifier idiom (modifier-units.ts's own builder), never a bare literal modifier", () => {
		const scoreExpr = "actor.stat('srd/dex')";
		expect(initiativeRollExpr(scoreExpr)).toBe(`d20 + (${abilityModifierExpr(scoreExpr)})`);
	});

	it("is a pure function of its input expression — same input, byte-identical output", () => {
		const a = initiativeRollExpr("actor.stat('srd/dex')");
		const b = initiativeRollExpr("actor.stat('srd/dex')");
		expect(a).toBe(b);
	});
});
