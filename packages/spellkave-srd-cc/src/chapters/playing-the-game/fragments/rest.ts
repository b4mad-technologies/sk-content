import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../../flavor/read";
import type { ChapterUnitSummary } from "../../chapter-types";
import { RESOURCEFUL_TRAIT_TAG } from "../../character-origins/trait-units";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import {
	LONG_REST_BOUNDARY_ID,
	PRIMARY_CHANNEL_ID,
	SHORT_REST_BOUNDARY_ID,
} from "../action-economy-units";
import { BUNDLE_ID } from "../constants";
import { HEROIC_INSPIRATION_ID } from "../heroic-inspiration-units";
import { HP_ID } from "../hp-units";
import { poolMaxMacroId } from "../pool-max-units";

export const COMPLETE_SHORT_REST_ACTION_ID = `${BUNDLE_ID}/rest/short/complete`;
export const SHORT_REST_CAPABILITY_ID = `${BUNDLE_ID}/action/short-rest`;
export const SHORT_REST_NICHE_ID = `capability:${SHORT_REST_CAPABILITY_ID}`;
export const COMPLETE_LONG_REST_ACTION_ID = `${BUNDLE_ID}/rest/long/complete`;
export const LONG_REST_CAPABILITY_ID = `${BUNDLE_ID}/action/long-rest`;
export const LONG_REST_NICHE_ID = `capability:${LONG_REST_CAPABILITY_ID}`;

// pattern: rest-boundary-resource-refill
// Hardcoded ids (no classes/ import — playing-the-game must not depend on
// classes/). Gates use cond(has_capability, …, 0) so missing class pools never
// fail-closed the rest chain (finding #35 / lazy Cond).
const SECOND_WIND_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/fighter/second-wind`;
const SECOND_WIND_USES_ID = `${BUNDLE_ID}/fighter/second-wind-uses`;
const ACTION_SURGE_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/fighter/action-surge`;
const ACTION_SURGE_USES_ID = `${BUNDLE_ID}/fighter/action-surge-uses`;
const RAGE_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/barbarian/rage`;
const RAGE_USES_ID = `${BUNDLE_ID}/barbarian/rage-uses`;
const FOCUS_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/monk/monks-focus`;
const FOCUS_POINTS_ID = `${BUNDLE_ID}/monk/focus-points`;
const CLERIC_CD_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/cleric/channel-divinity`;
const CLERIC_CD_USES_ID = `${BUNDLE_ID}/cleric/channel-divinity-uses`;
const PALADIN_CD_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/paladin/channel-divinity`;
const PALADIN_CD_USES_ID = `${BUNDLE_ID}/paladin/channel-divinity-uses`;
const ARCANE_RECOVERY_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/wizard/arcane-recovery`;
const ARCANE_RECOVERY_USES_ID = `${BUNDLE_ID}/wizard/arcane-recovery-uses`;
const MAGICAL_CUNNING_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/warlock/magical-cunning`;
const MAGICAL_CUNNING_USES_ID = `${BUNDLE_ID}/warlock/magical-cunning-uses`;
const DRAGONBORN_BW_CAPABILITY_ID = `${BUNDLE_ID}/action/dragonborn/breath-weapon`;
const DRAGONBORN_BW_USES_ID = `${BUNDLE_ID}/dragonborn/breath-weapon-uses`;
const WAND_MAGIC_MISSILES_CAPABILITY_ID = `${BUNDLE_ID}/magic_item/wand-of-magic-missiles/cast`;
const WAND_MAGIC_MISSILES_CHARGES_ID = `${BUNDLE_ID}/magic_item/wand-of-magic-missiles/charges`;
const WAND_FIREBALLS_CAPABILITY_ID = `${BUNDLE_ID}/magic_item/wand-of-fireballs/cast`;
const WAND_FIREBALLS_CHARGES_ID = `${BUNDLE_ID}/magic_item/wand-of-fireballs/charges`;
const SPELL_SLOT_1_ID = `${BUNDLE_ID}/spell_slot_1`;
const SPELL_SLOT_2_ID = `${BUNDLE_ID}/spell_slot_2`;
const HP_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;

