import { describe, expect, it } from "vitest";

import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	LOCK_ITEM_PK,
	LOCK_PICKING_CHECK_CAPABILITY_ID,
	LOCK_TARGET_NICHE_TAG,
	lockPickingRuleUnit,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
	toolCheckExpr,
} from "../../chapters/playing-the-game/equipment-proficiencies-units";

describe("toolCheckExpr", () => {
	const rule = lockPickingRuleUnit();
	const expression = toolCheckExpr({
		scoreExpr: `actor.stat('srd/${rule.abilityCode}')`,
		toolCapabilityId: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
		relevantSkillCapabilityId: rule.skillCapabilityId,
		proficiencyLevelExpr: "actor.stat('srd/level')",
		dc: rule.dc,
	});

	it("parses the Lock item's sourced DC, ability, skill, and target niche", () => {
		expect(rule).toEqual({
			sourcePk: LOCK_ITEM_PK,
			dc: 15,
			abilityCode: "dex",
			skillCapabilityId: "srd/skill/sleight-of-hand",
			targetNicheTag: LOCK_TARGET_NICHE_TAG,
		});
	});

	it("uses the existing proficiency macro exactly once for Tool OR relevant Skill", () => {
		expect(expression).toContain(
			`actor.has_capability('${THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID}') || ` +
				`actor.has_capability('${rule.skillCapabilityId}')`,
		);
		expect(expression.match(/macro\('srd\/proficiency_bonus'/g)).toHaveLength(1);
		expect(expression).toContain(">= 15");
	});

	it("does not fake check-local Advantage or add a second proficiency term", () => {
		expect(expression).not.toContain("roll_table(");
		expect(expression).not.toContain("max(d20");
		expect(expression.match(/has_capability/g)).toHaveLength(2);
	});

	it("keeps the concrete capability ids stable", () => {
		expect(LOCK_PICKING_CHECK_CAPABILITY_ID).toBe("srd/check/lock-picking");
		expect(THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID).toBe("srd/proficiency/tool/thieves-tools");
	});
});

describe("O1 net-new tool-proficiency capability ids (Character Origins Backgrounds)", () => {
	it("keeps the concrete capability ids stable", () => {
		expect(CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID).toBe(
			"srd/proficiency/tool/calligraphers-supplies",
		);
		expect(GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID).toBe("srd/proficiency/tool/gaming-set-dice");
	});
});
