// Area hazards (sk-jay0.3.19.6 slice 2): source, mechanic and fixture
// evidence for the two shipped hazard verbs. The live axis is declared in
// src/test/live-self-seeding/mechanics/area-hazards.test.ts.
// pattern: lingering-hazard-zone
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
	AREA_HAZARDS_PATH,
	type AreaHazardUnit,
	areaHazardUnits,
	HAZARD_MARKER_TICKS,
	HAZARD_PULSE_ROUNDS,
	hazardFailedSavePredicate,
	hazardOfferPredicate,
	hazardPresentConditionId,
	hazardPresentFrameWrite,
	hazardPulseBody,
	hazardPulseFrameWrites,
	hazardScheduleParams,
	hazardStruckConditionId,
	SPEED_ZERO_CONDITION_ID,
	UTILIZE_CAPABILITY_ID,
} from "../../chapters/equipment/area-hazards";
import { buildCreatureCapabilityGrantRows } from "../../chapters/playing-the-game/creature-identity-units";
import { abilityModifierBodyFor } from "../../chapters/playing-the-game/modifier-units";
import { srdEvidence } from "../srd-coverage/evidence";

const CHAPTER = "equipment";
const REFERENCES = ["docs/equipment-catalogue.md", "sk-jay0.3.19.6"];

const rendered = readFileSync(
	new URL(`../../../fixtures/${AREA_HAZARDS_PATH}`, import.meta.url),
	"utf8",
);

function unitFor(slug: string): AreaHazardUnit {
	const unit = areaHazardUnits().find((row) => row.slug === slug);
	if (unit === undefined) throw new Error(`no area hazard '${slug}'`);
	return unit;
}

/** TOML block of one consequence template's frame writes, in ordinal order. */
function consequenceBlock(templateId: string): string {
	const blocks = rendered
		.split("[[consequence_frame_writes]]")
		.slice(1)
		.map((block) => block.split("\n[[consequence_templates]]")[0] ?? "");
	return blocks.filter((block) => block.includes(`template_id = "${templateId}"`)).join("\n");
}

const EXPECTED: ReadonlyArray<{
	slug: string;
	unit: string;
	actionId: string;
	areaFeet: number;
	rangeFeet: number;
	saveDc: number;
}> = [
	{
		slug: "ball-bearings",
		unit: "hazard-ball-bearings",
		actionId: "srd/item/ball-bearings/spill",
		areaFeet: 10,
		rangeFeet: 10,
		saveDc: 10,
	},
	{
		slug: "caltrops",
		unit: "hazard-caltrops",
		actionId: "srd/item/caltrops/spread",
		areaFeet: 5,
		rangeFeet: 5,
		saveDc: 15,
	},
];

