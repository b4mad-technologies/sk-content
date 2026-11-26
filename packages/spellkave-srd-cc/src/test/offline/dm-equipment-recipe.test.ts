import path from "node:path";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { equipmentRecipe } from "../../../../spellkave-adventure-runtime/src/dm/creation/equipment-plan.ts";

const target = createLocalAuthorTarget(path.resolve(import.meta.dirname, "../../../fixtures"));
describe("authored atomic equipment recipe", () => {
	it("preserves source pack nesting and currency stack quantities", () => {
		const recipe = equipmentRecipe("fighter", "A", target);
		const pack = recipe.findIndex((row) => row.definitionId === "srd/item/dungeoneers-pack");
		expect(pack).toBeGreaterThanOrEqual(0);
		expect(recipe.filter((row) => row.parentIndex === pack).length).toBeGreaterThan(0);
		expect(
			recipe
				.filter((row) => row.parentIndex !== undefined)
				.every((row) => row.parentIndex! < recipe.indexOf(row)),
		).toBe(true);
		const gold = recipe.find((row) => row.definitionId === "srd/item/gold-piece");
		expect(gold?.count).toBe(4);
		const weapons = recipe.filter((row) => row.slotId === "srd/slot/main-hand");
		expect(weapons).toHaveLength(1);
	});
});
