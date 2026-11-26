// Cover offline proof: the 3-row table (exhaustive, all values pinned), plus
// (maxim-audit F1) the world-authoring id constants + the two shipped
// condition_definitions/modifier_templates rows built from them — the
// `coverModifiedAcExpr` compose-level builder this file used to also pin is
// RETIRED (see cover-units.ts's own module header for the decision); the
// mechanism is now exercised live via the proof scene's `cover-grant`/
// `attack-roll-cover` pair, and the shipped row SHAPES are pinned offline
// against the committed `fixtures/` in `fixtures-author-tool/equipment-cover.test.ts`.
import { describe, expect, it } from "vitest";

import {
	COVER_HALF_LOCAL_ID,
	COVER_HALF_MODIFIER_LOCAL_ID,
	COVER_THREE_QUARTERS_LOCAL_ID,
	COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID,
	coverTable,
	halfCoverBonus,
	parseCoverTable,
	threeQuartersCoverBonus,
} from "../../chapters/playing-the-game/cover-units";

describe("Cover table", () => {
	it("parses exactly Half/Three Quarters/Total, in SRD order, with every cell pinned", () => {
		expect(coverTable()).toEqual([
			{
				degree: "Half",
				bonus: 2,
				targetable: true,
				offeredBy: "Another creature or an object that covers at least half of the target",
			},
			{
				degree: "Three Quarters",
				bonus: 5,
				targetable: true,
				offeredBy: "An object that covers at least three-quarters of the target",
			},
			{
				degree: "Total",
				bonus: undefined,
				targetable: false,
				offeredBy: "An object that covers the whole target",
			},
		]);
	});

	it("bonuses grow monotonically Half < Three Quarters, and Total carries no numeric bonus", () => {
		expect(halfCoverBonus()).toBe(2);
		expect(threeQuartersCoverBonus()).toBe(5);
		expect(threeQuartersCoverBonus()).toBeGreaterThan(halfCoverBonus());
		const total = coverTable().find((d) => d.degree === "Total");
		expect(total?.bonus).toBeUndefined();
		expect(total?.targetable).toBe(false);
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseCoverTable("no table here")).toThrow(/header not found/);
	});

	it("throws loudly on a missing separator (negative control)", () => {
		expect(() => parseCoverTable("|Degree|Benefit to Target|Offered By|\nnot a separator")).toThrow(
			/separator/,
		);
	});

	it("throws loudly on a truncated table missing a degree row (negative control)", () => {
		expect(() =>
			parseCoverTable(
				"|Degree|Benefit to Target|Offered By|\n|---|---|---|\n" +
					"|Half|+2 bonus to AC and Dexterity saving throws|creature|",
			),
		).toThrow(/exactly 3 Cover rows/);
	});

	it("throws loudly on a malformed bonus cell (negative control)", () => {
		expect(() =>
			parseCoverTable(
				"|Degree|Benefit to Target|Offered By|\n|---|---|---|\n" +
					"|Half|some cover, ok?|creature|\n" +
					"|Three Quarters|+5 bonus to AC and Dexterity saving throws|object|\n" +
					"|Total|Can't be targeted directly|object|",
			),
		).toThrow(/does not match the expected/);
	});

	it("throws loudly on a Total row missing the untargetable text (negative control)", () => {
		expect(() =>
			parseCoverTable(
				"|Degree|Benefit to Target|Offered By|\n|---|---|---|\n" +
					"|Half|+2 bonus to AC and Dexterity saving throws|creature|\n" +
					"|Three Quarters|+5 bonus to AC and Dexterity saving throws|object|\n" +
					"|Total|+100 bonus, why not|object|",
			),
		).toThrow(/not the expected untargetable text/);
	});
});

describe("world-authoring ids (maxim-audit F1)", () => {
	it("Half and Three-Quarters carry distinct condition/modifier id stems (no accidental collision)", () => {
		expect(COVER_HALF_LOCAL_ID).not.toBe(COVER_THREE_QUARTERS_LOCAL_ID);
		expect(COVER_HALF_MODIFIER_LOCAL_ID).not.toBe(COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID);
	});

	it("each condition's own modifier id is namespaced under that SAME condition's id (at-most-one-modifier-per-condition, by construction)", () => {
		// `spellkave_define_condition`'s own `modifier_template_id` field is a
		// SINGLE string (never an array — authoring-verbs.ts's own
		// `DEFINE_CONDITION_PARAMS`), so a condition row can name at most one
		// modifier by construction; this pins that EACH of the two shipped
		// modifier ids is a sub-path of its OWN condition's id (never the
		// other's), i.e. no modifier is shared/reused across the two conditions.
		expect(COVER_HALF_MODIFIER_LOCAL_ID.startsWith(`${COVER_HALF_LOCAL_ID}/`)).toBe(true);
		expect(
			COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID.startsWith(`${COVER_THREE_QUARTERS_LOCAL_ID}/`),
		).toBe(true);
	});
});
