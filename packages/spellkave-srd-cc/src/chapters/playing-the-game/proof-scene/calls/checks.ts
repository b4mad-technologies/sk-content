import type { VerbCall } from "../../../verb-runner";
import { AC_RESOURCE_ID } from "../../armor-class-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../../cover-units";
import { CREATURE_NICHE_TAG } from "../../creature-type-units";
import {
	LONG_RUNNING_MOVE_SESSION_BINDING,
	LONG_RUNNING_MOVE_SESSION_DEF_ID,
} from "../../grid-units";
import { BUNDLE_ID } from "../../index";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../../reach-units";
import { DEX_SAVE_RESOLUTION_SCOPE_ID } from "../../resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG, ROLL_BIAS_DISADVANTAGE_TAG } from "../../tag-value-vocabulary";
import {
	ALL_CHECKS,
	PROOF_ADVANTAGE_DUMMY_SPAWN_KEY_PREFIX,
	PROOF_ATTACK_ROLL_AC,
	PROOF_BUNDLE_ID,
	PROOF_COVER_DUMMY_SPAWN_KEY_PREFIX,
	PROOF_DC_ATHLETICS_STATE_ID,
	PROOF_DC_INSIGHT_STATE_ID,
	PROOF_DC_PERCEPTION_STATE_ID,
	PROOF_DC_WIS_STATE_ID,
	PROOF_DUMMY_CREATURE_TYPE_TAG,
	PROOF_DUMMY_DEF_ID,
	PROOF_DUMMY_DEF_LOCAL_ID,
	PROOF_DUMMY_SPAWN_KEY_PREFIX,
	PROOF_DUMMY_WIS_VALUE,
	PROOF_FALSE_MODIFIER_CONDITION_ID,
	PROOF_FALSE_MODIFIER_SCOPE_ID,
	PROOF_FAR_EDGE_ID,
	PROOF_FAR_RETURN_EDGE_ID,
	PROOF_FLEXED_STATE_ID,
	PROOF_GENERIC_CONTESTED_DC,
	PROOF_GENERIC_EASY_DC,
	PROOF_LEVEL_STATE_ID,
	PROOF_LEVEL_VALUE,
	PROOF_MOVEMENT_REACH,
	PROOF_MOVEMENT_REACH_STATE_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_PRESSURE_PLATE_DC,
	PROOF_PRESSURE_PLATE_DEF_ID,
	PROOF_PRESSURE_PLATE_DEF_LOCAL_ID,
	PROOF_PRESSURE_PLATE_EDGE_ID,
	PROOF_PRESSURE_PLATE_NODE_ID,
	PROOF_PRESSURE_PLATE_RETURN_EDGE_ID,
	PROOF_PRESSURE_PLATE_SPAWN_KEY_PREFIX,
	PROOF_REACTION_EDGE_ID,
	PROOF_REACTION_RETURN_EDGE_ID,
	PROOF_SAVE_DC_STATE_ID,
	PROOF_SKILL_PROFICIENT_DC,
	PROOF_SKILL_UNPROFICIENT_DC,
	PROOF_TRAVERSAL_AFFORDANCE_ID,
	PROOF_TRAVERSAL_CAPABILITY_ID,
	PROOF_TRAVERSAL_NICHE_ID,
	PROOF_TRAVERSAL_OUTCOME_ID,
	PROOF_WIS_STATE_ID,
	PROOF_ZERO_REACH_CONDITION_ID,
} from "..";

