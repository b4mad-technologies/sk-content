import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";

import {
	abilityCheckExamples,
	typicalDifficultyClasses,
} from "../../chapters/playing-the-game/ability-checks-units";
import {
	abilityScoreBands,
	buildAbilityUnits,
} from "../../chapters/playing-the-game/ability-units";
import {
	attackRollAbilities,
	attackRollExpr,
	baseArmorClassExpr,
} from "../../chapters/playing-the-game/attack-roll-units";
import { d20TestExpr, d20TestSteps } from "../../chapters/playing-the-game/d20-units";
import {
	lockPickingRuleUnit,
	toolCheckExpr,
} from "../../chapters/playing-the-game/equipment-proficiencies-units";
import { genericAbilityCheckExpr } from "../../chapters/playing-the-game/generic-check-units";
import { assertHeroicInspirationProvenanceSource } from "../../chapters/playing-the-game/heroic-inspiration-units";
import {
	expectedProficiencyBonus,
	proficiencyBonusTable,
} from "../../chapters/playing-the-game/modifier-units";
import {
	saveHalvesExpr,
	savingThrowExamples,
} from "../../chapters/playing-the-game/saving-throw-units";
import { skillCheckExpr } from "../../chapters/playing-the-game/skill-proficiency-units";
import { buildSkillUnits } from "../../chapters/playing-the-game/skill-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "playing-the-game";
const LEGACY = "ledger/archive/playing-the-game-details.md";
const TABLE_DESIGN = "ledger/designs/reference-tables-as-tag-metadata.md";
const GENERIC_CHECK_DESIGN = "ledger/designs/generic-skill-check-target-dc.md";
const SAVE_DESIGN = "ledger/designs/generic-saving-throw-pressure-plate.md";
const OBJECT_DESIGN = "ledger/designs/exploration-object-interaction-vertical.md";
const BIAS_FINDING = "ledger/designs/finding-23-bare-roll-bias.md";

type Aspect = "source" | "mechanic" | "fixture" | "live";
type NonSourceAspect = Exclude<Aspect, "source">;
type Unit = {
	unit: string;
	references?: readonly string[];
	na?: Partial<Record<NonSourceAspect, string>>;
};

