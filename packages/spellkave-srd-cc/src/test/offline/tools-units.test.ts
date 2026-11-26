import { describe, expect, it } from "vitest";

import {
	CALLIGRAPHERS_SUPPLIES_ENTITY_ID,
	CALLIGRAPHERS_SUPPLIES_ITEM_PK,
	calligraphersSuppliesUnit,
	GAMING_SET_DICE_ENTITY_ID,
	GAMING_SET_DICE_ITEM_PK,
	gamingSetDiceUnit,
	THIEVES_TOOLS_ENTITY_ID,
	THIEVES_TOOLS_ITEM_PK,
	thievesToolsUnit,
} from "../../chapters/equipment/tools-units";

describe("thievesToolsUnit", () => {
	it("reads the cached tool identity and source PK", () => {
		const unit = thievesToolsUnit();
		expect(unit.entityId).toBe(THIEVES_TOOLS_ENTITY_ID);
		expect(unit.sourcePk).toBe(THIEVES_TOOLS_ITEM_PK);
		expect(unit.name).toBe("Thieves' Tools");
		expect(unit.category).toBe("tools");
		expect(unit.cost).toBe("25.00");
		expect(unit.weight).toBe("1.000");
		expect(unit.description).toContain("Ability: Dexterity");
	});
});

describe("calligraphersSuppliesUnit (O1 net-new tool instance: Acolyte + Sage)", () => {
	it("reads the cached tool identity and source PK, stripping the redundant cost suffix from the raw JSON name", () => {
		const unit = calligraphersSuppliesUnit();
		expect(unit.entityId).toBe(CALLIGRAPHERS_SUPPLIES_ENTITY_ID);
		expect(unit.sourcePk).toBe(CALLIGRAPHERS_SUPPLIES_ITEM_PK);
		expect(unit.name).toBe("Calligrapher's Supplies");
		expect(unit.category).toBe("tools");
		expect(unit.cost).toBe("10.00");
	});
});

describe("gamingSetDiceUnit (O1 net-new tool instance: Soldier's concrete authorial pick)", () => {
	it("reads the cached tool identity and source PK", () => {
		const unit = gamingSetDiceUnit();
		expect(unit.entityId).toBe(GAMING_SET_DICE_ENTITY_ID);
		expect(unit.sourcePk).toBe(GAMING_SET_DICE_ITEM_PK);
		expect(unit.name).toBe("Gaming Set, Dice");
		expect(unit.category).toBe("tools");
		expect(unit.cost).toBe("0.10");
	});
});
