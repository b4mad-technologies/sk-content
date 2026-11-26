import { describe, expect, it } from "vitest";
import {
	CALLIGRAPHERS_SUPPLIES_ENTITY_ID,
	GAMING_SET_DICE_ENTITY_ID,
} from "../../../chapters/equipment/tools-units";
import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	LOCK_PICKING_CHECK_CAPABILITY_ID,
	LOCK_TARGET_NICHE_TAG,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
} from "../../../chapters/playing-the-game/equipment-proficiencies-units";
import { buildTools, type QueryDetailResult, query } from "./harness";

describe("fixtures/ Thieves' Tools vertical slice", () => {
	it("keeps the generated tool identity separate from proficiency capability", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "entity_definitions",
			id: "srd/tool/thieves-tools",
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.entity_def_id).toBe("srd/tool/thieves-tools");
		expect(String(row.description).length).toBeGreaterThan(0);
	});

	it("emits a separately tagged proficiency capability and a concrete lock-picking action", async () => {
		const tools = buildTools();
		const proficiency = (await query(tools, {
			kind: "capability_definitions",
			id: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(proficiency.found).toBe(true);
		const proficiencyDescription = String((proficiency.row as Record<string, unknown>).description);
		expect(proficiencyDescription.length).toBeGreaterThan(0);
		expect(proficiencyDescription).not.toContain("cache/markdown");
		expect(proficiencyDescription).not.toContain("pk=");

		const action = (await query(tools, {
			kind: "action_definitions",
			id: LOCK_PICKING_CHECK_CAPABILITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(action.found).toBe(true);
		const actionRow = action.row as Record<string, unknown>;
		expect(actionRow.required_capability).toBe(LOCK_PICKING_CHECK_CAPABILITY_ID);

		const affordance = (await query(tools, {
			kind: "affordance_templates",
			id: `${LOCK_PICKING_CHECK_CAPABILITY_ID}/affordance`,
			refs: "none",
		})) as QueryDetailResult;
		expect(affordance.found).toBe(true);
		const affordanceRow = affordance.row as Record<string, unknown>;
		expect(affordanceRow.niche_id).toBe(LOCK_TARGET_NICHE_TAG);
		expect(String(affordanceRow.predicate_source)).toContain("macro('srd/proficiency_bonus'");
		expect(
			String(affordanceRow.predicate_source).match(/macro\('srd\/proficiency_bonus'/g),
		).toHaveLength(1);
		expect(String(affordanceRow.predicate_source)).toContain(">= 15");
	});
});

describe("fixtures/ O1 net-new tool instances (Calligrapher's Supplies, Gaming Set Dice)", () => {
	it("emits Calligrapher's Supplies tool identity, cleaned of the raw JSON's redundant cost suffix, plus its own proficiency capability", async () => {
		const tools = buildTools();
		const entity = (await query(tools, {
			kind: "entity_definitions",
			id: CALLIGRAPHERS_SUPPLIES_ENTITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(entity.found).toBe(true);
		const row = entity.row as Record<string, unknown>;
		expect(row.entity_def_id).toBe(CALLIGRAPHERS_SUPPLIES_ENTITY_ID);
		expect(row.display_name).toBe("Calligrapher's Supplies");
		expect(String(row.description).length).toBeGreaterThan(0);

		const proficiency = (await query(tools, {
			kind: "capability_definitions",
			id: CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(proficiency.found).toBe(true);
		const calligraphyDescription = String((proficiency.row as Record<string, unknown>).description);
		expect(calligraphyDescription.length).toBeGreaterThan(0);
		expect(calligraphyDescription.toLowerCase()).toContain("calligrapher");
		expect(calligraphyDescription).not.toContain("pk=");
	});

	it("emits Gaming Set (Dice) tool identity plus its own proficiency capability, marked as the concrete authorial pick", async () => {
		const tools = buildTools();
		const entity = (await query(tools, {
			kind: "entity_definitions",
			id: GAMING_SET_DICE_ENTITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(entity.found).toBe(true);
		const row = entity.row as Record<string, unknown>;
		expect(row.entity_def_id).toBe(GAMING_SET_DICE_ENTITY_ID);
		expect(row.display_name).toBe("Gaming Set, Dice");
		expect(String(row.description).length).toBeGreaterThan(0);

		const proficiency = (await query(tools, {
			kind: "capability_definitions",
			id: GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(proficiency.found).toBe(true);
		const diceDescription = String((proficiency.row as Record<string, unknown>).description);
		expect(diceDescription.length).toBeGreaterThan(0);
		expect(diceDescription.toLowerCase()).toMatch(/dice|gaming/);
		expect(diceDescription).not.toContain("pk=");
	});
});