export const CHECK_DEFINITION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_resource",
		label: "proof-flexed-counter",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "flexed",
			display_name: "Flexed (proof counter)",
			value_kind: "int",
			min_value: 0,
			max_value: 1000000,
			initial_value: 0,
			recovery_rule: "persistent",
			description:
				"TEST-ONLY act-path observable for the slice-1b modifier proof: incremented " +
				"by +1 on every ADMITTED flex act (both consequences write it; only the " +
				"STR-gated predicate ever admits). Asserted relatively, never absolutely.",
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-modifier-targets",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "modifier_target_definitions",
			rows: [
				{
					target_id: PROOF_FALSE_MODIFIER_SCOPE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					shape: "Numeric",
					display_name: "False-predicate roll scope (proof)",
				},
				{
					target_id: PROOF_MOVEMENT_REACH_STATE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					shape: "Numeric",
					display_name: "Movement reach (proof)",
				},
			],
		},
	},
	{
		toolName: "spellkave_define_resource",
		label: "proof-save-dc",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "save_dc",
			display_name: "Pressure-plate save DC (proof)",
			value_kind: "int",
			min_value: 0,
			max_value: 30,
			initial_value: PROOF_PRESSURE_PLATE_DC,
			recovery_rule: "persistent",
			description:
				"TEST-ONLY effect-owned DC for the source-backed Fire-Casting Statue pressure " +
				`plate (${PROOF_PRESSURE_PLATE_DC}; cache/markdown/gameplay-toolbox.md:593-600). ` +
				"The pressure-plate entity is its only carrier; creature ability, level, save " +
				"proficiency, and HP remain creature-owned.",
		},
	},
	{
		toolName: "spellkave_define_resource",
		label: "proof-movement-reach",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "movement_reach",
			display_name: "Movement reach (proof)",
			value_kind: "int",
			min_value: 0,
			max_value: PROOF_MOVEMENT_REACH,
			initial_value: PROOF_MOVEMENT_REACH,
			recovery_rule: "persistent",
			description:
				"TEST-ONLY actor-owned reach budget required by r_move's traversal-affordance " +
				"binding. Generous bounds keep the two-edge reset loop re-runnable.",
		},
	},
	{
		toolName: "spellkave_define_capability",
		label: "proof-dex-save-proficiency",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "save-proficiency/dex",
			display_name: "Dexterity Saving Throw Proficiency (proof)",
			actor_kind: "entity",
			description:
				"TEST-ONLY creature-owned proficiency identity used to prove the generic " +
				"d20TestExpr capability gate. Class-authored proficiency grants are outside " +
				"this chapter slice.",
		},
	},
	{
		toolName: "spellkave_define_capability",
		label: "proof-edge-traversal-capability",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "move/proof-edge",
			display_name: "Traverse proof-scene edge",
			actor_kind: "entity",
			description:
				"TEST-ONLY movement eligibility for the two directed proof-scene edges. It " +
				"does not dispatch the pressure-plate effect.",
		},
	},
	{
		toolName: "spellkave_define_niche",
		label: "proof-open-edge-niche",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "edge/open",
			display_name: "Open proof-scene edge",
			description:
				"TEST-ONLY traversal niche for the two open directed edges. The edge affordance " +
				"is only a movement gate; destination-node attachments own entry dispatch.",
			attachments: [{ edge: 0 }],
		},
	},
	{
		toolName: "spellkave_define_condition",
		label: "proof-advantage-condition",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "advantage_condition",
			display_name: "TEST-ONLY: Advantage (finding #23 live proof)",
			gate_predicate_source: "1 == 1",
			description:
				"TEST-ONLY condition for the finding #23 Advantage live proof — unconditionally " +
				"active once landed on a target; grants Advantage on the ResolutionCheck axis via " +
				"its own modifier_templates row.",
			// Self-sufficiency (AGENTS.md, ledger/archive/general-decisions.md's 2026-07-28 operator
			// ruling): REFERENCES this bundle's OWN srd/stacking/single +
			// srd/remove_policy/independent_lifetime vocabulary (authored by the
			// base bundle's own Cover-conditions fragment, `index.ts`'s
			// `buildCoverConditionsFragment`) — a cross-bundle string reference
			// with no FK validation (same "cross-bundle vocabulary" posture
			// `authoring-verbs.ts`'s own `remove_time_policy`/`stacking_rule` doc
			// comments name), NEVER `spellkave_define_condition`'s own hardcoded
			// `core/remove_policy/independent_lifetime`/`core/stacking/single`
			// defaults. Never re-declared here: the base bundle's own manifest
			// apply (this test's own PROVE RECIPE, `just seed packages/
			// spellkave-srd-cc/fixtures`) always lands BEFORE this proof scene's.
			remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
			stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			modifiers: [
				{
					id: "advantage_modifier",
					display_name: "TEST-ONLY: Advantage on the resolution check",
					applies_to: "ResolutionCheck",
					// Never evaluated for delta_kind="Advantage" (`decode_modifier_delta`,
					// `condition_definition.rs`, maps Advantage/Disadvantage straight to
					// the typed delta, no expression eval) — but authoring-time parsing
					// still requires a well-formed expression here. `parse_outcome`
					// (crates/spellkave-dsl) rejects a bare int literal/arithmetic root
					// at Outcome-kind ("expected comparison operator" — confirmed live,
					// this is why the sister's own dead Poisoned/Blinded rows in this
					// field are `let`-wrapped, not bare) — a trivial self-contained
					// `let`-binding satisfies the grammar with no external table refs.
					modifier_expression_source: "let unused = 0; unused",
					delta_kind: "Advantage",
					tags: [ROLL_BIAS_ADVANTAGE_TAG],
				},
			],
		},
	},
	{
		toolName: "spellkave_define_condition",
		label: "proof-false-modifier-condition",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_FALSE_MODIFIER_CONDITION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			display_name: "TEST-ONLY: false-predicate Disadvantage",
			gate_predicate_source: "1 == 1",
			description:
				"Finding #76 regression carrier: the condition is active, but its modifier predicate is false and must prevent composition.",
			remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
			stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			modifiers: [
				{
					id: "false-modifier-disadvantage",
					display_name: "TEST-ONLY: gated-off Disadvantage",
					applies_to: PROOF_FALSE_MODIFIER_SCOPE_ID,
					predicate_source: "1 == 0",
					modifier_expression_source: "let unused = 0; unused",
					delta_kind: "Disadvantage",
					tags: [ROLL_BIAS_DISADVANTAGE_TAG],
				},
			],
		},
	},
	{
		toolName: "spellkave_define_condition",
		label: "proof-zero-reach-condition",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_ZERO_REACH_CONDITION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			display_name: "TEST-ONLY: zero movement reach",
			gate_predicate_source: "1 == 1",
			description:
				"Finding #90 regression carrier: FlatSet(0) must replace the movement resource's base value before r_move checks reach.",
			remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
			stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			modifiers: [
				{
					id: "zero-reach",
					display_name: "TEST-ONLY: movement reach 0",
					applies_to: PROOF_MOVEMENT_REACH_STATE_ID,
					modifier_expression_source: "let zero = 0; zero",
					delta_kind: "FlatSet",
				},
			],
		},
	},
	...ALL_CHECKS.map(
		(check): VerbCall => ({
			toolName: "spellkave_define_capability",
			label: `proof-capability-${check.slug}`,
			params: {
				bundle: PROOF_BUNDLE_ID,
				id: `check/${check.slug}`,
				display_name: check.displayName,
				actor_kind: "entity",
				description: check.capabilityDescription,
			},
		}),
	),
];

