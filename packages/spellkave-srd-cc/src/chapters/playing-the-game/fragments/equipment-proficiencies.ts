// GENERATED fragment builder for the small Equipment Proficiencies vertical
// slice. Tool identity is emitted by the Equipment chapter; this fragment
// owns only capability identities and the lock-picking check rule.
// Calligrapher's Supplies + Gaming Set (Dice) proficiency capabilities
// (2026-07-31, O1) are net-new consumers of this same fragment — Character
// Origins' Backgrounds (`ledger/character-origins.md`) reference them by id,
// never granting either to any actor in the base bundle (same posture as
// Thieves' Tools' own proficiency capability).
import type { ChapterUnitSummary } from "../../chapter-types";
import { choiceToolUnits } from "../../equipment/choice-tools.ts";
import { driveUnitScene } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	LOCK_PICKING_CHECK_CAPABILITY_ID,
	lockPickingRuleUnit,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
	toolCheckExpr,
} from "../equipment-proficiencies-units";

export async function buildEquipmentProficienciesFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const lockPicking = lockPickingRuleUnit();
	const choiceTools = choiceToolUnits().filter(
		(unit) => unit.proficiencyCapabilityId !== CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	);
	const body = await driveUnitScene(
		BUNDLE_ID,
		[
			...choiceTools.map((unit) => ({
				toolName: "spellkave_define_capability",
				label: `capability:${unit.proficiencyCapabilityId}`,
				params: {
					id: unit.proficiencyCapabilityId.slice(`${BUNDLE_ID}/`.length),
					actor_kind: "entity",
					display_name: `Tool Proficiency: ${unit.name}`,
					description: `Proficiency with ${unit.name}.`,
					tags: ["srd.tool_proficiency"],
				},
			})),
			{
				toolName: "spellkave_define_capability",
				label: "capability:tool-proficiency/thieves-tools",
				params: {
					id: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID.slice(`${BUNDLE_ID}/`.length),
					actor_kind: "entity",
					display_name: "Tool Proficiency: Thieves' Tools",
					description:
						"Holding this capability means the actor is proficient with Thieves' Tools. " +
						"A tool check adds the one shared Proficiency Bonus via srd/proficiency_bonus. " +
						"Later Character Creation class/background generation grants this capability; " +
						"this slice does not grant it to any actor. SRD: cache/markdown/equipment.md:618-620; " +
						"cache/markdown/playing-the-game.md:606-608.",
					tags: ["srd.tool_proficiency"],
				},
			},
			{
				toolName: "spellkave_define_capability",
				label: "capability:tool-proficiency/calligraphers-supplies",
				params: {
					id: CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID.slice(`${BUNDLE_ID}/`.length),
					actor_kind: "entity",
					display_name: "Tool Proficiency: Calligrapher's Supplies",
					description: "Proficiency with Calligrapher's Supplies.",
					tags: ["srd.tool_proficiency"],
				},
			},
			{
				toolName: "spellkave_define_capability",
				label: "capability:tool-proficiency/gaming-set-dice",
				params: {
					id: GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID.slice(`${BUNDLE_ID}/`.length),
					actor_kind: "entity",
					display_name: "Tool Proficiency: Gaming Set (Dice)",
					description: "Proficiency with a Gaming Set (Dice).",
					tags: ["srd.tool_proficiency"],
				},
			},
			{
				toolName: "spellkave_define_capability",
				label: "capability:check/lock-picking",
				params: {
					id: LOCK_PICKING_CHECK_CAPABILITY_ID.slice(`${BUNDLE_ID}/`.length),
					actor_kind: "entity",
					display_name: "Check: Lock Picking",
					description: "Lock picking — a tool check.",
					tags: ["srd.check"],
				},
			},
			{
				toolName: "spellkave_define_action_verb",
				label: "check:lock-picking",
				params: {
					bundle: BUNDLE_ID,
					id: "check/lock-picking",
					required_capability: LOCK_PICKING_CHECK_CAPABILITY_ID,
					niche_id: lockPicking.targetNicheTag,
					display_name: "Check: Lock Picking",
					description:
						`Resolve the SRD lock-picking check at DC ${lockPicking.dc}. Tool identity is authored separately ` +
						"as srd/tool/thieves-tools; the actor's tool-proficiency capability and the " +
						"Sleight of Hand skill capability each qualify for one shared Proficiency Bonus. " +
						"Advantage for having both is not encoded here because the current modifier surface " +
						"cannot scope it to exactly this check. SRD: cache/markdown/equipment.md:1534; " +
						"cache/markdown/playing-the-game.md:608.",
					predicate_source: toolCheckExpr({
						scoreExpr: `actor.effective('srd/${lockPicking.abilityCode}')`,
						toolCapabilityId: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
						relevantSkillCapabilityId: lockPicking.skillCapabilityId,
						proficiencyLevelExpr: "actor.stat('srd/level')",
						dc: lockPicking.dc,
					}),
				},
			},
		],
		undefined,
		{ omitRowKinds: ["dsl_macro_definitions"] },
	);

	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/equipment-proficiencies.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Tool proficiency capabilities (Thieves' Tools + lock-picking check;",
		"# Calligrapher's Supplies + Gaming Set (Dice), net-new O1 consumers —",
		"# see this file's own header) — tool identity is emitted separately in",
		"# base/equipment/tools.toml.",
		"# The existing srd/proficiency_bonus macro is reused. The helper emits",
		"# one PB term gated by tool proficiency OR Sleight of Hand proficiency",
		"# (PB never stacks). Advantage for both proficiencies is recorded as an",
		"# honest authoring gap in ledger/equipment.md and ledger/findings.md.",
		"# Sources: cache/markdown/equipment.md:618-620,1534;",
		"# cache/markdown/playing-the-game.md:606-608.",
		"",
		"",
	].join("\n");

	return {
		toml: header + body,
		units: [
			...choiceTools.map((unit) => ({
				kind: "capability_definitions",
				id: unit.proficiencyCapabilityId,
				sourcePk: unit.pk,
			})),
			{ kind: "capability_definitions", id: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID, sourcePk: "" },
			{
				kind: "capability_definitions",
				id: CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
				sourcePk: "srd-2024_calligraphers-supplies",
			},
			{
				kind: "capability_definitions",
				id: GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
				sourcePk: "srd-2024_gaming-set-dice",
			},
			{
				kind: "capability_definitions",
				id: LOCK_PICKING_CHECK_CAPABILITY_ID,
				sourcePk: lockPicking.sourcePk,
			},
			{
				kind: "action_definitions",
				id: `${LOCK_PICKING_CHECK_CAPABILITY_ID}`,
				sourcePk: lockPicking.sourcePk,
			},
			{
				kind: "outcome_templates",
				id: `${LOCK_PICKING_CHECK_CAPABILITY_ID}/outcome`,
				sourcePk: lockPicking.sourcePk,
			},
			{
				kind: "affordance_templates",
				id: `${LOCK_PICKING_CHECK_CAPABILITY_ID}/affordance`,
				sourcePk: lockPicking.sourcePk,
			},
			{
				kind: "consequence_templates",
				id: `${LOCK_PICKING_CHECK_CAPABILITY_ID}/success`,
				sourcePk: lockPicking.sourcePk,
			},
		],
	};
}
