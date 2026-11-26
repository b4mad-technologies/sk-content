import { fileURLToPath } from "node:url";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { advancementMetadataGapsByClass } from "../../chapters/classes/advancement-metadata-units";
import { dmGrantCatalog } from "../../chapters/classes/dm-act-catalog";

const target = createLocalAuthorTarget(
	fileURLToPath(new URL("../../../fixtures", import.meta.url)),
);

describe("authored DM grant catalogue", () => {
	it("declares all class/level tags, grants only backed metadata and keeps gaps", () => {
		const catalogue = dmGrantCatalog(target);
		expect(catalogue.tags.filter((row) => row.prefix === "srd.advancement")).toHaveLength(240);
		expect(catalogue.grants).toContainEqual({
			tag: "srd.advancement.fighter.2",
			capability_id: "srd/class-feature/fighter/action-surge",
			bundle_id: "srd",
		});
		for (const grant of catalogue.grants)
			expect(target.resolveRef("capability_definitions", grant.capability_id)).toBe(true);
		expect(advancementMetadataGapsByClass().size).toBeGreaterThan(0);
	});
	it("every pickable capability has exactly one tag-backed grant", () => {
		const catalogue = dmGrantCatalog(target);
		for (const ids of Object.values(catalogue.pickable))
			for (const id of ids) {
				const tag = `srd.feature.${id.replaceAll("/", ".")}`;
				expect(catalogue.tags.filter((row) => row.tag === tag)).toHaveLength(1);
				expect(catalogue.grants.filter((row) => row.tag === tag)).toEqual([
					{ tag, capability_id: id, bundle_id: "srd" },
				]);
			}
		expect(catalogue.pickable.skill).toContain("srd/skill/perception");
		expect(catalogue.pickable["origin-feat"]).toContain("srd/feat/alert");
	});
});
// DOC-PROMISE: scripted-dm-acts#class-progression-and-selected-training
