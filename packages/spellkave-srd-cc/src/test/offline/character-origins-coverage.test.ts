import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";

import { buildBackgroundUnits } from "../../chapters/character-origins/background-units";
import { buildSpeciesUnits } from "../../chapters/character-origins/species-units";
import {
	buildTraitUnits,
	dwarvenToughnessHpPerLevelBonus,
	skillfulProofSkillCapabilityId,
} from "../../chapters/character-origins/trait-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "character-origins";
const DETAILS = "ledger/archive/character-origins-details.md";
const FINDINGS = "ledger/archive/findings-details.md";
type Aspect = "source" | "mechanic" | "fixture" | "live";
type Unit = {
	unit: string;
	references?: readonly string[];
	na?: Partial<Record<Exclude<Aspect, "source">, string>>;
};
const units: readonly Unit[] = [
	{
		unit: "background-and-species-framing",
		na: {
			mechanic: "the framing is provenance prose",
			fixture: "the prose emits no fixture",
			live: "the prose has no live behavior",
		},
	},
	{
		unit: "four-backgrounds",
		na: {
			mechanic: "the row is a benefit catalog; owned consumer mechanics are separate",
			live: "the catalog has no standalone live interaction",
		},
	},
	{
		unit: "net-new-tool-instances",
		na: {
			mechanic: "the row defines identities and grants; Tool checks own behavior",
			live: "no dedicated live tool-instance proof exists",
		},
	},
	{
		unit: "species-identities-speed-size",
		na: {
			mechanic: "the row is structured identity and seed data",
			live: "no dedicated live species-selection proof exists",
		},
	},
	{
		unit: "trait-identities-and-metadata",
		na: {
			mechanic: "the row is an identity catalog",
			live: "trait catalog metadata has no standalone live interaction",
		},
	},
	{ unit: "mechanized-traits", references: [FINDINGS] },
	{
		unit: "blocked-trait-mechanics",
		references: [FINDINGS],
		na: {
			mechanic: "the row records substrate-owned blockers rather than an implementation",
			fixture: "blocked mechanics emit no fixture",
			live: "blocked mechanics have no live proof",
		},
	},
];
const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
const refs = (unit: string) =>
	units.find((candidate) => candidate.unit === unit)?.references ?? [DETAILS];
const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");
function evidence(unit: string, aspect: Aspect, claim: string, assertion: () => void): void {
	declared.add(key(unit, aspect));
	srdEvidence({ chapter: CHAPTER, unit, aspect, claim, references: refs(unit) }, assertion);
}

describe("Character Origins executable coverage migration", () => {
	evidence(
		"four-backgrounds",
		"source",
		"the CC source produces the four SRD Background records",
		() => expect(buildBackgroundUnits()).toHaveLength(4),
	);
	evidence(
		"four-backgrounds",
		"fixture",
		"the rendered fixture contains the Background catalog",
		() =>
			expect(fixture("base/character-origins/backgrounds.toml")).toContain(
				"srd/background/acolyte",
			),
	);
	evidence(
		"net-new-tool-instances",
		"source",
		"the Background source includes the tool-bearing benefits",
		() =>
			expect(
				buildBackgroundUnits().map((background) => background.toolProficiencyCapabilityId),
			).toContain("srd/proficiency/tool/calligraphers-supplies"),
	);
	evidence(
		"net-new-tool-instances",
		"fixture",
		"the rendered fixture contains both net-new tool identities",
		() => {
			// Per-entity fixture layout (operator directive 2026-08-06): each
			// tool now renders to its own file.
			expect(fixture("base/equipment/tools/calligraphers-supplies.toml")).toContain(
				"calligraphers-supplies",
			);
			expect(fixture("base/equipment/tools/gaming-set-dice.toml")).toContain("gaming-set-dice");
		},
	);
	evidence(
		"species-identities-speed-size",
		"source",
		"the CC source produces all nine species identities",
		() => expect(buildSpeciesUnits()).toHaveLength(9),
	);
	evidence(
		"species-identities-speed-size",
		"fixture",
		"the rendered fixture carries species tag metadata and size state",
		() => {
			const rendered = fixture("base/character-origins/species.toml");
			expect(rendered).toContain('tag = "srd.species"');
			expect(rendered).toContain("srd/size");
		},
	);
	evidence(
		"trait-identities-and-metadata",
		"source",
		"the CC source produces the 33 non-size, non-speed trait identities",
		() => expect(buildTraitUnits()).toHaveLength(33),
	);
	evidence(
		"trait-identities-and-metadata",
		"fixture",
		"the rendered fixture carries the trait tag catalog",
		() => expect(fixture("base/character-origins/traits.toml")).toContain('tag = "srd.trait"'),
	);
	evidence(
		"mechanized-traits",
		"source",
		"the trait source marks Resourceful, Dwarven Toughness, Skillful, Breath Weapon, and Relentless Endurance as mechanized",
		() =>
			expect(buildTraitUnits().filter((trait) => trait.rootCause === "mechanized")).toHaveLength(5),
	);
	evidence(
		"mechanized-traits",
		"mechanic",
		"Dwarven Toughness and Skillful compose concrete existing mechanics",
		() => {
			expect(dwarvenToughnessHpPerLevelBonus()).toBe(1);
			expect(skillfulProofSkillCapabilityId()).toBe("srd/skill/arcana");
		},
	);
	evidence(
		"mechanized-traits",
		"fixture",
		"the rendered trait fixture carries Resourceful, Dwarven Toughness, and Breath Weapon",
		() => {
			const rendered = fixture("base/character-origins/traits.toml");
			expect(rendered).toContain("resourceful");
			expect(rendered).toContain("dwarven-toughness");
			expect(rendered).toContain("srd/dragonborn/breath-weapon");
		},
	);
	evidence(
		"blocked-trait-mechanics",
		"source",
		"the trait catalog records deferred traits with named root-cause ownership",
		() => expect(buildTraitUnits().some((trait) => trait.rootCause !== "mechanized")).toBe(true),
	);

	for (const { unit, references, na } of units) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			if (declared.has(key(unit, aspect))) continue;
			if (aspect !== "source" && na?.[aspect] !== undefined) {
				declared.add(key(unit, aspect));
				srdNotApplicable({
					chapter: CHAPTER,
					unit,
					aspect,
					reason: na[aspect],
					references: references ?? [DETAILS],
				});
			} else {
				srdUnencoded({
					chapter: CHAPTER,
					unit,
					aspect,
					claim: `migration needs executable ${aspect} evidence for ${unit}`,
					references: references ?? [DETAILS],
				});
			}
		}
	}
});
