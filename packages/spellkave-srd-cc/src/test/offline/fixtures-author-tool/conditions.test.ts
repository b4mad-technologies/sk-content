// Incapacitated + Dead + Prone read through the author-facing query tool.
import { describe, expect, it } from "vitest";

import {
	BONUS_CHANNEL_ID,
	PRIMARY_CHANNEL_ID,
	REACTION_CHANNEL_ID,
} from "../../../chapters/playing-the-game/action-economy-units";
import {
	DEAD_CONDITION_ID,
	INCAPACITATED_CONDITION_ID,
	INCAPACITATED_NO_ACTION_CONDITION_ID,
	INCAPACITATED_NO_ACTION_MODIFIER_ID,
	INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
	INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID,
	INCAPACITATED_NO_REACTION_CONDITION_ID,
	INCAPACITATED_NO_REACTION_MODIFIER_ID,
	PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID,
	PRONE_CONDITION_ID,
} from "../../../chapters/playing-the-game/fragments/conditions";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { ATTACK_ROLL_RESOLUTION_SCOPE_ID } from "../../../chapters/playing-the-game/resolution-scope-units";
import { buildTools, type QueryDetailResult, query } from "./harness";

describe("fixtures/ Incapacitated + Dead + Prone read through spellkave_query", () => {
	it("Incapacitated is an identity-only carrier referencing this bundle's OWN stacking/remove-policy vocabulary", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: INCAPACITATED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.gate_predicate_source).toBe("");
		expect(row.modifier_template_id).toBe("");
		expect(row.stacking_rule).toBe(`${BUNDLE_ID}/stacking/single`);
		expect(row.remove_time_policy).toBe(`${BUNDLE_ID}/remove_policy/independent_lifetime`);
	});

	it("Incapacitated implies its three channel-zeroing siblings (sk-dms.40.2)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: INCAPACITATED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.implies).toEqual([
			INCAPACITATED_NO_ACTION_CONDITION_ID,
			INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
			INCAPACITATED_NO_REACTION_CONDITION_ID,
		]);
	});

	it.each([
		{
			conditionId: INCAPACITATED_NO_ACTION_CONDITION_ID,
			modifierId: INCAPACITATED_NO_ACTION_MODIFIER_ID,
			channelId: PRIMARY_CHANNEL_ID,
		},
		{
			conditionId: INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
			modifierId: INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID,
			channelId: BONUS_CHANNEL_ID,
		},
		{
			conditionId: INCAPACITATED_NO_REACTION_CONDITION_ID,
			modifierId: INCAPACITATED_NO_REACTION_MODIFIER_ID,
			channelId: REACTION_CHANNEL_ID,
		},
	])("channel-zeroing sibling $conditionId carries a FlatSet(0) modifier on $channelId (sk-dms.40.2)", async ({
		conditionId,
		modifierId,
		channelId,
	}) => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: conditionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.observable).toBe(false);
		expect(row.implies).toEqual([]);
		expect(row.modifier_template_id).toBe(modifierId);
		expect(row.stacking_rule).toBe(`${BUNDLE_ID}/stacking/single`);
		expect(row.remove_time_policy).toBe(`${BUNDLE_ID}/remove_policy/independent_lifetime`);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: modifierId,
			refs: "none",
		})) as QueryDetailResult;
		expect(modifierDetail.found).toBe(true);
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(channelId);
		expect(modifierRow.delta_kind).toBe("FlatSet");
		expect(Number(String(modifierRow.modifier_expression_source).match(/\d+/)?.[0])).toBe(0);

		const targetDetail = (await query(tools, {
			kind: "modifier_target_definitions",
			id: channelId,
			refs: "none",
		})) as QueryDetailResult;
		expect(targetDetail.found).toBe(true);
		expect((targetDetail.row as Record<string, unknown>).shape).toBe("Numeric");
	});

	it("Dead implies Incapacitated (the ApplyStatus implies-cascade)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: DEAD_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.implies).toEqual([INCAPACITATED_CONDITION_ID]);
		expect(row.stacking_rule).toBe(`${BUNDLE_ID}/stacking/single`);
		expect(row.remove_time_policy).toBe(`${BUNDLE_ID}/remove_policy/independent_lifetime`);
	});

	it("Prone implies nothing (Monster Death carries no prone-on-death clause) and carries a real Disadvantage modifier on the srd/attack_roll axis (Prone Slice B)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: PRONE_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.gate_predicate_source).toBe("");
		expect(row.modifier_template_id).toBe(PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID);
		expect(row.stacking_rule).toBe(`${BUNDLE_ID}/stacking/single`);
		expect(row.remove_time_policy).toBe(`${BUNDLE_ID}/remove_policy/independent_lifetime`);
		expect(row.implies).toEqual([]);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(modifierDetail.found).toBe(true);
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(ATTACK_ROLL_RESOLUTION_SCOPE_ID);
		expect(modifierRow.delta_kind).toBe("Disadvantage");
	});
});