// Hit Point Dice (cache/markdown/rules-glossary.md:1283, Short Rest: "Spend Hit
// Point Dice ... For each Hit Point Die you spend in this way, roll the die and add
// your Constitution modifier"; :1035, Long Rest: "You regain all lost Hit Points
// and all spent Hit Point Dice"). One die per Short Rest is this unit's reading of
// "one or more": take another Short Rest for another die. The

// count of SPENT dice is the stored fact: a hero has as many dice as levels,
// so a "spent" counter starts right at 0 for every level without a per-level
// seed.
export const HIT_DICE_SPENT_LOCAL_ID = "hit-dice-spent";
export const HIT_DICE_SPENT_ID = `${BUNDLE_ID}/${HIT_DICE_SPENT_LOCAL_ID}`;
export const HIT_DIE_HEAL_LOCAL_ID = "hit-die-heal";
/** Scratch: what this Short Rest's one die heals, after the cap. Captured
 * once so the Hit Point write and the spent-dice write agree (the capture
 * idiom of the death save, fragments/death-saves.ts). */
export const HIT_DIE_HEAL_ID = `${BUNDLE_ID}/${HIT_DIE_HEAL_LOCAL_ID}`;

// pattern: derived-value-mechanism
/** One Hit Point Die plus the Constitution modifier (at least 1), capped at
 * the room below the hero's real Hit Point maximum; 0 when no die is left or
 * the body is no player character. The die face is the class's, read off the
 * fixed Hit Points per level the class seeds: a dice literal cannot take its
 * sides from a state. The pairing 7, 6, 5, 4 with d12, d10, d8, d6 is the
 * "Fixed Hit Points by Class" table (cache/markdown/character-creation.md:777)
 * beside each class's "Hit Point Die" row (cache/markdown/classes.md:14 for
 * the Barbarian's D12, and the same row of every Core Traits table). */
export function hitDieHealExpr(): string {
	const perLevel = "actor.stat('srd/hp_per_level')";
	const die = `cond(${perLevel} >= 7, 1d12, cond(${perLevel} >= 6, 1d10, cond(${perLevel} >= 5, 1d8, 1d6)))`;
	return (
		"cond(actor.has_tag('srd.player_character'), " +
		`cond(actor.stat('${HIT_DICE_SPENT_ID}') < actor.stat('srd/level'), ` +
		`let h = max(1, ${die} + macro('srd/constitution_modifier')); ` +
		"let room = max(0, macro('srd/hit_point_maximum') - actor.stat('srd/hp')); " +
		"h - max(0, h - room), 0), 0)"
	);
}

/** Spend one Hit Point Die on a Short Rest. Ordinals, in order: make sure both
 * counters exist (a zero delta creates a resource at its initial value, and a
 * read of a resource the actor never had fails closed); capture the heal;
 * heal; count the die as spent only when it healed. */
function hitDieFrameWrites(): Record<string, unknown>[] {
	return [
		modifyResourceWrite(HIT_DICE_SPENT_ID, "0"),
		modifyResourceWrite(HIT_DIE_HEAL_ID, "0"),
		modifyResourceWrite(HIT_DIE_HEAL_ID, `${hitDieHealExpr()} - actor.stat('${HIT_DIE_HEAL_ID}')`),
		modifyResourceWrite(HP_RESOURCE_ID, `actor.stat('${HIT_DIE_HEAL_ID}')`),
		modifyResourceWrite(HIT_DICE_SPENT_ID, `cond(actor.stat('${HIT_DIE_HEAL_ID}') > 0, 1, 0)`),
	];
}

function gatedFullRefill(resourceId: string, capabilityId: string): string {
	return (
		`cond(actor.has_capability('${capabilityId}'), ` +
		`actor.resource_max('${resourceId}') - actor.stat('${resourceId}'), 0)`
	);
}

