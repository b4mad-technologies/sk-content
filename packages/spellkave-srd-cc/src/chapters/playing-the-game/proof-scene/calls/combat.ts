import { ADVANCEMENT_TRAINER_TAG } from "../../../character-creation/advancement-units";
import { LANGUAGE_TAG_PREFIX } from "../../../character-creation/language-units";
import { SECOND_WIND_CAPABILITY_ID } from "../../../classes/fighter-units";
import type { VerbCall } from "../../../verb-runner";
import { REACTION_CHANNEL_ID } from "../../action-economy-units";
import { AC_RESOURCE_ID } from "../../armor-class-units";
import { CREATURE_NICHE_TAG } from "../../creature-type-units";
import { LONG_REST_CAPABILITY_ID } from "../../fragments/rest";
import { PROFICIENCY_BONUS_STATE_ID } from "../../modifier-units";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../../reach-units";
import { ATTACK_ROLL_RESOLUTION_SCOPE_ID } from "../../resolution-scope-units";
import { unarmedStrikeAttackExpr } from "../../unarmed-strike-units";
import {
	PROOF_ATTACK_ACTION_CAPABILITY_ID,
	PROOF_BUNDLE_ID,
	PROOF_DC_ATHLETICS_STATE_ID,
	PROOF_DC_PERSUASION_STATE_ID,
	PROOF_DODGE_CAPABILITY_ID,
	PROOF_GENERIC_IMPOSSIBLE_DC,
	PROOF_GENERIC_PERSUASION_TARGET_INT,
	PROOF_GUARD_AC,
	PROOF_GUARD_CREATURE_TYPE_TAG,
	PROOF_GUARD_DEF_ID,
	PROOF_GUARD_DEF_LOCAL_ID,
	PROOF_GUARD_HP,
	PROOF_GUARD_HP_STATE_ID,
	PROOF_GUARD_SPAWN_KEY_PREFIX,
	PROOF_INT_STATE_ID,
	PROOF_LEVEL_STATE_ID,
	PROOF_LEVEL_VALUE,
	PROOF_MOVEMENT_REACH,
	PROOF_MOVEMENT_REACH_STATE_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_REACTION_RESOLUTION_ACTION_ID,
	PROOF_REACTION_RESOLUTION_CAPABILITY_ID,
	PROOF_REACTION_RESOLUTION_DAMAGE,
	PROOF_REACTION_SUPPRESSION_ACTION_ID,
	PROOF_SHORT_REST_CAPABILITY_ID,
	PROOF_STR_STATE_ID,
	PROOF_STR_VALUE,
	PROOF_TRAVERSAL_CAPABILITY_ID,
} from "..";

// C3 (Ability-Score Generation, `ledger/character-creation.md`'s "Standing
// pattern" addendum): the guard gets ONLY `srd.language.common` — no
// alignment (the addendum names alignment for the hero and the goblin
// warriors, not the guard).
const GUARD_LANGUAGE_COMMON_TAG = `${LANGUAGE_TAG_PREFIX}.common`;

export const COMBAT_DEFINITION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_capability",
		label: "proof-reaction-resolution-capability",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "reaction-resolution",
			display_name: "Resolve proof-only stochastic reactions",
			actor_kind: "entity",
			description:
				"TEST-ONLY gate isolating the generic reaction-resolution seam from unrelated " +
				"creatures and proof scenes.",
		},
	},
];

