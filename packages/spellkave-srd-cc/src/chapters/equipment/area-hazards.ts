// Area hazards (sk-jay0.3.19.6 slice 2): Caltrops and Ball Bearings become an
// authored Utilize verb each that spends the item and leaves a self-pulsing
// hazard in the place where the user stands. Hunting Trap and a doused Oil
// space stay declared (BL-83): see the backlog entry for the ruled-out routes.
//
// pattern: lingering-hazard-zone
// pattern: consumable-inventory-consume
// pattern: damage-type-routing
// pattern: actor-carried-feature-verb
//
// Source (cache/markdown/equipment.md § Adventuring Gear): "As a Utilize
// action, you can spread Caltrops from their bag to cover a 5-foot-square area
// within 5 feet of yourself. A creature that enters this area for the first
// time on a turn must succeed on a DC 15 Dexterity saving throw or take 1
// Piercing damage and have its Speed reduced to 0 until the start of its next
// turn." Ball Bearings share the shape (10-foot square within 10 feet, DC 10,
// Prone). Every number below is parsed from the cache; the parse throws on
// any drift.
//
// Shape (one row set per item):
// - OFFER: a self-only verb on the actor-carried Utilize niche, gated on
//   carrying the item. The hazard lands on the user's own place node (the
//   source's "within N feet of yourself"; the place graph's smallest area is
//   one node).
// - CONSEQUENCE: RemoveItem one item; every srd.creature already on the node
//   (the user included) gets the per-slug "present when spread" condition
//   until the start of its own next turn; Inscribe a public hazard marker
//   that fades with the pulse; ScheduleAutonomyJob a subject-bound pulse
//   anchored on the node (ADR-0054 caster attribution, ADR-0055 anchor).
// - PULSE: every fiction round, for HAZARD_PULSE_ROUNDS rounds. Each
//   srd.creature on the node that holds neither the "present" nor the
//   per-slug "struck" condition makes the Dexterity save; a failure takes the
//   source's effect plus "struck" until the start of its next turn. Two
//   sibling carriers then apply Monster Death and PC Unconscious at 0 HP.
//
// What the pulse changes from the source (declared in BL-83, stated in the
// verb descriptions and docs/equipment-catalogue.md):
// - Trigger: the source hits a creature that ENTERS the area, the first time
//   on a turn. The pulse hits a creature STANDING on the node at a round,
//   once until its next turn start ("struck"). A creature on the node when
//   the item is used is spared until the start of its next turn ("present"):
//   in a combat session that is its own next turn; outside a session every
//   world tick is a turn start, so a creature that stays on the node is hit
//   from the first pulse on. A runtime-placed hazard has no entry trigger:
//   the node-entry action binding (spatial_niche_attachment.on_entry_action_id)
//   is resolved at manifest apply only, and no frame write creates one
//   (sk-jay0.2.44).
// - Duration: the source has none (recovering takes 10 minutes). A
//   subject-bound actor-reaching job must be bounded (ADR-0054 D-4); the
//   pulse runs HAZARD_PULSE_ROUNDS rounds. The item is not recoverable.
// - The save: d20 + the creature's Dexterity modifier against the DC. Save
//   proficiency is not added. No claim is made about which roll-bias
//   modifiers reach this d20 (see sk-jay0.2.41 for the target-side routing
//   gap on saves).
import { readFileSync } from "node:fs";
import path from "node:path";
import { type AuthorTarget, routeDamage } from "@spellkave/tool-authoring";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import {
	PRIMARY_CHANNEL_ID,
	TURN_START_BOUNDARY_ID,
} from "../playing-the-game/action-economy-units";
import { BUNDLE_ID } from "../playing-the-game/constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { characterUnconsciousFrameWrite } from "../playing-the-game/death-saves-units";
import {
	DEAD_CONDITION_ID,
	PRONE_CONDITION_ID,
	UNCONSCIOUS_CONDITION_ID,
} from "../playing-the-game/fragments/conditions";
import {
	DEATH_SAVE_FAILURES_ID,
	DEATH_SAVE_LAST_ROLL_ID,
	DEATH_SAVE_SUCCESSES_ID,
} from "../playing-the-game/fragments/death-saves";
import {
	SPEED_WALK_RESOURCE_LOCAL_ID,
	speedWalkModifierTargetRow,
} from "../playing-the-game/grid-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { abilityModifierBodyFor } from "../playing-the-game/modifier-units";
import { monsterDeathFrameWrite } from "../playing-the-game/weapon-attack-units";
import { driveUnitScene, type VerbCall } from "../verb-runner.ts";

