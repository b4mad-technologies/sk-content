import { describe, expect, it } from "vitest";
import { advancementAct, featureTag, setStateAct, trainAct } from "./dm-act-plan.ts";

describe("authored DM act plans", () => {
	it("uses a clear act for zero and a quantity-bound set act for positive values", () => {
		expect(setStateAct("entity:42", "srd/hp", 0)).toEqual({
			targetId: "entity:42",
			actionId: "srd/dm/clear/srd.hp",
			args: {},
		});
		expect(setStateAct("entity:42", "srd/hp", 12)).toEqual({
			targetId: "entity:42",
			actionId: "srd/dm/set/srd.hp",
			args: { quantity: 12 },
		});
	});
	it("selects the authored feature and class-level identity tags", () => {
		expect(featureTag("srd/skill/athletics")).toBe("srd.feature.srd.skill.athletics");
		expect(trainAct("entity:42", "skill", "srd/skill/athletics").args).toEqual({
			definition_ref: "srd.feature.srd.skill.athletics",
		});
		expect(advancementAct("entity:42", "fighter", 2)).toEqual({
			targetId: "entity:42",
			actionId: "srd/dm/advance/fighter",
			args: { definition_ref: "srd.advancement.fighter.2" },
		});
	});
	it("refuses values the existing quantity wire cannot represent", () => {
		for (const value of [-1, 1.5, Number.NaN, 4294967296])
			expect(() => setStateAct("entity:42", "srd/hp", value)).toThrow();
	});
});