const units: readonly Unit[] = [
	{
		unit: "rhythm-of-play",
		na: {
			mechanic: "the scene/action/result loop is provenance-only prose",
			fixture: "the prose rule emits no fixture",
			live: "the prose rule defines no chapter-owned live interaction",
		},
	},
	{
		unit: "ability-descriptions",
		na: { mechanic: "an identity list has no independent runtime mechanic" },
	},
	{
		unit: "ability-score-bands",
		references: [TABLE_DESIGN],
		na: {
			mechanic: "the bands are reference metadata, not runtime behavior",
			live: "tag metadata has no runtime consumer",
		},
	},
	{
		unit: "exceptions-supersede-general-rules",
		na: {
			mechanic: "the precedence sidebar is retained as provenance only",
			fixture: "the sidebar emits no fixture",
			live: "the sidebar defines no chapter-owned interaction",
		},
	},
	{
		unit: "round-down-sidebar",
		na: {
			mechanic: "this chapter records the sidebar as provenance, not a new engine rule",
			fixture: "the sidebar emits no fixture",
			live: "individual consumers prove their own rounding",
		},
	},
	{
		unit: "d20-core-procedure",
		na: { fixture: "d20 is DSL grammar and this row-less idiom emits no fixture" },
	},
	{
		unit: "ability-check-examples",
		na: {
			mechanic: "the examples table is reference-only",
			fixture: "the examples table emits no fixture",
			live: "the examples table has no runtime behavior",
		},
	},
	{
		unit: "typical-difficulty-classes",
		references: [TABLE_DESIGN],
		na: {
			mechanic: "the ladder is reference metadata",
			live: "the metadata table has no runtime behavior",
		},
	},
	{
		unit: "generic-ability-check-verbs",
		references: [GENERIC_CHECK_DESIGN, "ledger/archive/findings-details.md"],
	},
	{
		unit: "saving-throw-examples",
		na: {
			mechanic: "the examples table is reference-only",
			fixture: "the examples table emits no fixture",
			live: "the examples table has no runtime behavior",
		},
	},
	{ unit: "saving-throw-d20-check", references: [SAVE_DESIGN] },
	{ unit: "save-for-half", references: [SAVE_DESIGN] },
	{
		unit: "attack-roll-abilities-table",
		na: {
			mechanic: "the ability mapping table is reference-only",
			fixture: "the table emits no fixture",
			live: "the table has no runtime behavior",
		},
	},
	{ unit: "base-armor-class" },
	{ unit: "attack-roll-resolution", references: ["ledger/designs/generic-unarmed-strike.md"] },
	{ unit: "advantage-disadvantage", references: [BIAS_FINDING] },
	{
		unit: "heroic-inspiration-token",
		na: { mechanic: "the binary resource identity delegates reroll behavior to a separate unit" },
	},
	{
		unit: "heroic-inspiration-reroll",
		references: ["ledger/archive/findings-details.md"],
	},
	{ unit: "proficiency-bonus-table" },
	{ unit: "proficiency-bonus-no-stacking" },
	{
		unit: "skills-identity",
		na: { mechanic: "an identity list has no independent runtime mechanic" },
	},
	{ unit: "skill-proficiencies" },
	{ unit: "saving-throw-proficiencies", references: [SAVE_DESIGN] },
	{ unit: "weapon-proficiencies" },
	{ unit: "tool-proficiencies", references: ["ledger/archive/findings-details.md"] },
	{ unit: "actions-identity-catalog", na: { mechanic: "the catalog only identifies actions" } },
	...(
		[
			"attack",
			"dash",
			"disengage",
			"dodge",
			"help",
			"hide",
			"influence",
			"magic",
			"ready",
			"search",
			"study",
			"utilize",
		] as const
	).map((action) => ({ unit: `action-${action}` })),
	{ unit: "one-thing-at-a-time" },
	{ unit: "bonus-actions" },
	{ unit: "reactions", references: ["ledger/archive/findings-details.md"] },
	{
		unit: "social-npc-attitudes-pointer",
		na: {
			mechanic: "Rules Glossary owns attitude behavior",
			fixture: "a cross-chapter pointer emits no fixture",
			live: "a cross-chapter pointer has no live behavior",
		},
	},
	{
		unit: "social-roleplaying",
		na: {
			mechanic: "roleplaying guidance is prose",
			fixture: "roleplaying guidance emits no fixture",
			live: "roleplaying guidance has no discrete live assertion",
		},
	},
	{
		unit: "social-ability-check-pointer",
		references: [GENERIC_CHECK_DESIGN],
		na: {
			mechanic: "the row delegates to generic ability checks",
			fixture: "the pointer emits no fixture",
			live: "the pointer has no separate live behavior",
		},
	},
	{
		unit: "adventuring-equipment-pointer",
		na: {
			mechanic: "Equipment owns the concrete mechanics",
			fixture: "the pointer emits no fixture",
			live: "the pointer has no live behavior",
		},
	},
	{ unit: "vision-and-light", references: [BIAS_FINDING] },
	{ unit: "hiding" },
	{ unit: "object-interaction-budget", references: [OBJECT_DESIGN] },
	{ unit: "object-interaction-utilize-extra", references: [OBJECT_DESIGN] },
	{ unit: "object-finding-hidden-objects", references: [OBJECT_DESIGN] },
	{ unit: "object-carrying", references: [OBJECT_DESIGN] },
	{ unit: "object-breaking", references: [OBJECT_DESIGN] },
	{
		unit: "uncited-rule-pks",
		references: ["ledger/backlog.md"],
		na: {
			mechanic: "these Rule.json identities are declared, not mechanised",
			fixture: "a declaration emits no rule fixture",
			live: "a declaration has no live rule behaviour",
		},
	},
];