export const AREA_HAZARDS_PATH = "base/equipment/area-hazards.toml";
export const UTILIZE_CAPABILITY_ID = `${BUNDLE_ID}/action/utilize`;
export const UTILIZE_NICHE_ID = `capability:${UTILIZE_CAPABILITY_ID}`;
export const SPEED_ZERO_CONDITION_LOCAL_ID = "condition/speed-zero";
export const SPEED_ZERO_CONDITION_ID = `${BUNDLE_ID}/${SPEED_ZERO_CONDITION_LOCAL_ID}`;
/** Bound on each hazard's pulses (ADR-0054 D-4); the source names no duration. One minute. */
export const HAZARD_PULSE_ROUNDS = 10;
/** One fiction round, the pulse cadence. */
export const HAZARD_PULSE_FREQUENCY_MS = 6000;
/**
 * Marker lifetime in world ticks: the first pulse fires on the tick after the
 * use and the last one HAZARD_PULSE_ROUNDS - 1 ticks later, at the default
 * 6000 ms per tick (one tick per pulse). One extra tick keeps the marker
 * readable through the last pulse.
 */
export const HAZARD_MARKER_TICKS = HAZARD_PULSE_ROUNDS + 1;
const HP_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;
const SPEED_WALK_ID = `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}`;
const DEX_SCORE_ID = `${BUNDLE_ID}/dex`;
const CREATURE_TAG = `${BUNDLE_ID}.creature`;

/** Per-slug "on the node when the item was used" condition (spared until its next turn start). */
export function hazardPresentConditionId(unit: { slug: string }): string {
	return `${BUNDLE_ID}/condition/hazard/${unit.slug}/present`;
}

/** Per-slug "already hit this turn" condition (spared until its next turn start). */
export function hazardStruckConditionId(unit: { slug: string }): string {
	return `${BUNDLE_ID}/condition/hazard/${unit.slug}/struck`;
}

/** What a failed save does, as the pattern can express it. */
export type HazardEffect =
	| { kind: "damage-and-speed-zero"; damage: string; damageType: string }
	| { kind: "prone" };

/** One area hazard, with every number read from the SRD section. */
export interface AreaHazardUnit {
	slug: string;
	itemId: string;
	actionId: string;
	displayName: string;
	heading: string;
	/** "spread" or "spill", the source's verb. */
	verb: string;
	areaFeet: number;
	rangeFeet: number;
	saveDc: number;
	effect: HazardEffect;
}

interface HazardSpec {
	slug: string;
	displayName: string;
	heading: string;
	verb: string;
}

const SPECS: readonly HazardSpec[] = [
	{
		slug: "ball-bearings",
		displayName: "Ball Bearings",
		heading: "Ball Bearings (1 GP)",
		verb: "spill",
	},
	{ slug: "caltrops", displayName: "Caltrops", heading: "Caltrops (1 GP)", verb: "spread" },
];

const UTILIZE_CLAUSE = "As a Utilize action, you can";
const ENTRY_CLAUSE =
	"A creature that enters this area for the first time on a turn must succeed on a";