export const CHECK_ACTION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_affordance",
		label: "proof-open-edge-affordance",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "edge/open",
			niche_id: PROOF_TRAVERSAL_NICHE_ID,
			capability_id: PROOF_TRAVERSAL_CAPABILITY_ID,
			display_name: "Traverse open proof-scene edge",
			predicate_source:
				`actor.has_capability('${PROOF_TRAVERSAL_CAPABILITY_ID}') && ` +
				`target.has_niche('${PROOF_TRAVERSAL_NICHE_ID}')`,
			outcome_expression_source: "1 == 1",
		},
	},
	{
		// No typed authoring verb currently exposes outcome_templates.movement_descriptor.
		// Refine the typed affordance's generated outcome into the canonical no-op
		// movement outcome shape before attaching it to either edge.
		toolName: "spellkave_write_rows",
		label: "proof-open-edge-movement-outcome",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "outcome_templates",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					outcome_template_id: PROOF_TRAVERSAL_OUTCOME_ID,
					display_name: "Traverse open proof-scene edge",
					outcome_bool: true,
					movement_descriptor: "move",
					consequence_template_id: "",
					sense_visibility: "local",
				},
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-open-edge-affordance-attachments",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "place_edge_affordance",
			rows: [
				{
					edge_key: PROOF_PRESSURE_PLATE_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
				{
					edge_key: PROOF_PRESSURE_PLATE_RETURN_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
				{
					edge_key: PROOF_REACTION_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
				{
					edge_key: PROOF_REACTION_RETURN_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
				{
					edge_key: PROOF_FAR_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
				{
					edge_key: PROOF_FAR_RETURN_EDGE_ID,
					affordance_template_id: PROOF_TRAVERSAL_AFFORDANCE_ID,
					bindings_json: JSON.stringify({
						movement_reach_resource: PROOF_MOVEMENT_REACH_STATE_ID,
						[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
					}),
				},
			],
		},
	},
	...ALL_CHECKS.flatMap((check): VerbCall[] =>
		check.failureFrameWrite === undefined
			? []
			: [
					{
						toolName: "spellkave_define_consequence",
						label: `proof-check-${check.slug}-failure`,
						params: {
							bundle: PROOF_BUNDLE_ID,
							id: `${check.slug}/failure`,
							frame_writes: [check.failureFrameWrite],
						},
					},
				],
	),
	...ALL_CHECKS.map(
		(check): VerbCall => ({
			toolName: "spellkave_write_rows",
			label: `proof-niche-${check.slug}`,
			params: {
				bundle: PROOF_BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: `capability:${check.capabilityId}`,
						bundle_id: PROOF_BUNDLE_ID,
						display_name: `${check.displayName} (proof, place-provided)`,
						description:
							"WA-CAP-002 (sk-0m4.69): capability:* niches require an explicit provider. " +
							"Proof-scene checks remain place-attached at the identity node.",
						predicate_source: "",
						provider: "place",
					},
				],
			},
		}),
	),
	...ALL_CHECKS.map(
		(check): VerbCall => ({
			toolName: "spellkave_define_action_verb",
			label: `proof-check-${check.slug}`,
			params: {
				bundle: PROOF_BUNDLE_ID,
				id: check.slug,
				required_capability: check.capabilityId,
				niche_id: `capability:${check.capabilityId}`,
				display_name: check.displayName,
				predicate_source: check.predicate,
				// Generic path (CheckSpec.resolutionScope, checks.ts's own doc
				// comment): read regardless of Stochastic mode — r_manipulate's
				// roll_bias::resolve reads action_definitions.resolution_scope
				// unconditionally. pressure-plate-save keeps its own hardcoded
				// special case below, untouched.
				...(check.resolutionScope === undefined ? {} : { resolution_scope: check.resolutionScope }),
				...(check.resolutionPredicateSource === undefined
					? {}
					: {
							resolution_mode: "Stochastic",
							resolution_predicate_source: check.resolutionPredicateSource,
							...(check.slug === "pressure-plate-save"
								? { resolution_scope: DEX_SAVE_RESOLUTION_SCOPE_ID }
								: {}),
							on_failure: `${PROOF_BUNDLE_ID}/${check.slug}/failure`,
						}),
				accepts_global_storm: check.acceptsGlobalStorm ?? false,
				// ledger/archive/general-decisions.md "Decisions": check-shaped actions cost 0.
				cost_time_ms: 0,
				consequence: {
					frame_writes: [
						check.successFrameWrite ?? {
							ModifyResource: {
								actor: check.frameWriteActor ?? "TargetActor",
								delta_source: check.frameWriteDeltaSource ?? "1",
								resource: check.frameWriteResource ?? PROOF_FLEXED_STATE_ID,
							},
						},
						...(check.additionalFrameWrites ?? []),
					],
				},
			},
		}),
	),
	...ALL_CHECKS.map(
		(check): VerbCall => ({
			toolName: "spellkave_write_rows",
			label: `proof-niche-attachment-${check.slug}`,
			params: {
				bundle: PROOF_BUNDLE_ID,
				kind: "spatial_niche_attachments",
				rows: [
					{
						bundle_id: PROOF_BUNDLE_ID,
						condition_bool: true,
						ecological_invariant: false,
						niche_id: `capability:${check.capabilityId}`,
						place_node_id: check.placeNodeId ?? PROOF_PLACE_NODE_ID,
						visibility: "Public",
						...(check.onEntryTargetEntityKey === undefined
							? {}
							: {
									on_entry_action_id: `${PROOF_BUNDLE_ID}/${check.slug}`,
									on_entry_target_entity_key: check.onEntryTargetEntityKey,
								}),
					},
				],
			},
		}),
	),
	{
		toolName: "spellkave_write_rows",
		label: "proof-generic-check-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					condition_bool: true,
					ecological_invariant: false,
					niche_id: CREATURE_NICHE_TAG,
					place_node_id: PROOF_PLACE_NODE_ID,
					visibility: "Public",
				},
			],
		},
	},
];