const declared = new Set<string>();
const key = (unit: string, aspect: Aspect) => `${unit}/${aspect}`;
const referencesFor = (unit: string) =>
	units.find((candidate) => candidate.unit === unit)?.references ?? [LEGACY];

function evidence(unit: string, aspect: Aspect, claim: string, assertion: () => void): void {
	declared.add(key(unit, aspect));
	srdEvidence(
		{ chapter: CHAPTER, unit, aspect, claim, references: referencesFor(unit) },
		assertion,
	);
}

function notApplicable(unit: string, aspect: NonSourceAspect, reason: string): void {
	declared.add(key(unit, aspect));
	srdNotApplicable({ chapter: CHAPTER, unit, aspect, reason, references: referencesFor(unit) });
}

function fixture(file: string): string {
	return readFileSync(new URL(`../../../fixtures/${file}`, import.meta.url), "utf8");
}

const UNCITED_RULE_PKS = [
	"srd-2024_d20-tests_advantage-disadvantage",
	"srd-2024_proficiency_bonus-dont-stack",
	"srd-2024_proficiency_skill-proficiencies",
	"srd-2024_proficiency_saving-throw-proficiencies",
	"srd-2024_proficiency_equipment-proficiencies",
	"srd-2024_social-interaction_roleplaying",
	"srd-2024_social-interaction_ability-checks",
	"srd-2024_exploration_adventuring-equipment",
	"srd-2024_exploration_vision-and-light",
	"srd-2024_exploration_hiding",
	"srd-2024_exploration_marching-order",
	"srd-2024_exploration_hazards",
	"srd-2024_exploration_interacting-with-objects",
	"srd-2024_damage-and-healing_hit-points",
	"srd-2024_damage-and-healing_temporary-hit-points",
	"srd-2024_damage-and-healing_damage-rolls",
	"srd-2024_damage-and-healing_critical-hits",
	"srd-2024_damage-and-healing_saving-throws-and-damage",
	"srd-2024_damage-and-healing_damage-types",
	"srd-2024_damage-and-healing_resistance-and-vulnerability",
	"srd-2024_damage-and-healing_immunity",
	"srd-2024_damage-and-healing_healing",
	"srd-2024_damage-and-healing_resting",
	"srd-2024_damage-and-healing_dropping-to-zero-hit-points",
	"srd-2024_damage-and-healing_knocking-out-a-creature",
] as const;