function sectionText(heading: string): string {
	const lines = readFileSync(path.join(CACHE_MARKDOWN_DIR, "equipment.md"), "utf8").split("\n");
	const start = lines.findIndex((line) => line.trim() === `#### ${heading}`);
	if (start === -1) throw new Error(`area-hazards: heading '${heading}' not in equipment.md.`);
	const body: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^#{1,4}\s/.test(line)) break;
		body.push(line);
	}
	return body.join(" ").replace(/\s+/g, " ").trim();
}

function parseEffect(heading: string, text: string): HazardEffect {
	const damage =
		/or take (\d+(?:d\d+)?) (\w+) damage and have its Speed reduced to 0 until the start of its next turn/.exec(
			text,
		);
	if (damage?.[1] !== undefined && damage[2] !== undefined) {
		return {
			kind: "damage-and-speed-zero",
			damage: damage[1],
			damageType: damage[2].toLowerCase(),
		};
	}
	if (/saving throw or have the Prone condition/.test(text)) return { kind: "prone" };
	throw new Error(`area-hazards: '${heading}' failure effect did not parse.`);
}

/** Parse the area-hazard facts from the cached SRD text; throws on any drift. */
export function areaHazardUnits(): AreaHazardUnit[] {
	return SPECS.map((spec) => {
		const text = sectionText(spec.heading);
		if (!text.includes(`${UTILIZE_CLAUSE} ${spec.verb}`) || !text.includes(ENTRY_CLAUSE)) {
			throw new Error(`area-hazards: '${spec.heading}' lost its Utilize/entry clauses.`);
		}
		const area = /cover a (?:level, )?(\d+)-foot-square area within (\d+) feet of yourself/.exec(
			text,
		);
		const dc = /DC (\d+) Dexterity saving throw/.exec(text);
		if (area?.[1] === undefined || area[2] === undefined || dc?.[1] === undefined) {
			throw new Error(`area-hazards: '${spec.heading}' area, range or DC did not parse.`);
		}
		const itemId = `${BUNDLE_ID}/item/${spec.slug}`;
		return {
			slug: spec.slug,
			itemId,
			actionId: `${itemId}/${spec.verb}`,
			displayName: spec.displayName,
			heading: spec.heading,
			verb: spec.verb,
			areaFeet: Number(area[1]),
			rangeFeet: Number(area[2]),
			saveDc: Number(dc[1]),
			effect: parseEffect(spec.heading, text),
		};
	});
}

/** Offer gate: the user carries the item. */
export function hazardOfferPredicate(unit: AreaHazardUnit): string {
	return `actor.has_item('${unit.itemId}')`;
}

/**
 * Pulse filter, evaluated once per occupant with the occupant bound as Actor:
 * a creature that is not spared ("present" when the item was used, or
 * "struck" earlier this turn) and fails its Dexterity save
 * (d20 + Dexterity modifier < DC; no save proficiency).
 *
 * The modifier is the canonical srd/ability_modifier body inlined, not a
 * macro() call: the kernel parses a ForEachActorInRadius predicate at fire
 * time without the macro table and refuses the call with
 * "[MF-DSL-MACRO-UNKNOWN] unknown macro `srd/ability_modifier`" (observed
 * live on the autonomy pulse, sk-jay0.2.43), although offline validation
 * accepts it.
 */
export function hazardFailedSavePredicate(unit: AreaHazardUnit): string {
	return (
		`actor.has_tag('${CREATURE_TAG}') && ` +
		`actor.status('${hazardPresentConditionId(unit)}') == false && ` +
		`actor.status('${hazardStruckConditionId(unit)}') == false && ` +
		`d20 + ${abilityModifierBodyFor(`actor.effective('${DEX_SCORE_ID}')`)} < ${unit.saveDc}`
	);
}

function untilOwnTurnStart(conditionId: string): Record<string, unknown> {
	return {
		ApplyStatus: {
			target_kind: "entity",
			target_ref: "Actor",
			condition_definition_id: conditionId,
			expires_at_boundary: { boundary_id: TURN_START_BOUNDARY_ID, owner_actor: "Actor" },
		},
	};
}