/** Regain one expended use, never past the class table's value for the
 * level (`pool-max-units.ts`). The resource ceiling is the table's level-20
 * value, so the clamp alone let a level-1 hero rest its way up to it. */
function gatedPlusOne(resourceId: string, capabilityId: string): string {
	return (
		`cond(actor.has_capability('${capabilityId}'), ` +
		`min(1, max(0, macro('${poolMaxMacroId(resourceId)}') - actor.stat('${resourceId}'))), 0)`
	);
}

/** Refill to the class table's value for the level, not to the resource ceiling. */
function gatedRefillToTable(resourceId: string, capabilityId: string): string {
	return (
		`cond(actor.has_capability('${capabilityId}'), ` +
		`max(0, macro('${poolMaxMacroId(resourceId)}') - actor.stat('${resourceId}')), 0)`
	);
}

function modifyResourceWrite(resource: string, delta_source: string): Record<string, unknown> {
	return {
		ModifyResource: {
			actor: "Actor",
			resource,
			delta_source,
		},
	};
}

/** Short Rest: FireBoundary + partial (+1) or full-on-either-rest pools. */
function shortRestFrameWrites(): Record<string, unknown>[] {
	return [
		{
			FireBoundary: {
				boundary_id: SHORT_REST_BOUNDARY_ID,
				scope: "Actor",
			},
		},
		// Partial short-rest recovery (SRD: regain one expended use).
		modifyResourceWrite(
			SECOND_WIND_USES_ID,
			gatedPlusOne(SECOND_WIND_USES_ID, SECOND_WIND_CAPABILITY_ID),
		),
		modifyResourceWrite(RAGE_USES_ID, gatedPlusOne(RAGE_USES_ID, RAGE_CAPABILITY_ID)),
		modifyResourceWrite(FOCUS_POINTS_ID, gatedPlusOne(FOCUS_POINTS_ID, FOCUS_CAPABILITY_ID)),
		modifyResourceWrite(
			CLERIC_CD_USES_ID,
			gatedPlusOne(CLERIC_CD_USES_ID, CLERIC_CD_CAPABILITY_ID),
		),
		modifyResourceWrite(
			PALADIN_CD_USES_ID,
			gatedPlusOne(PALADIN_CD_USES_ID, PALADIN_CD_CAPABILITY_ID),
		),
		// Full recovery on Short or Long Rest.
		modifyResourceWrite(
			ACTION_SURGE_USES_ID,
			gatedRefillToTable(ACTION_SURGE_USES_ID, ACTION_SURGE_CAPABILITY_ID),
		),
		...hitDieFrameWrites(),
	];
}