export const CHECK_TARGET_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-dummy-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_DUMMY_DEF_LOCAL_ID,
			display_name: "Training Dummy",
			description:
				"TEST-ONLY inert target for the slice-1b modifier-proof affordances — the " +
				"flex actions are not self_eligible, so the pair needs a co-located target; " +
				"carries the flexed counter the admitted act increments, (generic-check verb " +
				"rework) the four DC-override states the " +
				"Athletics-easy/WIS-contested/Perception-proficient/Insight-unproficient checks " +
				"read, and (Equipment slice E1, F2 closure) its own seeded srd/ac — the unarmored " +
				"formula's no-Dexterity branch, since this entity carries no srd/dex (finding " +
				"finding #35: attack-roll/attack-roll-cover both now read target.effective('srd/ac'), " +
				"so their target must carry the fact) — see the proof-scene design record for why " +
				"seeding these here is harmless to every other check in this scene (none of them " +
				"reads srd/dc/*, srd/int, or srd/ac).",
			// Slice 3.1 (the proof-scene design record): the creature umbrella +
			// this entity's own honest SRD creature type — the generic-check
			// verbs' shared niche_id reads off this tag on the PERCEIVE/target-
			// niche side; the ONE shared spatial_niche_attachments row (below)
			// is what actually satisfies the ACT path's attachment_presence gate.
			tags: [CREATURE_NICHE_TAG, PROOF_DUMMY_CREATURE_TYPE_TAG],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: PROOF_FLEXED_STATE_ID, value_int: 0 },
				// Generic-check verb rework: Athletics-easy (tier-1 override wins
				// outright, SAME total modifier as the torn-down d20-easy).
				{ state: PROOF_DC_ATHLETICS_STATE_ID, value_int: PROOF_GENERIC_EASY_DC },
				// WIS raw-ability contested check — genuinely mid/stochastic.
				{ state: PROOF_DC_WIS_STATE_ID, value_int: PROOF_GENERIC_CONTESTED_DC },
				// Skill-proficiency PB-inclusive/exclusive boundary pair (torn-down
				// skill-proficient/skill-unproficient-control's own numbers).
				{ state: PROOF_DC_PERCEPTION_STATE_ID, value_int: PROOF_SKILL_PROFICIENT_DC },
				{ state: PROOF_DC_INSIGHT_STATE_ID, value_int: PROOF_SKILL_UNPROFICIENT_DC },
				// Equipment slice E1, F2 closure: the attack-roll/attack-roll-cover
				// checks' shared target fact — see PROOF_ATTACK_ROLL_AC's own doc
				// comment for the unarmored-formula derivation.
				{ state: AC_RESOURCE_ID, value_int: PROOF_ATTACK_ROLL_AC },
				// C5 (Passive Perception): the stealth-vs-passive-perception
				// check's dcExpr (`passivePerceptionExpr('target')`) reads the
				// TARGET's wis (and, inside the proficiency cond, level) —
				// finding #35's rule: a predicate reading target facts declares
				// its seed precondition. WIS is deliberately LOW
				// (PROOF_DUMMY_WIS_VALUE = 2 -> modifier -4 -> Passive
				// Perception 6): the HERO is the acting entity (Dex 14 -> +2,
				// Stealth proficiency -> +3, total +5, guaranteed-success
				// floor 6) — see checks.ts's own C5 header for why the target
				// is the unclaimed DUMMY and the actor the hero (finding
				// finding #84: claim contention on both other pairings). The
				// dummy carries NO Perception proficiency, so the dcExpr's
				// has_capability branch resolves false live; the PB branch
				// itself is pinned offline (derived-units.test.ts) and reuses
				// the equipment-proficiencies idiom proven live elsewhere.
				{ state: PROOF_WIS_STATE_ID, value_int: PROOF_DUMMY_WIS_VALUE },
				{ state: PROOF_LEVEL_STATE_ID, value_int: PROOF_LEVEL_VALUE },
			],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-pressure-plate-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_PRESSURE_PLATE_DEF_LOCAL_ID,
			display_name: "Fire-Casting Statue Pressure Plate",
			description:
				"TEST-ONLY source-backed pressure plate. Its sole initial state is the effect's " +
				"DC; the entering creature owns every Saving Throw input and affected resource.",
			initial_states: [{ state: PROOF_SAVE_DC_STATE_ID, value_int: PROOF_PRESSURE_PLATE_DC }],
		},
	},
	{
		toolName: "spellkave_place_entity",
		label: "proof-pressure-plate-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "item",
			entity_def: PROOF_PRESSURE_PLATE_DEF_ID,
			at: PROOF_PRESSURE_PLATE_NODE_ID,
			key_prefix: PROOF_PRESSURE_PLATE_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY pressure plate target for automatic Saving Throw resolution.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-dummy-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_DUMMY_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_DUMMY_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned training dummy for the modifier-proof pair.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-advantage-dummy-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_DUMMY_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_ADVANTAGE_DUMMY_SPAWN_KEY_PREFIX,
			description:
				"TEST-ONLY spawned training dummy, dedicated to the Advantage extension's " +
				"grant/check pair (finding #23 live proof) — isolated from every other check's " +
				"shared dummy so the permanent condition it carries cannot bias unrelated checks.",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-cover-dummy-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_DUMMY_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_COVER_DUMMY_SPAWN_KEY_PREFIX,
			description:
				"TEST-ONLY spawned training dummy, dedicated to the Cover extension's " +
				"cover-grant/attack-roll-cover pair (maxim-audit F1 live proof) — isolated from " +
				"every other check's dummy so the permanent srd/cover/half condition it carries " +
				"cannot bias unrelated checks.",
		},
	},
];