/** Leaves the pulse runs on each occupant that failed the save. */
export function hazardPulseBody(unit: AreaHazardUnit): Record<string, unknown>[] {
	const struck = untilOwnTurnStart(hazardStruckConditionId(unit));
	if (unit.effect.kind === "prone") {
		return [
			{
				ApplyStatus: {
					target_kind: "entity",
					target_ref: "Actor",
					condition_definition_id: PRONE_CONDITION_ID,
				},
			},
			struck,
		];
	}
	return [
		{
			ModifyResource: {
				actor: "Actor",
				resource: HP_RESOURCE_ID,
				delta_source: routeDamage(`max(0, ${unit.effect.damage})`, unit.effect.damageType, {
					subject: "actor",
				}),
			},
		},
		{
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "Actor",
				condition_definition_id: SPEED_ZERO_CONDITION_ID,
				expires_at_boundary: { boundary_id: TURN_START_BOUNDARY_ID, owner_actor: "Actor" },
			},
		},
		struck,
	];
}

/** Frame writes of the pulse template, in ordinal order. */
export function hazardPulseFrameWrites(unit: AreaHazardUnit): Record<string, unknown>[] {
	return [
		{
			// pattern: lingering-hazard-zone
			ForEachActorInRadius: {
				center_ref: "TargetSpatialRef",
				shape_id: "core/area/node_ball",
				shape_params_json: JSON.stringify({ ball_radius: 0 }),
				predicate_source: hazardFailedSavePredicate(unit),
				body: hazardPulseBody(unit),
			},
		},
		// The shared 0-HP carriers (ForEachActorInRadius + ApplyStatus /
		// ModifyResource leaves, macro-free guards): the shape the autonomy
		// fence admits.
		monsterDeathFrameWrite(HP_RESOURCE_ID, DEAD_CONDITION_ID),
		characterUnconsciousFrameWrite(
			HP_RESOURCE_ID,
			UNCONSCIOUS_CONDITION_ID,
			DEATH_SAVE_SUCCESSES_ID,
			DEATH_SAVE_FAILURES_ID,
			DEATH_SAVE_LAST_ROLL_ID,
		),
	];
}

/** Use-time write: every creature already on the node is spared until its next turn start. */
export function hazardPresentFrameWrite(unit: AreaHazardUnit): Record<string, unknown> {
	return {
		ForEachActorInRadius: {
			center_ref: "TargetSpatialRef",
			shape_id: "core/area/node_ball",
			shape_params_json: JSON.stringify({ ball_radius: 0 }),
			predicate_source: `actor.has_tag('${CREATURE_TAG}')`,
			body: [untilOwnTurnStart(hazardPresentConditionId(unit))],
		},
	};
}

function localId(id: string): string {
	return id.slice(`${BUNDLE_ID}/`.length);
}

function hazardStateId(unit: AreaHazardUnit): string {
	return `${BUNDLE_ID}/hazard/${unit.slug}`;
}

function pulseId(unit: AreaHazardUnit): string {
	return `${unit.actionId}/pulse`;
}

function scheduleEffectId(unit: AreaHazardUnit): string {
	return `${unit.actionId}/schedule`;
}

/** ScheduleAutonomyJob parameters: one bounded, subject-bound pulse per use. */
export function hazardScheduleParams(unit: AreaHazardUnit): Record<string, unknown> {
	return {
		dsl_function: pulseId(unit),
		// Absolute fiction time already past in any running world: the first
		// pulse fires on the next world tick after the item is used.
		fires_at_ms: HAZARD_PULSE_FREQUENCY_MS,
		payload_json: "{}",
		source: `${BUNDLE_ID}/${unit.slug}/{Actor}/{tick}`,
		frequency_ms: HAZARD_PULSE_FREQUENCY_MS,
		repeats_remaining: HAZARD_PULSE_ROUNDS,
		requires_subject_alive: false,
		priority: 0,
	};
}

