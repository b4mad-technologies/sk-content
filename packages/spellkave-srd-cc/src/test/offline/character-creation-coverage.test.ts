import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";
import {
	levelUpGatePredicateSource,
	xpThresholdForLevel,
} from "../../chapters/character-creation/advancement-units";
import { buildAlignmentUnits } from "../../chapters/character-creation/alignment-units";
import {
	abilityBackgroundRows,
	classOverviewRows,
	higherLevelEquipmentRows,
	multiclassSlotRows,
} from "../../chapters/character-creation/catalogue-rows";
import {
	creationTablesBackgroundAdjustmentTagDescription,
	creationTablesPointCostTagDescription,
	standardArrayForClass,
} from "../../chapters/character-creation/creation-tables-units";
import {
	expectedPassivePerception,
	passivePerceptionExpr,
} from "../../chapters/character-creation/derived-units";
import { buildLanguageUnits } from "../../chapters/character-creation/language-units";
import { trinketUnits } from "../../chapters/character-creation/trinkets";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "character-creation";
const DETAILS = "ledger/archive/character-creation-details.md";
const ADVANCEMENT_DESIGN = "ledger/designs/character-advancement.md";

type Aspect = "source" | "mechanic" | "fixture" | "live";
type Unit = {
	unit: string;
	references?: readonly string[];
	na?: Partial<Record<Exclude<Aspect, "source">, string>>;
};

const units: readonly Unit[] = [
	{
		unit: "choose-character-sheet",
		na: {
			mechanic: "the sheet choice is prose guidance",
			fixture: "the prose emits no fixture",
			live: "the prose has no discrete live interaction",
		},
	},
	{
		unit: "create-your-character-overview",
		na: {
			mechanic: "the overview is a procedure index",
			fixture: "the overview emits no fixture",
			live: "the overview has no standalone live interaction",
		},
	},
	{
		unit: "choose-class-overview",
		na: {
			mechanic: "Classes owns class mechanics",
			fixture: "the cross-chapter table emits no character-creation fixture",
			live: "Classes owns live behavior",
		},
	},
	{ unit: "write-level-and-xp", references: [ADVANCEMENT_DESIGN] },
	{
		unit: "armor-training-pointer",
		na: {
			mechanic: "Equipment owns armor-training behavior",
			fixture: "the pointer emits no fixture",
			live: "Equipment owns live behavior",
		},
	},
	{
		unit: "background-choice-table",
		na: {
			mechanic: "Character Origins owns Background application",
			fixture: "the choice table is metadata only",
			live: "Character Origins owns live behavior",
		},
	},
	{
		unit: "starting-equipment-pointer",
		na: {
			mechanic: "Equipment owns starting equipment",
			fixture: "the pointer emits no fixture",
			live: "Equipment owns live behavior",
		},
	},
	{
		unit: "choose-species-pointer",
		na: {
			mechanic: "Character Origins owns species application",
			fixture: "the pointer emits no fixture",
			live: "Character Origins owns live behavior",
		},
	},
	{
		unit: "imagine-past-and-present",
		na: {
			mechanic: "the prompt is prose guidance",
			fixture: "the prose emits no fixture",
			live: "the prose has no discrete live interaction",
		},
	},
	{ unit: "choose-languages" },
	{
		unit: "generate-ability-scores",
		na: {
			mechanic: "generation-method tables are metadata, not a rolled character generator",
			live: "the metadata table has no live behavior",
		},
	},
	{
		unit: "standard-array-by-class",
		na: {
			mechanic: "the assignment table is metadata, not an automatic assignment reducer",
			live: "the metadata table has no live behavior",
		},
	},
	{
		unit: "background-ability-adjustment",
		na: {
			mechanic: "the adjustment procedure remains author-facing metadata",
			live: "the metadata table has no live behavior",
		},
	},
	{ unit: "ability-scores-and-modifiers" },
	{
		unit: "nine-alignments",
		na: {
			mechanic: "alignment is an identity catalog",
			live: "the catalog has no runtime behavior",
		},
	},
	{
		unit: "unaligned-creatures",
		na: {
			mechanic: "the callout is provenance prose",
			fixture: "the callout emits no fixture",
			live: "the callout has no live behavior",
		},
	},
	{
		unit: "record-class-features-pointer",
		na: {
			mechanic: "Classes owns class features",
			fixture: "the pointer emits no fixture",
			live: "Classes owns live behavior",
		},
	},
	{ unit: "fill-in-numbers", na: { fixture: "the formulas are row-less composed idioms" } },
	{ unit: "character-advancement", references: [ADVANCEMENT_DESIGN] },
	{ unit: "gaining-a-level", references: [ADVANCEMENT_DESIGN] },
	{
		unit: "tiers-of-play",
		na: {
			mechanic: "the source explicitly assigns no rules",
			fixture: "the prose emits no fixture",
			live: "the prose has no live behavior",
		},
	},
	{
		unit: "starting-at-higher-levels",
		na: {
			mechanic: "the procedure is not implemented",
			fixture: "the provenance-only row emits no fixture",
			live: "the procedure has no live behavior",
		},
	},
	{
		unit: "multiclassing-pointer",
		na: {
			mechanic: "Classes owns multiclassing",
			fixture: "the deferred pointer emits no fixture",
			live: "Classes owns live behavior",
		},
	},
	{
		unit: "trinkets",
		na: {
			mechanic: "trinket rows are identities; no roll mechanic",
			fixture: "the identity file is not a creation-flow fixture",
			live: "no trinket roll is authored",
		},
	},
	{
		unit: "class-overview",
		na: {
			mechanic: "overview rows store likes, ability, and complexity; no choice mechanic",
			fixture: "the identity file is not a class-choice fixture",
			live: "no class-overview choice is authored",
		},
	},
	{
		unit: "ability-scores-and-backgrounds",
		na: {
			mechanic: "pairings are identities; no grant mechanic",
			fixture: "the identity file is not a background-grant fixture",
			live: "no pairing grant is authored",
		},
	},
	{
		unit: "starting-equipment-at-higher-levels",
		na: {
			mechanic: "fixed gold is cost_cp; the dice half stays text",
			fixture: "the identity file is not a starting-kit grant",
			live: "no higher-level starting kit is authored",
		},
	},
	{
		unit: "multiclass-spellcaster-slots",
		na: {
			mechanic: "slot counts are metadata; no cast mechanic",
			fixture: "the identity file is not a slot grant",
			live: "no multiclass slot table is authored",
		},
	},
	{
		unit: "multiclassing-rule-pks",
		na: {
			mechanic: "BL-105 names the eight Rule.json pks; no creation-flow mechanic",
			fixture: "BL-105 names the pks",
			live: "no multiclassing rule reducer is authored",
		},
	},
];