/** Long Rest: FireBoundary + Resourceful HI + full refill of recoverable pools. */
function longRestFrameWrites(): Record<string, unknown>[] {
	return [
		{
			FireBoundary: {
				boundary_id: LONG_REST_BOUNDARY_ID,
				scope: "Actor",
			},
		},
		modifyResourceWrite(
			`${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}`,
			`cond(actor.has_tag('${RESOURCEFUL_TRAIT_TAG}'), 1, 0)`,
		),
		// HP always present on a resting creature.
		modifyResourceWrite(
			HP_RESOURCE_ID,
			"cond(actor.has_tag('srd.player_character'), max(0, macro('srd/hit_point_maximum') - actor.stat('srd/hp')), actor.resource_max('srd/hp') - actor.stat('srd/hp'))",
		),
		modifyResourceWrite(
			SPELL_SLOT_1_ID,
			"cond(actor.has_capability('srd/action/magic'), let m = macro('srd/spell_slot_1_max'); cond(m > 0, max(0, m - actor.stat('srd/spell_slot_1')), 0), 0)",
		),
		modifyResourceWrite(
			SPELL_SLOT_2_ID,
			"cond(actor.has_capability('srd/action/magic'), let m = macro('srd/spell_slot_2_max'); cond(m > 0, max(0, m - actor.stat('srd/spell_slot_2')), 0), 0)",
		),
		modifyResourceWrite(
			SECOND_WIND_USES_ID,
			gatedRefillToTable(SECOND_WIND_USES_ID, SECOND_WIND_CAPABILITY_ID),
		),
		modifyResourceWrite(
			ACTION_SURGE_USES_ID,
			gatedRefillToTable(ACTION_SURGE_USES_ID, ACTION_SURGE_CAPABILITY_ID),
		),
		modifyResourceWrite(RAGE_USES_ID, gatedRefillToTable(RAGE_USES_ID, RAGE_CAPABILITY_ID)),
		modifyResourceWrite(FOCUS_POINTS_ID, gatedRefillToTable(FOCUS_POINTS_ID, FOCUS_CAPABILITY_ID)),
		modifyResourceWrite(
			CLERIC_CD_USES_ID,
			gatedRefillToTable(CLERIC_CD_USES_ID, CLERIC_CD_CAPABILITY_ID),
		),
		modifyResourceWrite(
			PALADIN_CD_USES_ID,
			gatedRefillToTable(PALADIN_CD_USES_ID, PALADIN_CD_CAPABILITY_ID),
		),
		// Once-per-LR feature rites recharge on Long Rest.
		modifyResourceWrite(
			ARCANE_RECOVERY_USES_ID,
			gatedFullRefill(ARCANE_RECOVERY_USES_ID, ARCANE_RECOVERY_CAPABILITY_ID),
		),
		modifyResourceWrite(
			MAGICAL_CUNNING_USES_ID,
			gatedFullRefill(MAGICAL_CUNNING_USES_ID, MAGICAL_CUNNING_CAPABILITY_ID),
		),
		modifyResourceWrite(
			DRAGONBORN_BW_USES_ID,
			gatedFullRefill(DRAGONBORN_BW_USES_ID, DRAGONBORN_BW_CAPABILITY_ID),
		),
		// sk-609b.13: Curated wand dawn recharge on Long Rest.
		modifyResourceWrite(
			WAND_MAGIC_MISSILES_CHARGES_ID,
			gatedFullRefill(WAND_MAGIC_MISSILES_CHARGES_ID, WAND_MAGIC_MISSILES_CAPABILITY_ID),
		),
		modifyResourceWrite(
			WAND_FIREBALLS_CHARGES_ID,
			gatedFullRefill(WAND_FIREBALLS_CHARGES_ID, WAND_FIREBALLS_CAPABILITY_ID),
		),
		// Every spent Hit Point Die comes back. The zero delta first: the counter
		// may not exist yet on a body that never took a Short Rest.
		modifyResourceWrite(HIT_DICE_SPENT_ID, "0"),
		modifyResourceWrite(HIT_DICE_SPENT_ID, `0 - actor.stat('${HIT_DICE_SPENT_ID}')`),
	];
}

/**
 * Author the user-visible completion of an hour-long Short Rest.
 *
 * The action is the declaration that the downtime has completed, not a
 * shortcut which simulates the preceding hour. Its FireBoundary consequence
 * gives every short-rest recharge authored elsewhere one shared event, and
 * explicit ModifyResource ordinals refill recoverable pools
 * (pattern: rest-boundary-resource-refill).
 */