function effectSentence(unit: AreaHazardUnit): string {
	return unit.effect.kind === "prone"
		? "is knocked Prone"
		: `takes ${unit.effect.damage} ${unit.effect.damageType} damage and has Speed 0 until the start of its next turn`;
}

function verbDescription(unit: AreaHazardUnit): string {
	return (
		`${unit.verb.charAt(0).toUpperCase()}${unit.verb.slice(1)} ${unit.displayName} where you stand. ` +
		`For ${HAZARD_PULSE_ROUNDS} rounds, each round a creature standing there makes a ` +
		`DC ${unit.saveDc} Dexterity saving throw or ${effectSentence(unit)}; a creature is hit at ` +
		"most once until the start of its next turn. Creatures already there, you included, are " +
		"spared until the start of their next turn. The item is used up."
	);
}

function speedZeroCalls(): VerbCall[] {
	return [
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:speed-walk-hazards",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [speedWalkModifierTargetRow()],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:speed-zero",
			params: {
				bundle: BUNDLE_ID,
				id: SPEED_ZERO_CONDITION_LOCAL_ID,
				display_name: "Speed 0",
				gate_predicate_source: "1 == 1",
				description:
					"Your walking Speed is 0 until the start of your next turn (equipment.md § Caltrops). " +
					"The Speed axis is set to 0 while the condition holds.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: `${SPEED_ZERO_CONDITION_LOCAL_ID}/walk`,
						display_name: "Speed 0: walking Speed set to 0",
						applies_to: SPEED_WALK_ID,
						modifier_expression_source: "let zero = 0; zero",
						delta_kind: "FlatSet",
						tags: [],
					},
				],
			},
		},
	];
}

function utilizeNicheCall(): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: "niche:utilize",
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: UTILIZE_NICHE_ID,
					bundle_id: BUNDLE_ID,
					display_name: "Utilize (self)",
					description:
						"Actor-carried niche for Utilize verbs on carried gear: the acting creature's own " +
						"srd/action/utilize capability carries it everywhere, no place attachment.",
					predicate_source: "",
					provider: "actor",
				},
			],
		},
	};
}

function sparedConditionCall(
	conditionId: string,
	displayName: string,
	description: string,
): VerbCall {
	return {
		toolName: "spellkave_define_condition",
		label: `condition:${localId(conditionId)}`,
		params: {
			bundle: BUNDLE_ID,
			id: localId(conditionId),
			display_name: displayName,
			gate_predicate_source: "1 == 1",
			description,
			remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
			stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			modifiers: [],
		},
	};
}