const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
const refs = (unit: string) =>
	units.find((candidate) => candidate.unit === unit)?.references ?? [DETAILS];
const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");
function backlogDeclaration(id: string): string {
	const source = readFileSync(new URL("./backlog.test.ts", import.meta.url), "utf8");
	const marker = `id: "${id}"`;
	const start = source.indexOf(marker);
	if (start < 0) throw new Error(`missing backlog declaration ${id}`);
	const next = source.indexOf("backlogItemDeclared(", start + marker.length);
	return source.slice(start, next === -1 ? undefined : next);
}

function evidence(unit: string, aspect: Aspect, claim: string, assertion: () => void): void {
	declared.add(key(unit, aspect));
	srdEvidence({ chapter: CHAPTER, unit, aspect, claim, references: refs(unit) }, assertion);
}

describe("Character Creation executable coverage migration", () => {
	evidence(
		"write-level-and-xp",
		"mechanic",
		"the level-up gate reads level and XP through the authored threshold macro",
		() => expect(levelUpGatePredicateSource()).toContain("srd/xp_threshold"),
	);
	evidence(
		"write-level-and-xp",
		"fixture",
		"the advancement fixture defines XP as a persisted resource",
		() =>
			expect(fixture("base/character-creation/advancement.toml")).toContain(
				'resource_definition_id = "srd/xp"',
			),
	);
	evidence(
		"choose-languages",
		"source",
		"the cached source produces the complete standard and rare language catalog",
		() => expect(buildLanguageUnits()).toHaveLength(19),
	);
	evidence(
		"choose-languages",
		"fixture",
		"the rendered fixture carries language tag metadata",
		() =>
			expect(fixture("base/character-creation/languages.toml")).toContain('tag = "srd.language"'),
	);
	evidence(
		"generate-ability-scores",
		"source",
		"the cached Point Costs table is embedded in generated metadata",
		() => expect(creationTablesPointCostTagDescription()).toContain("Score"),
	);
	evidence(
		"generate-ability-scores",
		"fixture",
		"the rendered fixture carries Point Cost metadata",
		() => expect(fixture("base/character-creation/creation-tables.toml")).toContain("point_cost"),
	);
	evidence(
		"standard-array-by-class",
		"source",
		"the cached Standard Array table yields Fighter's exact six scores",
		() =>
			expect(standardArrayForClass("Fighter")).toMatchObject({
				str: 15,
				dex: 14,
				con: 13,
				int: 8,
				wis: 10,
				cha: 12,
			}),
	);
	evidence(
		"standard-array-by-class",
		"fixture",
		"the rendered fixture carries Standard Array metadata",
		() =>
			expect(fixture("base/character-creation/creation-tables.toml")).toContain("standard_array"),
	);
	evidence(
		"background-ability-adjustment",
		"source",
		"the background-adjustment tag is a short identity without compiler provenance",
		() => {
			expect(creationTablesBackgroundAdjustmentTagDescription()).toContain("Background");
			expect(creationTablesBackgroundAdjustmentTagDescription()).not.toContain("Source:");
		},
	);
	evidence(
		"background-ability-adjustment",
		"fixture",
		"the rendered fixture carries Background Adjustment metadata",
		() =>
			expect(fixture("base/character-creation/creation-tables.toml")).toContain(
				"background_adjustment",
			),
	);
	evidence(
		"nine-alignments",
		"source",
		"the CC source produces all nine alignment identities",
		() => expect(buildAlignmentUnits()).toHaveLength(9),
	);
	evidence(
		"nine-alignments",
		"fixture",
		"the rendered fixture carries alignment tag metadata",
		() =>
			expect(fixture("base/character-creation/alignment.toml")).toContain('tag = "srd.alignment"'),
	);
	evidence(
		"fill-in-numbers",
		"mechanic",
		"Passive Perception composes Wisdom, proficiency, and the fixed ten",
		() => expect(passivePerceptionExpr("actor")).toContain("srd/proficiency_bonus"),
	);
	evidence(
		"character-advancement",
		"source",
		"the parsed advancement table supplies the level-20 XP threshold",
		() => expect(xpThresholdForLevel(20)).toBe(355000),
	);
	evidence(
		"character-advancement",
		"mechanic",
		"the level-up gate forbids advancement past level 20",
		() => expect(levelUpGatePredicateSource()).toContain("< 20"),
	);
	evidence(
		"character-advancement",
		"fixture",
		"the rendered advancement fixture contains the level-up action",
		() =>
			expect(fixture("base/character-creation/advancement.toml")).toContain("advancement/level-up"),
	);
	evidence(
		"gaining-a-level",
		"mechanic",
		"the advancement threshold lookup distinguishes the level-five-to-six gate",
		() => expect(xpThresholdForLevel(6)).toBe(14000),
	);
	evidence(
		"gaining-a-level",
		"fixture",
		"the rendered advancement fixture carries HP-per-level state",
		() => expect(fixture("base/character-creation/advancement.toml")).toContain("hp_per_level"),
	);
	evidence(
		"ability-scores-and-modifiers",
		"mechanic",
		"the existing ability modifier consumer reproduces the source worked example",
		() => expect(expectedPassivePerception(15, 1, true)).toBe(14),
	);

	evidence("trinkets", "source", "the trinket table compiles 100 identities", () => {
		const rows = trinketUnits();
		expect(rows).toHaveLength(100);
		expect(rows[0]?.text).toBe("A mummified goblin hand");
		expect(rows[99]?.roll).toBe("00");
	});
	evidence("class-overview", "source", "the Class Overview table compiles 12 identities", () => {
		const rows = classOverviewRows();
		expect(rows).toHaveLength(12);
		expect(rows[0]?.cells).toEqual(["Barbarian", "Battle", "Strength", "Average"]);
		expect(rows[11]?.cells[0]).toBe("Wizard");
	});
	evidence(
		"ability-scores-and-backgrounds",
		"source",
		"the ability and background table compiles six identities",
		() => {
			const rows = abilityBackgroundRows();
			expect(rows).toHaveLength(6);
			expect(rows[0]).toEqual({ ability: "Strength", background: "Soldier" });
			expect(rows[5]?.ability).toBe("Charisma");
		},
	);
	evidence(
		"starting-equipment-at-higher-levels",
		"source",
		"higher-level starting equipment stores the fixed gold amounts",
		() => {
			const rows = higherLevelEquipmentRows();
			expect(rows.map((row) => row.fixedGp)).toEqual([0, 500, 5000, 20000]);
		},
	);
	evidence(
		"multiclass-spellcaster-slots",
		"source",
		"the multiclass slot table compiles 20 level rows",
		() => {
			const rows = multiclassSlotRows();
			expect(rows).toHaveLength(20);
			expect(rows[0]?.slots[0]).toBe(2);
			expect(rows[19]?.slots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
		},
	);
	evidence(
		"multiclassing-rule-pks",
		"source",
		"BL-105 names the eight multiclassing Rule.json pks",
		() => {
			const declared = backlogDeclaration("BL-105");
			expect(declared).toContain("srd-2024_multiclassing_prerequisties");
			expect(declared).toContain("srd-2024_multiclassing_spellcasting");
		},
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