export const COMBAT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-guard-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_GUARD_DEF_LOCAL_ID,
			display_name: "Guard",
			description:
				"TEST-ONLY second actor for the generic-check verb rework (slice 2), plus the " +
				"generic Unarmed Strike Damage live proof — a REAL actor " +
				"blueprint, not an inert prop like training-dummy, " +
				"carrying its own srd/int score, the srd/dc/athletics (guaranteed-failure " +
				"override, the torn-down d20-impossible's own construction) and srd/dc/persuasion " +
				"(0 sentinel, no override) states the Athletics-impossible and Persuasion-derived " +
				"checks read against it (the design draft's own 'persuade the guard' shape), plus " +
				"real srd/ac and srd/hp target facts for the shipped Unarmed Strike " +
				"(finding #35 — every target an action can act against must carry every state its " +
				"predicate and consequence touch, not just the ones it already needed). C5 (Step-5 " +
				"derived numbers): also the CHECKING actor for the stealth-vs-passive-perception live " +
				"proof (checks.ts) — carries its own srd/dex seed and srd/skill/stealth proficiency, " +
				"chosen so its total Stealth modifier lands the guaranteed-success boundary trick " +
				"exactly on the hero's own derived Passive Perception DC (checks.ts's own header).",
			// Slice 3.1 (the proof-scene design record): the creature umbrella +
			// this entity's own honest SRD creature type (a guard is a Humanoid
			// NPC, not the training-dummy's Construct) — same mechanism as the
			// dummy's own tags, above. C3 adds `srd.language.common` (the
			// "vocabulary never ships unattached" addendum).
			tags: [
				CREATURE_NICHE_TAG,
				PROOF_GUARD_CREATURE_TYPE_TAG,
				GUARD_LANGUAGE_COMMON_TAG,
				ADVANCEMENT_TRAINER_TAG,
			],
			initial_capabilities: [
				{ capability: PROOF_REACTION_RESOLUTION_CAPABILITY_ID },
				{ capability: PROOF_TRAVERSAL_CAPABILITY_ID },
			],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: PROOF_INT_STATE_ID, value_int: PROOF_GENERIC_PERSUASION_TARGET_INT },
				{ state: PROOF_STR_STATE_ID, value_int: PROOF_STR_VALUE },
				{ state: PROOF_LEVEL_STATE_ID, value_int: PROOF_LEVEL_VALUE },
				{ state: PROOF_DC_ATHLETICS_STATE_ID, value_int: PROOF_GENERIC_IMPOSSIBLE_DC },
				{ state: PROOF_DC_PERSUASION_STATE_ID, value_int: 0 },
				{ state: AC_RESOURCE_ID, value_int: PROOF_GUARD_AC },
				{ state: PROOF_GUARD_HP_STATE_ID, value_int: PROOF_GUARD_HP },
				{ state: PROOF_MOVEMENT_REACH_STATE_ID, value_int: PROOF_MOVEMENT_REACH },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-guard-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_GUARD_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_GUARD_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned second-actor target for the generic-check verb rework.",
		},
	},
	{
		toolName: "spellkave_define_consequence",
		label: "proof-reaction-resolution-miss",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "reaction-resolution/miss",
			description:
				"TEST-ONLY miss branch for the event-triggered stochastic reaction seam; no state changes.",
			frame_writes: [],
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-reaction-resolution",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "reaction-resolution",
			required_capability: PROOF_REACTION_RESOLUTION_CAPABILITY_ID,
			niche_id: CREATURE_NICHE_TAG,
			display_name: "Proof-only stochastic reaction resolution",
			description:
				"TEST-ONLY event-triggered reaction whose raw d20 versus target AC gives deterministic boundary hit/miss coverage for r_react; never base SRD content.",
			predicate_source: "1 == 1",
			resolution_mode: "Stochastic",
			resolution_predicate_source: `d20 >= target.effective('${AC_RESOURCE_ID}')`,
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			on_failure: `${PROOF_REACTION_RESOLUTION_ACTION_ID}/miss`,
			accepts_global_storm: true,
			cost_time_ms: 0,
			reaction_trigger: "$event.kind == 'r_move' && $event.detail.on_exit == 'true'",
			reaction_eligibility: `actor.has_capability('${PROOF_REACTION_RESOLUTION_CAPABILITY_ID}')`,
			reaction_window_ms: 30_000,
			consequence: {
				description: "TEST-ONLY hit branch: subtract one HP from the triggering mover.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: PROOF_GUARD_HP_STATE_ID,
							delta_source: String(-PROOF_REACTION_RESOLUTION_DAMAGE),
						},
					},
				],
			},
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-reaction-suppression",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_REACTION_SUPPRESSION_ACTION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			required_capability: PROOF_REACTION_RESOLUTION_CAPABILITY_ID,
			niche_id: CREATURE_NICHE_TAG,
			self_only: true,
			display_name: "Reserve reaction for non-OA proof work",
			description:
				"TEST-ONLY self action that reserves the shared proof actors' reaction budget so out-of-session movement proofs do not open unrelated Opportunity Attack windows; combat-arena proves the shipped OA path in-session.",
			predicate_source: "1 == 1",
			cost_time_ms: 0,
			spends_channel: REACTION_CHANNEL_ID,
			consequence: {
				description:
					"TEST-ONLY zero-delta HP write keeps this reservation non-steering while the action-economy gate spends the reaction channel.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: PROOF_GUARD_HP_STATE_ID,
							delta_source: "0",
						},
					},
				],
			},
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-self-action-niche-attachments",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			// C4's Level Up no longer belongs here: actor-carried-verbs D2(c) made
			// `srd.advancement_trainer` an entity-provided target niche, so the
			// Guard's definition tag above supplies the proof target directly.
			// O3 (Resourceful): the new Complete-a-Long-Rest action is the same
			// self-only capability-action class — same finding-#82 attachment
			// requirement (missed on first landing, caught in the O3 lead
			// live-gate run: boundary never fired, attachment_presence gap).
			// K2 (Classes, Fighter vertical): Second Wind is ALSO a self-only
			// capability action (Bonus Action, self_eligible + self_only) — the
			// SAME finding-#82 requirement; this binding session's own rule (k)
			// names this exact list as "missed twice — do not be the third".
			rows: [
				PROOF_DODGE_CAPABILITY_ID,
				PROOF_SHORT_REST_CAPABILITY_ID,
				LONG_REST_CAPABILITY_ID,
				SECOND_WIND_CAPABILITY_ID,
			].map((capabilityId) => ({
				bundle_id: PROOF_BUNDLE_ID,
				condition_bool: true,
				ecological_invariant: false,
				niche_id: `capability:${capabilityId}`,
				place_node_id: PROOF_PLACE_NODE_ID,
				visibility: "Public",
			})),
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-dodge-negative-attack",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "dodge-negative-attack",
			required_capability: PROOF_ATTACK_ACTION_CAPABILITY_ID,
			niche_id: CREATURE_NICHE_TAG,
			display_name: "Dodge actor-scope negative-control attack",
			description:
				"TEST-ONLY unmetered Unarmed Strike predicate proving the dodger's " +
				"Dexterity-save Advantage does not leak onto its own attacks.",
			predicate_source: unarmedStrikeAttackExpr(
				`actor.effective('${PROOF_STR_STATE_ID}')`,
				`actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`,
				`target.effective('${AC_RESOURCE_ID}')`,
			),
			resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
			accepts_global_storm: true,
			cost_time_ms: 0,
			consequence: {},
		},
	},
];