describe("Area hazards", () => {
	it("ships exactly Ball Bearings and Caltrops; Hunting Trap and a doused Oil space stay declared (BL-83)", () => {
		expect(areaHazardUnits().map((unit) => unit.itemId)).toEqual([
			"srd/item/ball-bearings",
			"srd/item/caltrops",
		]);
		expect(rendered).not.toContain("srd/item/hunting-trap");
		expect(rendered).not.toContain("srd/item/oil");
	});

	it("every creature holds srd/action/utilize, so the hazard verbs are disclosed", () => {
		expect(buildCreatureCapabilityGrantRows()).toContainEqual({
			tag: "srd.creature",
			capability_id: UTILIZE_CAPABILITY_ID,
			bundle_id: "srd",
		});
	});

	it("Speed 0 sets the walking Speed axis to 0 and ends at the holder's next turn start", () => {
		expect(rendered).toContain(`condition_definition_id = "${SPEED_ZERO_CONDITION_ID}"`);
		expect(rendered).toMatch(
			/applies_to = "srd\/speed-walk"\nbundle_id = "srd"\ndelta_kind = "FlatSet"/,
		);
		const caltropsBody = JSON.stringify(hazardPulseBody(unitFor("caltrops")));
		expect(caltropsBody).toContain(
			'"expires_at_boundary":{"boundary_id":"turn_start","owner_actor":"Actor"}',
		);
	});

	for (const expected of EXPECTED) {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "source",
				claim: `the cached SRD text makes ${expected.slug} a Utilize action covering a ${expected.areaFeet}-foot square within ${expected.rangeFeet} feet, with a DC ${expected.saveDc} Dexterity save for a creature that enters`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(unit.actionId).toBe(expected.actionId);
				expect(unit.areaFeet).toBe(expected.areaFeet);
				expect(unit.rangeFeet).toBe(expected.rangeFeet);
				expect(unit.saveDc).toBe(expected.saveDc);
				expect(unit.effect).toEqual(
					expected.slug === "caltrops"
						? { kind: "damage-and-speed-zero", damage: "1", damageType: "piercing" }
						: { kind: "prone" },
				);
			},
		);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "mechanic",
				claim: `using ${expected.slug} is offered to a carrier only, and schedules a bounded subject-bound pulse whose occupants make a DC ${expected.saveDc} Dexterity save`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(hazardOfferPredicate(unit)).toBe(`actor.has_item('${unit.itemId}')`);
				const dexMod = abilityModifierBodyFor("actor.effective('srd/dex')");
				expect(hazardFailedSavePredicate(unit)).toBe(
					"actor.has_tag('srd.creature') && " +
						`actor.status('srd/condition/hazard/${expected.slug}/present') == false && ` +
						`actor.status('srd/condition/hazard/${expected.slug}/struck') == false && ` +
						`d20 + ${dexMod} < ${expected.saveDc}`,
				);
				expect(hazardFailedSavePredicate(unit)).not.toContain("macro(");
				const params = hazardScheduleParams(unit);
				expect(params.repeats_remaining).toBe(HAZARD_PULSE_ROUNDS);
				expect(params.frequency_ms).toBe(6000);
				expect(params.requires_subject_alive).toBe(false);
				expect(String(params.source)).toContain("{Actor}/{tick}");
				const struck = {
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "Actor",
						condition_definition_id: hazardStruckConditionId(unit),
						expires_at_boundary: { boundary_id: "turn_start", owner_actor: "Actor" },
					},
				};
				expect(hazardPulseBody(unit).at(-1)).toEqual(struck);
				expect(hazardPresentFrameWrite(unit)).toEqual({
					ForEachActorInRadius: {
						center_ref: "TargetSpatialRef",
						shape_id: "core/area/node_ball",
						shape_params_json: '{"ball_radius":0}',
						predicate_source: "actor.has_tag('srd.creature')",
						body: [
							{
								ApplyStatus: {
									target_kind: "entity",
									target_ref: "Actor",
									condition_definition_id: hazardPresentConditionId(unit),
									expires_at_boundary: { boundary_id: "turn_start", owner_actor: "Actor" },
								},
							},
						],
					},
				});
				// The 0-HP carriers follow the hazard carrier.
				const carriers = JSON.stringify(hazardPulseFrameWrites(unit).slice(1));
				expect(carriers).toContain("srd/condition/dead");
				expect(carriers).toContain("srd/condition/unconscious");
				expect(carriers).not.toContain("macro(");
				const body = JSON.stringify(hazardPulseBody(unit));
				if (expected.slug === "caltrops") {
					expect(body).toContain('"resource":"srd/hp"');
					for (const ladder of ["damage_immune", "damage_resist", "damage_vulnerable"]) {
						expect(body).toContain(`actor.has_tag('${ladder}:piercing')`);
					}
					expect(body).toContain(SPEED_ZERO_CONDITION_ID);
				} else {
					expect(body).toBe(
						JSON.stringify([
							{
								ApplyStatus: {
									target_kind: "entity",
									target_ref: "Actor",
									condition_definition_id: "srd/condition/prone",
								},
							},
							struck,
						]),
					);
				}
			},
		);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "fixture",
				claim: `the rendered bundle carries the self-only ${expected.slug} Utilize verb, which removes one item, marks the node and schedules the pulse there`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(rendered).toContain(`action_id = "${unit.actionId}"`);
				expect(rendered).toContain(`template_id = "${unit.actionId}/affordance"`);
				expect(rendered).toContain(`effect_def_id = "${unit.actionId}/schedule"`);
				expect(rendered).toContain(`effect_refs_csv = "${unit.actionId}/schedule"`);
				const spend = consequenceBlock(`${unit.actionId}/success`);
				expect(spend).toContain("[consequence_frame_writes.frame_write.RemoveItem]");
				expect(spend).toContain(`actor_ref = "Actor"\nitem_def_id = "${unit.itemId}"`);
				expect(spend).toContain(`"state_id":"srd/hazard/${unit.slug}"`);
				expect(spend).toContain(`expires_after_ticks = ${HAZARD_MARKER_TICKS}`);
				expect(spend).toContain(`condition_definition_id = "${hazardPresentConditionId(unit)}"`);
				expect(rendered).toContain(`freshness_rule = "expires_after_ticks:${HAZARD_MARKER_TICKS}"`);
				const pulse = consequenceBlock(`${unit.actionId}/pulse`);
				expect(pulse).toContain('center_ref = "TargetSpatialRef"');
				expect(pulse).toContain(`< ${expected.saveDc}`);
				expect(pulse).toContain(`condition_definition_id = "${hazardStruckConditionId(unit)}"`);
				expect(pulse).toContain('condition_definition_id = "srd/condition/unconscious"');
				expect(pulse).toContain('condition_definition_id = "srd/condition/dead"');
			},
		);
	}
});
