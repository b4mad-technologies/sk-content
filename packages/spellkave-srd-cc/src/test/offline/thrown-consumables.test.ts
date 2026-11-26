// Thrown consumables (sk-jay0.3.19.6 slice 1): source, mechanic and fixture
// evidence for the three shipped throw verbs. The live axis is declared in
// src/test/live-self-seeding/mechanics/thrown-consumables.test.ts.
// pattern: offer-vs-resolution-roll
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
	THROWN_CONSUMABLES_PATH,
	type ThrownConsumableUnit,
	throwDamageDeltaExpr,
	thrownConsumableUnits,
	throwOfferPredicate,
	throwResolutionExpr,
} from "../../chapters/equipment/thrown-consumables";
import { srdEvidence } from "../srd-coverage/evidence";

const CHAPTER = "equipment";
const REFERENCES = ["docs/equipment-catalogue.md", "sk-jay0.3.19.6"];

const rendered = readFileSync(
	new URL(`../../../fixtures/${THROWN_CONSUMABLES_PATH}`, import.meta.url),
	"utf8",
);

function unitFor(slug: string): ThrownConsumableUnit {
	const unit = thrownConsumableUnits().find((row) => row.slug === slug);
	if (unit === undefined) throw new Error(`no thrown consumable '${slug}'`);
	return unit;
}

/** TOML block of one consequence template's frame writes, in ordinal order. */
function consequenceBlock(templateId: string): string {
	const blocks = rendered
		.split("[[consequence_frame_writes]]")
		.slice(1)
		.map((block) => block.split("\n[[")[0] ?? "");
	return blocks.filter((block) => block.includes(`template_id = "${templateId}"`)).join("\n");
}

const EXPECTED: ReadonlyArray<{
	slug: string;
	unit: string;
	rangeFeet: number;
	dice: string;
	damageType: string;
	targetNoun: string;
	onlyCreatureTypes: readonly string[];
}> = [
	{
		slug: "acid",
		unit: "thrown-acid",
		rangeFeet: 20,
		dice: "2d6",
		damageType: "acid",
		targetNoun: "creature or object",
		onlyCreatureTypes: [],
	},
	{
		slug: "alchemists-fire",
		unit: "thrown-alchemists-fire",
		rangeFeet: 20,
		dice: "1d4",
		damageType: "fire",
		targetNoun: "creature or object",
		onlyCreatureTypes: [],
	},
	{
		slug: "holy-water",
		unit: "thrown-holy-water",
		rangeFeet: 20,
		dice: "2d8",
		damageType: "radiant",
		targetNoun: "creature",
		onlyCreatureTypes: ["fiend", "undead"],
	},
];

describe("Thrown consumables", () => {
	it("ships exactly Acid, Alchemist's Fire and Holy Water; Oil stays declared (BL-82)", () => {
		expect(thrownConsumableUnits().map((unit) => unit.itemId)).toEqual([
			"srd/item/acid",
			"srd/item/alchemists-fire",
			"srd/item/holy-water",
		]);
		expect(rendered).not.toContain("srd/item/oil");
	});

	it("without roll bias, the thrower-side resolution has exactly the odds of the target's own Dexterity save", () => {
		// Target saves when r + mod >= dc (r = its d20). The shipped form lands
		// the flask when u + dc - mod >= 22 (u = the resolution's d20).
		for (let dc = 1; dc <= 35; dc += 1) {
			for (let mod = -5; mod <= 12; mod += 1) {
				let targetFails = 0;
				let flaskLands = 0;
				for (let face = 1; face <= 20; face += 1) {
					if (face + mod < dc) targetFails += 1;
					if (face + dc - mod >= 22) flaskLands += 1;
				}
				expect(flaskLands, `dc ${dc} mod ${mod}`).toBe(targetFails);
			}
		}
	});

	for (const expected of EXPECTED) {
		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "source",
				claim: `the cached SRD text gives ${expected.slug} a ${expected.rangeFeet}-foot throw, a Dexterity save against 8 + Dex modifier + Proficiency Bonus, and ${expected.dice} ${expected.damageType} damage`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(unit.rangeFeet).toBe(expected.rangeFeet);
				expect(unit.dice).toBe(expected.dice);
				expect(unit.damageType).toBe(expected.damageType);
				expect(unit.targetNoun).toBe(expected.targetNoun);
				expect(unit.onlyCreatureTypes).toEqual(expected.onlyCreatureTypes);
			},
		);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "mechanic",
				claim: `throwing ${expected.slug} is offered only to a carrier, at a creature within range, resolves the target's Dexterity save against the thrower's DC, and routes ${expected.damageType} damage through the defence ladder`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(throwOfferPredicate(unit)).toBe(
					`actor.has_item('${unit.itemId}') && target.has_tag('srd.creature') && target.stat('core/distance_to_actor_mm') <= 6096`,
				);
				expect(throwOfferPredicate(unit)).not.toContain("d20");
				expect(throwResolutionExpr()).toBe(
					"let throw_roll = d20; throw_roll + (8 + macro('srd/dexterity_modifier') + " +
						"actor.stat('srd/proficiency_bonus')) - macro('srd/ability_modifier', target.effective('srd/dex')) >= 22",
				);
				const delta = throwDamageDeltaExpr(unit);
				expect(delta).toContain(`max(0, ${expected.dice})`);
				for (const ladder of ["damage_immune", "damage_resist", "damage_vulnerable"]) {
					expect(delta).toContain(`target.has_tag('${ladder}:${expected.damageType}')`);
				}
				for (const type of expected.onlyCreatureTypes) {
					expect(delta).toContain(`target.has_tag('srd.creature_type.${type}')`);
				}
				if (expected.onlyCreatureTypes.length === 0) expect(delta).not.toContain("creature_type");
			},
		);

		srdEvidence(
			{
				chapter: CHAPTER,
				unit: expected.unit,
				aspect: "fixture",
				claim: `the rendered bundle carries the ${expected.slug} throw verb on the attack niche, and both its branches remove one ${expected.slug} from the thrower`,
				references: REFERENCES,
			},
			() => {
				const unit = unitFor(expected.slug);
				expect(rendered).toContain(`action_id = "${unit.actionId}"`);
				expect(rendered).toContain(`on_failure = "${unit.actionId}/dodged"`);
				expect(rendered).toContain(`template_id = "${unit.actionId}/affordance"`);
				const removeOne = `actor_ref = "Actor"\nitem_def_id = "${unit.itemId}"`;
				for (const branch of ["success", "dodged"]) {
					const block = consequenceBlock(`${unit.actionId}/${branch}`);
					expect(block, branch).toContain("[consequence_frame_writes.frame_write.RemoveItem]");
					expect(block, branch).toContain(removeOne);
				}
				expect(consequenceBlock(`${unit.actionId}/success`)).toContain('resource = "srd/hp"');
				expect(consequenceBlock(`${unit.actionId}/dodged`)).not.toContain("ModifyResource");
			},
		);
	}
});