describe("Playing the Game legacy coverage migration A", () => {
	evidence(
		"uncited-rule-pks",
		"source",
		"BL-106 names every Rule.json pk that playing-the-game generators do not cite",
		() => {
			const declaration = readFileSync(
				new URL("../../../src/test/offline/backlog.test.ts", import.meta.url),
				"utf8",
			);
			const item = declaration.slice(declaration.indexOf('id: "BL-106"'));
			expect(item.startsWith('id: "BL-106"')).toBe(true);
			for (const pk of UNCITED_RULE_PKS) expect(item).toContain(pk);
		},
	);
	evidence(
		"ability-descriptions",
		"source",
		"the cached open5e identities produce exactly the six SRD ability records",
		() => {
			expect(buildAbilityUnits().map((ability) => ability.code)).toEqual([
				"cha",
				"con",
				"dex",
				"int",
				"str",
				"wis",
			]);
		},
	);
	evidence(
		"ability-descriptions",
		"fixture",
		"the rendered fixture contains all six ability resource identities",
		() => {
			const rendered = fixture("base/playing-the-game/abilities.toml");
			for (const id of ["srd/str", "srd/dex", "srd/con", "srd/int", "srd/wis", "srd/cha"])
				expect(rendered).toContain(`resource_definition_id = "${id}"`);
		},
	);

	evidence(
		"ability-score-bands",
		"source",
		"the cached source parses seven contiguous score-meaning bands",
		() => {
			expect(abilityScoreBands()).toHaveLength(7);
			expect(abilityScoreBands().map((band) => [band.minScore, band.maxScore])).toEqual([
				[1, 1],
				[2, 9],
				[10, 11],
				[12, 19],
				[20, 20],
				[21, 29],
				[30, 30],
			]);
		},
	);
	evidence(
		"ability-score-bands",
		"fixture",
		"the rendered tag metadata carries the ability-score reference table",
		() => {
			expect(fixture("base/playing-the-game/tag-values.toml")).toContain(
				'tag = "srd.ability_score"',
			);
		},
	);

	evidence(
		"d20-core-procedure",
		"source",
		"the cached markdown supplies all three D20 procedure steps",
		() => {
			expect(d20TestSteps().map((step) => step.title)).toEqual([
				"Roll 1d20",
				"Add Modifiers",
				"Compare the Total to a Target Number",
			]);
		},
	);
	evidence(
		"d20-core-procedure",
		"mechanic",
		"the expression combines a d20, ability modifier, and target comparison",
		() => {
			expect(d20TestExpr({ scoreExpr: "actor.stat('srd/str')", dc: 15 })).toContain("d20 +");
		},
	);

	evidence(
		"ability-check-examples",
		"source",
		"the cached source parses all six ability-check examples",
		() => expect(abilityCheckExamples()).toHaveLength(6),
	);
	evidence(
		"typical-difficulty-classes",
		"source",
		"the cached source parses the six-rung DC ladder",
		() => expect(typicalDifficultyClasses().map((row) => row.dc)).toEqual([5, 10, 15, 20, 25, 30]),
	);
	evidence(
		"typical-difficulty-classes",
		"fixture",
		"the rendered tag metadata carries the Typical Difficulty Classes ladder",
		() =>
			expect(fixture("base/playing-the-game/tag-values.toml")).toContain(
				'tag = "srd.difficulty_class"',
			),
	);
	evidence(
		"generic-ability-check-verbs",
		"mechanic",
		"the generic ability-check expression derives from the shared D20 idiom",
		() =>
			expect(
				genericAbilityCheckExpr({
					scoreExpr: "actor.stat('srd/wis')",
					dcOverrideStateId: "srd/dc/wis",
					isInfluenceShaped: false,
				}),
			).toContain("d20"),
	);
	evidence(
		"generic-ability-check-verbs",
		"fixture",
		"the rendered generic-check fixture contains callable check affordances",
		() =>
			expect(fixture("base/playing-the-game/generic-check-affordances.toml")).toContain(
				"[[affordance_templates]]",
			),
	);

	evidence(
		"saving-throw-examples",
		"source",
		"the cached source parses all six saving-throw examples",
		() => expect(savingThrowExamples()).toHaveLength(6),
	);
	evidence(
		"save-for-half",
		"mechanic",
		"the save-for-half idiom halves only the successful save branch",
		() => expect(saveHalvesExpr("d20 >= 13", "11")).toBe("cond(d20 >= 13, (11) / 2, 11)"),
	);
	evidence(
		"save-for-half",
		"fixture",
		"the pressure-plate proof fixture carries distinct save consequences",
		() =>
			expect(fixture("proofs/playing-the-game-identity/checks/actions.toml")).toContain(
				"pressure-plate-save",
			),
	);

	evidence(
		"attack-roll-abilities-table",
		"source",
		"the cached source parses the three attack-roll ability rows",
		() => expect(attackRollAbilities()).toHaveLength(3),
	);
	evidence(
		"base-armor-class",
		"mechanic",
		"base AC composes the typed base-AC macro around Dexterity",
		() => expect(baseArmorClassExpr("actor.stat('srd/dex')")).toContain("srd/base_ac"),
	);
	evidence(
		"attack-roll-resolution",
		"mechanic",
		"attack rolls retain the natural-1/natural-20 macro",
		() =>
			expect(attackRollExpr({ scoreExpr: "actor.stat('srd/str')", acExpr: "15" })).toContain(
				"srd/attack_roll_hits",
			),
	);
	evidence(
		"attack-roll-resolution",
		"fixture",
		"the rendered attack fixture carries a stochastic attack action",
		() =>
			expect(fixture("base/playing-the-game/attacks.toml")).toContain(
				'resolution_mode = "Stochastic"',
			),
	);

	evidence(
		"heroic-inspiration-token",
		"source",
		"the cached sidebar contains both the reroll and one-instance rules",
		() => expect(() => assertHeroicInspirationProvenanceSource()).not.toThrow(),
	);
	evidence(
		"heroic-inspiration-token",
		"fixture",
		"the rendered fixture defines the binary Heroic Inspiration resource",
		() =>
			expect(fixture("base/playing-the-game/heroic-inspiration.toml")).toContain(
				"heroic_inspiration",
			),
	);
	evidence(
		"heroic-inspiration-reroll",
		"source",
		"the cached sidebar explicitly permits an immediate reroll",
		() => expect(() => assertHeroicInspirationProvenanceSource()).not.toThrow(),
	);

	evidence(
		"proficiency-bonus-table",
		"source",
		"the cached table covers eight contiguous level-or-CR bands",
		() => expect(proficiencyBonusTable()).toHaveLength(8),
	);
	evidence(
		"proficiency-bonus-table",
		"mechanic",
		"the formula reproduces the parsed table at every level or CR",
		() => {
			for (let level = 0; level <= 30; level += 1)
				expect(expectedProficiencyBonus(level)).toBe(2 + Math.trunc((level - 1) / 4));
		},
	);
	evidence(
		"proficiency-bonus-table",
		"fixture",
		"a rendered tool-check fixture calls the proficiency-bonus macro",
		() =>
			expect(fixture("base/playing-the-game/equipment-proficiencies.toml")).toContain(
				"srd/proficiency_bonus",
			),
	);
	evidence(
		"proficiency-bonus-no-stacking",
		"mechanic",
		"a tool-or-skill check contains exactly one proficiency-bonus macro call",
		() => {
			const expression = toolCheckExpr({
				scoreExpr: "actor.stat('srd/dex')",
				toolCapabilityId: "srd/proficiency/tool/thieves-tools",
				relevantSkillCapabilityId: "srd/skill/sleight-of-hand",
				proficiencyLevelExpr: "actor.stat('srd/level')",
				dc: 15,
			});
			expect(expression.match(/macro\('srd\/proficiency_bonus'/g)).toHaveLength(1);
		},
	);

	evidence(
		"skills-identity",
		"source",
		"the cached open5e data produces exactly eighteen skill identities",
		() => expect(buildSkillUnits()).toHaveLength(18),
	);
	evidence(
		"skills-identity",
		"fixture",
		"the rendered fixture contains all skill capability identities",
		() => expect(fixture("base/playing-the-game/skills.toml")).toContain("srd/skill/perception"),
	);
	evidence(
		"skill-proficiencies",
		"mechanic",
		"a skill check gates the bonus on the matching skill capability",
		() =>
			expect(
				skillCheckExpr({
					scoreExpr: "actor.stat('srd/wis')",
					skillCapabilityId: "srd/skill/perception",
					proficiencyLevelExpr: "actor.stat('srd/level')",
					dc: 15,
				}),
			).toContain("has_capability('srd/skill/perception')"),
	);
	evidence(
		"skill-proficiencies",
		"fixture",
		"the generic-check fixture renders skill check affordances",
		() =>
			expect(fixture("base/playing-the-game/generic-check-affordances.toml")).toContain(
				"srd/skill/",
			),
	);

	evidence(
		"tool-proficiencies",
		"source",
		"the cached Lock item provides a Dexterity Sleight of Hand DC 15 check",
		() =>
			expect(lockPickingRuleUnit()).toMatchObject({
				dc: 15,
				abilityCode: "dex",
				skillCapabilityId: "srd/skill/sleight-of-hand",
			}),
	);
	evidence(
		"tool-proficiencies",
		"mechanic",
		"the tool check accepts either the tool or relevant skill proficiency",
		() =>
			expect(
				toolCheckExpr({
					scoreExpr: "actor.stat('srd/dex')",
					toolCapabilityId: "srd/proficiency/tool/thieves-tools",
					relevantSkillCapabilityId: "srd/skill/sleight-of-hand",
					proficiencyLevelExpr: "actor.stat('srd/level')",
					dc: 15,
				}),
			).toContain(" || "),
	);
	evidence(
		"tool-proficiencies",
		"fixture",
		"the rendered fixture defines the Thieves' Tools proficiency capability",
		() =>
			expect(fixture("base/playing-the-game/equipment-proficiencies.toml")).toContain(
				"srd/proficiency/tool/thieves-tools",
			),
	);

	evidence(
		"actions-identity-catalog",
		"fixture",
		"the rendered fixture carries all twelve generic action identities",
		() => {
			const rendered = fixture("base/playing-the-game/actions.toml");
			for (const action of [
				"attack",
				"dash",
				"disengage",
				"dodge",
				"help",
				"hide",
				"influence",
				"magic",
				"ready",
				"search",
				"study",
				"utilize",
			])
				expect(rendered).toContain(`srd/action/${action}`);
		},
	);
	evidence(
		"action-attack",
		"fixture",
		"the rendered attack fixture carries the generic Attack consumer",
		() => expect(fixture("base/playing-the-game/attacks.toml")).toContain("srd/action/attack"),
	);
	evidence(
		"action-dodge",
		"fixture",
		"the rendered Dodge fixture contains its action definition",
		() => expect(fixture("base/playing-the-game/dodge.toml")).toContain("srd/action/dodge"),
	);
	evidence(
		"action-dash",
		"mechanic",
		"Dash spends the Primary action then ModifyChannel-grants one full Movement pool " +
			"(sk-0m4.123, extra-action-budget pattern)",
		() => {
			const rendered = fixture("base/playing-the-game/dash.toml");
			expect(rendered).toContain('spends_channel = "srd/economy_channel/primary"');
			expect(rendered).toContain("[consequence_frame_writes.frame_write.ModifyChannel]");
			expect(rendered).toContain('channel = "srd/economy_channel/movement"');
		},
	);
	evidence(
		"action-dash",
		"fixture",
		"the rendered Dash fixture contains its action definition",
		() => expect(fixture("base/playing-the-game/dash.toml")).toContain("srd/action/dash"),
	);
	evidence(
		"action-help",
		"fixture",
		"the rendered Help fixture contains its action definition",
		() => expect(fixture("base/playing-the-game/help.toml")).toContain("srd/action/help"),
	);
	evidence(
		"reactions",
		"fixture",
		"the rendered attack fixture carries an event-triggered reaction",
		() => expect(fixture("base/playing-the-game/attacks.toml")).toContain("reaction_trigger"),
	);
	evidence(
		"object-interaction-budget",
		"fixture",
		"the proof fixture spends the dedicated object-interaction channel",
		() =>
			expect(
				fixture("proofs/playing-the-game-identity/exploration/object-interaction.toml"),
			).toContain("object_interaction"),
	);
	evidence(
		"object-interaction-utilize-extra",
		"fixture",
		"the proof fixture carries a separate Utilize route",
		() =>
			expect(
				fixture("proofs/playing-the-game-identity/exploration/object-interaction.toml"),
			).toContain("utilize"),
	);

	for (const { unit, references, na } of units) {
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
			if (declared.has(key(unit, aspect))) continue;
			if (aspect !== "source" && na?.[aspect] !== undefined) {
				notApplicable(unit, aspect, na[aspect]);
				continue;
			}
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: `migration needs executable ${aspect} evidence for ${unit}`,
				references: references ?? [LEGACY],
			});
		}
	}
});