export async function buildRestFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_resource",
			label: "resource:hit-dice-spent",
			params: {
				id: HIT_DICE_SPENT_LOCAL_ID,
				display_name: "Hit Point Dice spent",
				min_value: 0,
				max_value: 20,
				initial_value: 0,
				recovery_rule: "persistent",
				description: readResourceFlavor(HIT_DICE_SPENT_LOCAL_ID).body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:hit-die-heal",
			params: {
				id: HIT_DIE_HEAL_LOCAL_ID,
				display_name: "Hit Point Die — last heal (scratch)",
				min_value: 0,
				max_value: 999,
				initial_value: 0,
				recovery_rule: "persistent",
				description: readResourceFlavor(HIT_DIE_HEAL_LOCAL_ID).body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "session:long-rest",
			params: {
				bundle: BUNDLE_ID,
				kind: "session_definitions",
				rows: [
					{
						auto_join_on_targeting: false,
						bundle_id: "srd",
						combat_grid_blueprint_id: "",
						grid_edge_affordance_bindings_json: "",
						grid_edge_affordance_template_id: "",
						initial_state: "",
						legal_moves_csv: "",
						on_terminate: "",
						participants_pred: "",
						round_duration_ms: 6000,
						session_def_id: "srd/long_rest",
						stakes_required: "",
						termination_pred:
							"world.tick - session.stat('opened_at') >= session.stat('promoted_duration_ticks')",
						turn_rule: "Sequential",
						turn_scheduler_id: "",
						visibility_policy: "Public",
						winner_predicate: "",
					},
				],
			},
		},
		// actor-carried-verbs D1/D7 amendment (ruling bead sk-rd0, V1): both
		// Short Rest and Long Rest carry a `capability:*` synthetic niche with
		// NO niche_definitions row — same dead-content shape Dodge's own header
		// comment documents (Gate B falls back to the PLACE default, which
		// requires an attachment neither of these self-only actions ever got).
		// `provider: "actor"` revives both as universal self-verbs.
		{
			toolName: "spellkave_write_rows",
			label: "niche:short-rest",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: SHORT_REST_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Complete a Short Rest (self)",
						description:
							"actor-carried-verbs D1/D7 (sk-rd0): revives Short Rest completion as a " +
							"universal self-verb — see fragments/dodge.ts's own header for the full V1 " +
							"dead-content finding this applies identically to.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "niche:long-rest",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: LONG_REST_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Complete a Long Rest (self)",
						description:
							"actor-carried-verbs D1/D7 (sk-rd0): revives Long Rest completion as a " +
							"universal self-verb — same rationale as Short Rest above.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:short-rest",
			params: {
				bundle: BUNDLE_ID,
				id: "action/short-rest",
				display_name: "Complete a Short Rest",
				description:
					"After at least 1 hour of qualifying downtime, finish a Short Rest and " +
					"fire this creature's short-rest boundary.",
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:complete-short-rest",
			params: {
				bundle: BUNDLE_ID,
				id: "rest/short/complete",
				required_capability: SHORT_REST_CAPABILITY_ID,
				niche_id: SHORT_REST_NICHE_ID,
				display_name: "Complete a Short Rest",
				description:
					"Declare that this creature has completed at least 1 hour of qualifying " +
					"downtime; this action records the completion boundary.",
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				// pattern: rest-boundary-resource-refill
				consequence: {
					description:
						"Fire the acting creature's Short Rest completion boundary, apply " +
						"partial/full resource refills for gated class pools, and spend one Hit " +
						"Point Die to heal a hurt player character (pattern: derived-value-mechanism).",
					frame_writes: shortRestFrameWrites(),
				},
			},
		},
		// O3 CONSUMER (Character Origins, `character-origins/trait-units.ts`'s
		// own "Mechanized trait 1: Resourceful" header): the Long Rest's own
		// completion action, same shape as Short Rest above, PLUS a second
		// frame_write granting Heroic Inspiration — species-gated by a tag
		// check, never unconditional (only Human's Resourceful trait grants
		// this; every other species' Long Rest completion must be a no-op on
		// srd/heroic_inspiration). `cond(actor.has_tag(...), 1, 0)` is
		// confirmed EXPRESSIBLE inside `ModifyResource.delta_source` by a
		// direct code read (trait-units.ts's own header cites the exact
		// grammar + evaluation-context lines); `apply_resource_delta`'s clamp
		// makes the +1 idempotent for an actor who already holds it.
		{
			toolName: "spellkave_define_capability",
			label: "capability:long-rest",
			params: {
				bundle: BUNDLE_ID,
				id: "action/long-rest",
				display_name: "Complete a Long Rest",
				description:
					"After at least 8 hours of qualifying downtime, finish a Long Rest and " +
					"fire this creature's long-rest boundary. A creature with the Resourceful trait " +
					`(tagged '${RESOURCEFUL_TRAIT_TAG}') also gains Heroic Inspiration.`,
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:complete-long-rest",
			params: {
				bundle: BUNDLE_ID,
				id: "rest/long/complete",
				required_capability: LONG_REST_CAPABILITY_ID,
				niche_id: LONG_REST_NICHE_ID,
				display_name: "Complete a Long Rest",
				description:
					"After a stretch of qualifying downtime, you complete a Long Rest and recover your Hit Points and spell slots. If you are Resourceful, you gain Heroic Inspiration.",
				self_eligible: true,
				self_only: true,
				session_def_id: "srd/long_rest",
				cost_time_ms: 120000,
				// pattern: rest-boundary-resource-refill
				consequence: {
					description:
						"Fire the acting creature's Long Rest completion boundary; grant Heroic " +
						"Inspiration IFF Resourceful; full-refill HP, spell slots, and gated " +
						"class pools, and return every spent Hit Point Die " +
						"(pattern: rest-boundary-resource-refill).",
					frame_writes: longRestFrameWrites(),
				},
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "session_definitions", id: "srd/long_rest", sourcePk: "" },
		{ kind: "niche_definitions", id: SHORT_REST_NICHE_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: LONG_REST_NICHE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: SHORT_REST_CAPABILITY_ID, sourcePk: "" },
		{ kind: "action_definitions", id: COMPLETE_SHORT_REST_ACTION_ID, sourcePk: "" },
		{
			kind: "consequence_templates",
			id: `${COMPLETE_SHORT_REST_ACTION_ID}/success`,
			sourcePk: "",
		},
		{
			kind: "outcome_templates",
			id: `${COMPLETE_SHORT_REST_ACTION_ID}/outcome`,
			sourcePk: "",
		},
		{
			kind: "affordance_templates",
			id: `${COMPLETE_SHORT_REST_ACTION_ID}/affordance`,
			sourcePk: "",
		},
		{
			kind: "capability_definitions",
			id: LONG_REST_CAPABILITY_ID,
			sourcePk: "character-origins.md:303",
		},
		{
			kind: "action_definitions",
			id: COMPLETE_LONG_REST_ACTION_ID,
			sourcePk: "character-origins.md:303",
		},
		{
			kind: "consequence_templates",
			id: `${COMPLETE_LONG_REST_ACTION_ID}/success`,
			sourcePk: "",
		},
		{
			kind: "outcome_templates",
			id: `${COMPLETE_LONG_REST_ACTION_ID}/outcome`,
			sourcePk: "",
		},
		{
			kind: "affordance_templates",
			id: `${COMPLETE_LONG_REST_ACTION_ID}/affordance`,
			sourcePk: "",
		},
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/rest.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Resting, cache/markdown/playing-the-game.md:1152.",
		"# Short Rest, cache/markdown/rules-glossary.md:1277-1293.",
		"# The action records completion after the sourced hour; it does not skip that downtime.",
		"#",
		"# Long Rest completion action is an O3 CONSUMER (Character Origins,",
		"# ledger/character-origins.md's O3 row, Resourceful trait — see this",
		"# file's own inline comment above the action-verb call).",
		'# actor-carried-verbs D1/D7 (sk-rd0): both niches\' provider="actor"',
		"# rows revive Short/Long Rest as universal self-verbs (V1: dead content",
		"# before this change).",
		"#",
		"# pattern: rest-boundary-resource-refill",
		"# L12b / sk-609b.12.2: FireBoundary + explicit ModifyResource ordinals",
		"# refill HP / slots / gated class pools (recovery_rule stays documentary).",
		"# pattern: derived-value-mechanism",
		"# sk-jay0.1.55.60.3: a Short Rest spends one Hit Point Die (rolled heal",
		"# captured in a scratch resource, capped below the real maximum); a Long",
		"# Rest returns every spent die.",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
