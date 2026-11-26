import path from "node:path";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { BUNDLE_ROW } from "../../bundle-row.ts";
import { choiceToolUnits } from "../../chapters/equipment/choice-tools.ts";
import { CALLIGRAPHERS_SUPPLIES_ENTITY_ID } from "../../chapters/equipment/tools-units.ts";
import { CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID } from "../../chapters/playing-the-game/equipment-proficiencies-units.ts";

describe("starting equipment tool choices", () => {
	it("declares the exact menu tag family in the shared bundle header", () => {
		expect(BUNDLE_ROW.tag_prefixes).toContainEqual({
			prefix: "srd.tool.category",
			target_kind: "tag_value_definitions",
			natural_key_field: "tag",
		});
	});
	it("renders every admitted choice once with its menu membership", () => {
		const target = createLocalAuthorTarget(path.resolve(import.meta.dirname, "../../../fixtures"));
		const definitions = target.lookup("entity_definitions", { bundle: "srd" });
		const tags = target.lookup("entity_definition_tag", { bundle: "srd" });
		for (const unit of choiceToolUnits()) {
			const matches = definitions.filter((row) => row.entity_def_id === unit.entityId);
			expect(matches, unit.entityId).toHaveLength(1);
			expect(matches[0]?.display_name).toBe(unit.name);
			expect(
				tags.some(
					(row) =>
						row.entity_def_id === unit.entityId &&
						row.tag === `srd.tool.category.${unit.choiceCategory}`,
				),
				unit.entityId,
			).toBe(true);
		}
	});

	it("admits the complete source lists without admitting unrelated tools", () => {
		// equipment.md:622-720: seventeen Artisan's Tools; :749: ten instruments.
		const units = choiceToolUnits();
		expect(units.filter((unit) => unit.choiceCategory === "artisan")).toHaveLength(17);
		expect(units.filter((unit) => unit.choiceCategory === "instrument")).toHaveLength(10);
		expect(units.map((unit) => unit.name)).toContain("Musical Instrument, Viol");
		expect(units.map((unit) => unit.name)).toContain("Woodcarver's Tools");
		expect(units.some((unit) => unit.name === "Thieves' Tools")).toBe(false);
		expect(new Set(units.map((unit) => unit.entityId)).size).toBe(units.length);
	});

	it("reuses existing physical and proficiency identities instead of duplicating them", () => {
		const calligraphy = choiceToolUnits().find(
			(unit) => unit.pk === "srd-2024_calligraphers-supplies",
		);
		expect(calligraphy).toMatchObject({
			name: "Calligrapher's Supplies",
			entityId: CALLIGRAPHERS_SUPPLIES_ENTITY_ID,
			proficiencyCapabilityId: CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
			choiceCategory: "artisan",
		});
	});
});