function unitCalls(unit: AreaHazardUnit): VerbCall[] {
	const stateId = hazardStateId(unit);
	return [
		sparedConditionCall(
			hazardPresentConditionId(unit),
			`${unit.displayName}: here when used`,
			`You were standing here when the ${unit.displayName} were put down. They spare you until the start of your next turn.`,
		),
		sparedConditionCall(
			hazardStruckConditionId(unit),
			`${unit.displayName}: already caught`,
			`The ${unit.displayName} already caught you. They spare you until the start of your next turn.`,
		),
		{
			toolName: "spellkave_write_rows",
			label: `${localId(unit.actionId)}/hazard-state`,
			params: {
				bundle: BUNDLE_ID,
				kind: "spatial_state_definitions",
				rows: [
					{
						state_id: stateId,
						bundle_id: BUNDLE_ID,
						value_type: "int",
						writer_policy: "world_interaction",
						description: `${unit.displayName} scattered here (public hazard marker).`,
						freshness_rule: `expires_after_ticks:${HAZARD_MARKER_TICKS}`,
						lod_policy: "retain_latest",
						merge_rule: "replace",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `${localId(unit.actionId)}/pulse`,
			params: {
				bundle: BUNDLE_ID,
				id: localId(pulseId(unit)),
				description: `${unit.displayName} pulse: each creature on the node makes a DC ${unit.saveDc} Dexterity save or ${effectSentence(unit)}.`,
				frame_writes: hazardPulseFrameWrites(unit),
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `${localId(unit.actionId)}/schedule-effect`,
			params: {
				bundle: BUNDLE_ID,
				kind: "effect_definitions",
				rows: [
					{
						effect_def_id: scheduleEffectId(unit),
						bundle_id: BUNDLE_ID,
						primitives_csv: "ScheduleAutonomyJob",
						parameters_schema_json: JSON.stringify(hazardScheduleParams(unit)),
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: localId(unit.actionId),
			params: {
				bundle: BUNDLE_ID,
				id: localId(unit.actionId),
				required_capability: UTILIZE_CAPABILITY_ID,
				niche_id: UTILIZE_NICHE_ID,
				display_name: `${unit.verb.charAt(0).toUpperCase()}${unit.verb.slice(1)} ${unit.displayName}`,
				description: verbDescription(unit),
				predicate_source: hazardOfferPredicate(unit),
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: `${unit.displayName} ${unit.verb}: one is used up; a public marker and a ${HAZARD_PULSE_ROUNDS}-round pulse are left on this node.`,
					effect_ref: scheduleEffectId(unit),
					frame_writes: [
						{
							RemoveItem: {
								count: 1,
								source: { ActorInventoryItem: { actor_ref: "Actor", item_def_id: unit.itemId } },
							},
						},
						hazardPresentFrameWrite(unit),
						{
							Inscribe: {
								kind: "spatial_environment_state",
								location_kind: "binding",
								location_ref: "TargetSpatialRef",
								payload_json: JSON.stringify({ state_id: stateId, value: 1, visibility: "Public" }),
								expires_after_ticks: HAZARD_MARKER_TICKS,
							},
						},
					],
				},
			},
		},
	];
}

export async function buildAreaHazardsFragment(
	target?: AuthorTarget,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const units = areaHazardUnits();
	const calls = [...speedZeroCalls(), utilizeNicheCall(), ...units.flatMap(unitCalls)];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	return {
		path: AREA_HAZARDS_PATH,
		toml:
			"# GENERATED by src/chapters/equipment/area-hazards.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			"#\n" +
			"# pattern: lingering-hazard-zone\n" +
			"# pattern: consumable-inventory-consume\n" +
			"# pattern: damage-type-routing\n" +
			"# pattern: actor-carried-feature-verb\n" +
			"#\n" +
			"# Area hazards: one self-only Utilize verb per item. It removes one item,\n" +
			"# spares every creature already on the user's node until its next turn\n" +
			"# start, inscribes a public marker that fades with the pulse and schedules\n" +
			"# a bounded, subject-bound pulse there: each round a creature on the node\n" +
			"# that is not spared makes the item's Dexterity save or takes its effect\n" +
			"# (then is spared until its next turn start); Monster Death and PC\n" +
			"# Unconscious carriers follow. The source's entry trigger and unbounded\n" +
			"# duration are not expressible; Hunting Trap and a doused Oil space stay\n" +
			"# declared (BL-83).\n" +
			"# markdown: equipment.md § Adventuring Gear (Ball Bearings, Caltrops)\n\n" +
			body,
		units: [
			{
				kind: "condition_definitions",
				id: SPEED_ZERO_CONDITION_ID,
				sourcePk: "equipment.md#Caltrops (1 GP)",
			},
			{ kind: "niche_definitions", id: UTILIZE_NICHE_ID, sourcePk: "" },
			...units.flatMap((unit) =>
				[hazardPresentConditionId(unit), hazardStruckConditionId(unit)].map((id) => ({
					kind: "condition_definitions",
					id,
					sourcePk: `equipment.md#${unit.heading}`,
				})),
			),
			...units.map((unit) => ({
				kind: "action_definitions",
				id: unit.actionId,
				sourcePk: `equipment.md#${unit.heading}`,
			})),
		],
	};
}
