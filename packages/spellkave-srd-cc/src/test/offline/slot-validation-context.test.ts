import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import { equipmentSlotDefinitionRows } from "../../chapters/equipment/slot-definition-rows";
import { driveUnitFragment, driveUnitScene, metadataCall } from "../../chapters/verb-runner";

describe("isolated equipment-slot validation context", () => {
	const call = {
		toolName: "spellkave_write_rows",
		label: "slot-context-probe",
		params: {
			bundle: "srd",
			kind: "affordance_templates",
			rows: [
				{
					template_id: "srd/test/slot-context",
					bundle_id: "srd",
					capability_id: "srd/action/attack",
					niche_id: "srd/niche/attack-verb",
					display_name: "Slot context probe",
					outcome_template_id: "",
					predicate_source: "actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon')",
				},
			],
		},
	};
	it("validates without a prior target and strips context from fragment and scene", async () => {
		for (const output of [
			await driveUnitFragment("srd", call),
			await driveUnitScene("srd", [call]),
		]) {
			expect(output).toContain("srd/test/slot-context");
			expect(output).not.toContain("[[equipment_slot_definitions]]");
		}
	});
	it("preserves authored metadata prose before applying legacy row filters", async () => {
		const body = [
			"A literal TOML example follows.",
			"",
			"",
			"[[bundles.tag_prefixes]]",
			'prefix = "example"',
			"",
			"[[equipment_slot_definitions]]",
			'example = "still prose"',
		].join("\n");
		const output = await driveUnitScene(
			"srd",
			[
				metadataCall("metadata-prose", "srd", [
					{ target: "manifest", key: "docs", value: { probe: { body } } },
				]),
				call,
			],
			undefined,
			{ retainMetadata: true },
		);
		expect(parse(output).metadata).toEqual({ docs: { probe: { body } } });
		expect(output).toContain("srd/test/slot-context");
	});
	it("retains the catalog exactly once in its owning fragment", async () => {
		const output = await driveUnitFragment("srd", {
			toolName: "spellkave_write_rows",
			label: "slot-catalog",
			params: {
				bundle: "srd",
				kind: "equipment_slot_definitions",
				rows: equipmentSlotDefinitionRows(),
			},
		});
		expect(output.match(/\[\[equipment_slot_definitions\]\]/g)).toHaveLength(3);
	});
	it("still rejects a misspelled slot without a prior target", async () => {
		const invalid = structuredClone(call);
		const row = invalid.params.rows[0];
		if (!row) throw new Error("Missing probe row");
		row.predicate_source = "actor.equipped_item('srd/slot/typo').has_tag('srd.weapon')";
		await expect(driveUnitFragment("srd", invalid)).rejects.toMatchObject({
			errorCode: "MF-VAL-363",
		});
	});
	it.each([
		"srd/slot/probe",
		"srd/slot/main-hand",
		'srd/slot/quote"x',
		"srd/slot/slash\\x",
	])("exports only the authored slot %s, not validation-only catalog rows", async (slotId) => {
		const authored = {
			toolName: "spellkave_write_rows",
			label: "owned-slot",
			params: {
				bundle: "srd",
				kind: "equipment_slot_definitions",
				rows: [
					{
						slot_id: slotId,
						bundle_id: "srd",
						label: "Authored slot",
						default_compatibility_predicate: "true",
					},
				],
			},
		};
		for (const output of [
			await driveUnitFragment("srd", authored),
			await driveUnitScene("srd", [authored]),
		]) {
			expect(parse(output).equipment_slot_definitions).toEqual(authored.params.rows);
		}
	});
});
