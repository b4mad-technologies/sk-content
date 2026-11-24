// pattern: bundle-movement-default
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../../flavor/read";
import {
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	withSrdTextNamespace,
} from "../../../text";
import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { MOVEMENT_CHANNEL_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";
import {
	CLIMB_CAPABILITY_ID,
	DIFFICULT_TERRAIN_COST_EXPRESSION,
	DIFFICULT_TERRAIN_STATE_ID,
	FLY_AFFORDANCE_LOCAL_ID,
	FLY_CAPABILITY_ID,
	FLY_OUTCOME_LOCAL_ID,
	flyAffordancePredicate,
	GRID_STEP_AFFORDANCE_LOCAL_ID,
	gridStepAffordancePredicate,
	LONG_RUNNING_MOVE_ROUND_DURATION_MS,
	LONG_RUNNING_MOVE_SESSION_DEF_ID,
	LONG_RUNNING_MOVE_TERMINATION_PRED,
	SPEED_CLIMB_DISPLAY_NAME,
	SPEED_CLIMB_INITIAL,
	SPEED_CLIMB_MAX,
	SPEED_CLIMB_MIN,
	SPEED_CLIMB_RECOVERY_RULE,
	SPEED_CLIMB_RESOURCE_LOCAL_ID,
	SPEED_FLY_DISPLAY_NAME,
	SPEED_FLY_INITIAL,
	SPEED_FLY_MAX,
	SPEED_FLY_MIN,
	SPEED_FLY_RECOVERY_RULE,
	SPEED_FLY_RESOURCE_LOCAL_ID,
	SPEED_SWIM_DISPLAY_NAME,
	SPEED_SWIM_INITIAL,
	SPEED_SWIM_MAX,
	SPEED_SWIM_MIN,
	SPEED_SWIM_RECOVERY_RULE,
	SPEED_SWIM_RESOURCE_LOCAL_ID,
	SPEED_WALK_DISPLAY_NAME,
	SPEED_WALK_INITIAL,
	SPEED_WALK_MAX,
	SPEED_WALK_MIN,
	SPEED_WALK_RECOVERY_RULE,
	SPEED_WALK_RESOURCE_LOCAL_ID,
	STEP_AFFORDANCE_LOCAL_ID,
	STEP_EDGE_BINDINGS_JSON,
	STEP_EDGE_RANGE_M,
	STEP_OUTCOME_LOCAL_ID,
	SWIM_AFFORDANCE_LOCAL_ID,
	SWIM_CAPABILITY_ID,
	SWIM_OUTCOME_LOCAL_ID,
	stepAffordancePredicate,
	swimAffordancePredicate,
	TRAVERSABLE_AIR_NICHE_ID,
	TRAVERSABLE_SQUARE_NICHE_ID,
	TRAVERSABLE_WATER_NICHE_ID,
	WALK_CAPABILITY_ID,
} from "../grid-units";

const GRID_ANCHOR = "playing-the-game.md § Combat > Your Turn > Playing on a Grid (917-929)";

export const SPEED_WALK_RESOURCE_ID = `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}`;
export const STEP_OUTCOME_ID = `${BUNDLE_ID}/${STEP_OUTCOME_LOCAL_ID}`;
export const STEP_AFFORDANCE_ID = `${BUNDLE_ID}/${STEP_AFFORDANCE_LOCAL_ID}`;
/** ADR-0134 D-5: the occupancy-gated grid edge template — see `grid-units.ts`. */
export const GRID_STEP_AFFORDANCE_ID = `${BUNDLE_ID}/${GRID_STEP_AFFORDANCE_LOCAL_ID}`;
export const SPEED_SWIM_RESOURCE_ID = `${BUNDLE_ID}/${SPEED_SWIM_RESOURCE_LOCAL_ID}`;
export const SPEED_FLY_RESOURCE_ID = `${BUNDLE_ID}/${SPEED_FLY_RESOURCE_LOCAL_ID}`;
export const SPEED_CLIMB_RESOURCE_ID = `${BUNDLE_ID}/${SPEED_CLIMB_RESOURCE_LOCAL_ID}`;
export const SWIM_OUTCOME_ID = `${BUNDLE_ID}/${SWIM_OUTCOME_LOCAL_ID}`;
export const FLY_OUTCOME_ID = `${BUNDLE_ID}/${FLY_OUTCOME_LOCAL_ID}`;
export const SWIM_AFFORDANCE_ID = `${BUNDLE_ID}/${SWIM_AFFORDANCE_LOCAL_ID}`;
export const FLY_AFFORDANCE_ID = `${BUNDLE_ID}/${FLY_AFFORDANCE_LOCAL_ID}`;
/**
 * Reusable open-field combat grid for consumers of the standalone `srd`
 * bundle. The 10x10 extent is a named preset, not a kernel default; scenes
 * with terrain, walls, or different geometry author their own blueprint.
 */
export const STANDARD_COMBAT_GRID_ID = `${BUNDLE_ID}/combat-grid/standard-10x10`;
export const STANDARD_COMBAT_GRID_WIDTH = 10;
export const STANDARD_COMBAT_GRID_HEIGHT = 10;
export const STANDARD_COMBAT_GRID_TOPOLOGY = "8";
/** One 5-ft tactical square in metres (playing-the-game.md:919). */
export const STANDARD_COMBAT_GRID_CELL_SIZE_M = 1.5240000486373901;
/**
 * ADR-0134 D-1/D-5: the authored distance metric of the SRD grid. SRD 5.2
 * measures every grid step, straight or diagonal, as 5 ft (playing-the-game.md
 * § Playing on a Grid, "Diagonals"): Chebyshev. With it a diagonal neighbour
 * is exactly one cell (1524 mm) from the actor, so `srd/reach_mm = 1524`
 * (`reach-units.ts`) reaches it, a diagonal step costs one cell of
 * `srd/speed-walk`, and the opportunity-attack range agrees with reach —
 * one metric for reach, movement pricing and reactions instead of the
 * Euclidean 2155 mm diagonal the kernel default measured. A `core/metric/*`
 * id is a `distance_metric_definitions` row core seeds (ADR-0134 D-1); the
 * kernel resolves the row's closed shape and never spells the id.
 */
export const STANDARD_COMBAT_GRID_DISTANCE_METRIC_ID = "core/metric/chebyshev";
/**
 * sk-0m4.123 (parts 1+2): binds `movement_channel` alongside the existing
 * `movement_reach_resource` — `r_move.rs`'s `movement_charge_candidate`
 * (~1566) only charges an edge that carries BOTH bindings. Deliberately
 * scoped to the MINTED tactical-grid edges only, never the ambient
 * `[[movement_defaults]]` step template below (`STEP_EDGE_BINDINGS_JSON`) or
 * the swim/fly bindings: every grid edge is exactly one cell, so its charge
 * (`ceil(1 / effective_speed_cells * pool_ms_per_round)`) always fits inside
 * one round's pool, while an ordinary place edge or a swim/fly crossing can
 * be authored far longer than one round's reach and is meant to PROMOTE into
 * the clock-only `long_running_move` session (`validate_authored_movement_reach`)
 * — `movement_charge_candidate` runs its budget-exhaustion check BEFORE that
 * promotion (same merged bindings, same edge distance), so binding a channel
 * there would refuse any over-reach travel outright instead of promoting it.
 * See `ledger/designs/movement-channel-budget.md`'s own "open follow-up" note.
 */
export const STANDARD_COMBAT_GRID_EDGE_BINDINGS_JSON = JSON.stringify({
	movement_reach_resource: SPEED_WALK_RESOURCE_ID,
	long_running_move_session: LONG_RUNNING_MOVE_SESSION_DEF_ID,
	movement_channel: MOVEMENT_CHANNEL_ID,
});
export { LONG_RUNNING_MOVE_SESSION_DEF_ID } from "../grid-units";

/**
 * Ship the generic SRD walking-edge chain used by both ordinary place edges
 * and the edges a `combat_grid_blueprint` generates — capability, movement-
 * reach resource, and the outcome/affordance template pair. See
 * `grid-units.ts`'s own module header for the full sister-precedent
 * grounding. `srd/niche/traversable-square` stays a deliberately BARE id (no
 * niche_definitions row — matching `core/passable_portal`'s own shape).
 * `srd/capability/walk` is NO LONGER bare: `ledger/designs/prone-free-
 * action.md` Slice B item 4 (operator ruling 2026-08-01) promotes it to a
 * real `capability_definitions` row here. `creature-identity.toml` now grants
 * it from stable `srd.creature` identity; a scene needs no direct universal
 * walk-capability seed.
 *
 * The outcome/affordance pair is authored via `spellkave_write_rows` rather
 * than `spellkave_define_affordance`: that verb requires exactly ONE of
 * `outcome_expression_source`/`manipulation_action_id`, neither of which is
 * the shape a grid edge uses — `core/move_outcome`'s own
 * `movement_descriptor = "move"` field (read by `r_move`'s own edge
 * resolution, not `r_manipulate`) has no verb-level shortcut yet.
 */
export async function buildGridFragment(target?: AuthorTarget): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_capability",
			label: "capability:walk",
			params: {
				bundle: BUNDLE_ID,
				id: "capability/walk",
				display_name: "Walk",
				description:
					"Walking capability the Step edge affordance's predicate gates on for ordinary " +
					"place edges and tactical grid cells " +
					"(actor.has_capability('srd/capability/walk')) — playing-the-game.md § Playing on " +
					"a Grid (917-929). Promoted from a bare id to a real capability_definitions row " +
					"(`ledger/designs/prone-free-action.md` Slice B item 4); stable srd.creature " +
					"identity grants it through creature-identity.toml.",
				actor_kind: "entity",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:speed-walk",
			params: {
				id: SPEED_WALK_RESOURCE_LOCAL_ID,
				display_name: SPEED_WALK_DISPLAY_NAME,
				min_value: SPEED_WALK_MIN,
				max_value: SPEED_WALK_MAX,
				initial_value: SPEED_WALK_INITIAL,
				recovery_rule: SPEED_WALK_RECOVERY_RULE,
				description: readResourceFlavor("speed-walk").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "outcome_templates:step",
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: STEP_OUTCOME_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Step",
						outcome_bool: true,
						movement_descriptor: "move",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "affordance_templates:step",
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: STEP_AFFORDANCE_ID,
						bundle_id: BUNDLE_ID,
						niche_id: TRAVERSABLE_SQUARE_NICHE_ID,
						capability_id: WALK_CAPABILITY_ID,
						display_name: "Step",
						predicate_bool: false,
						predicate_source: stepAffordancePredicate(),
						outcome_template_id: STEP_OUTCOME_ID,
						range_m: STEP_EDGE_RANGE_M,
						accepts_global_storm: false,
						// ADR-0101 D-4: difficult terrain (spatial_environment_state on
						// either incident NODE) multiplies the authored/metric distance
						// this edge charges — DIFFICULT_TERRAIN_COST_EXPRESSION's own
						// header has the full grounding.
						movement_cost_expression_source: DIFFICULT_TERRAIN_COST_EXPRESSION,
					},
				],
			},
		},
		{
			// ADR-0134 D-5: the grid edge template — Step's capability, niche,
			// outcome and cost expression, plus the occupancy clause
			// (`occupants_at('to_node', 'srd/condition/dead') == 0`). Bound by
			// combat_grid_blueprints only; gridStepAffordancePredicate's own
			// header has the grounding and the ambient/grid split.
			toolName: "spellkave_write_rows",
			label: "affordance_templates:grid-step",
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: GRID_STEP_AFFORDANCE_ID,
						bundle_id: BUNDLE_ID,
						niche_id: TRAVERSABLE_SQUARE_NICHE_ID,
						capability_id: WALK_CAPABILITY_ID,
						display_name: "Step (grid)",
						predicate_bool: false,
						predicate_source: gridStepAffordancePredicate(),
						outcome_template_id: STEP_OUTCOME_ID,
						range_m: STEP_EDGE_RANGE_M,
						accepts_global_storm: false,
						movement_cost_expression_source: DIFFICULT_TERRAIN_COST_EXPRESSION,
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "spatial_state_definitions:difficult-terrain",
			params: {
				bundle: BUNDLE_ID,
				kind: "spatial_state_definitions",
				rows: [
					{
						state_id: DIFFICULT_TERRAIN_STATE_ID,
						bundle_id: BUNDLE_ID,
						value_type: "int",
						writer_policy: "world_interaction",
						freshness_rule: "",
						merge_rule: "replace",
						lod_policy: "retain_latest",
						description:
							"Difficult-terrain marker authored on a place_node (ADR-0101 D-4): the Step " +
							"template's movement_cost_expression_source multiplies the crossing cost by " +
							"this value (via the edge's incident-node @from_node/@to_node projection). " +
							"world_interaction writer_policy lets a reducer-driven effect (a spell, a " +
							"hazard) flip this state and change the NEXT traversal's charge with no " +
							"manifest re-apply.",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:swim",
			params: {
				bundle: BUNDLE_ID,
				id: "capability/swim",
				display_name: "Swim",
				description:
					"Swimming capability the Swim edge affordance's predicate gates on " +
					"(actor.has_capability('srd/capability/swim')) — ADR-0101 movement-modes-" +
					"defaults-and-terrain-cost's alternative-mode content (A-3, walk-OR-swim). " +
					"Promoted to a real capability_definitions row, same as srd/capability/walk.",
				actor_kind: "entity",
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:fly",
			params: {
				bundle: BUNDLE_ID,
				id: "capability/fly",
				display_name: "Fly",
				description:
					"Flying capability the Fly edge affordance's predicate gates on " +
					"(actor.has_capability('srd/capability/fly')) — ADR-0101 movement-modes-" +
					"defaults-and-terrain-cost's replace-mode content (A-2, fly-only edges). " +
					"Promoted to a real capability_definitions row, same as srd/capability/walk.",
				actor_kind: "entity",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:speed-climb",
			params: {
				id: SPEED_CLIMB_RESOURCE_LOCAL_ID,
				display_name: SPEED_CLIMB_DISPLAY_NAME,
				min_value: SPEED_CLIMB_MIN,
				max_value: SPEED_CLIMB_MAX,
				initial_value: SPEED_CLIMB_INITIAL,
				recovery_rule: SPEED_CLIMB_RECOVERY_RULE,
				description: readResourceFlavor("speed-climb").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:climb",
			params: {
				bundle: BUNDLE_ID,
				id: "capability/climb",
				display_name: "Climb",
				description:
					"Climbing capability (Thief Second-Story Work). Climb Speed is srd/speed-climb.",
				actor_kind: "entity",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:speed-swim",
			params: {
				id: SPEED_SWIM_RESOURCE_LOCAL_ID,
				display_name: SPEED_SWIM_DISPLAY_NAME,
				min_value: SPEED_SWIM_MIN,
				max_value: SPEED_SWIM_MAX,
				initial_value: SPEED_SWIM_INITIAL,
				recovery_rule: SPEED_SWIM_RECOVERY_RULE,
				description: readResourceFlavor("speed-swim").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:speed-fly",
			params: {
				id: SPEED_FLY_RESOURCE_LOCAL_ID,
				display_name: SPEED_FLY_DISPLAY_NAME,
				min_value: SPEED_FLY_MIN,
				max_value: SPEED_FLY_MAX,
				initial_value: SPEED_FLY_INITIAL,
				recovery_rule: SPEED_FLY_RECOVERY_RULE,
				description: readResourceFlavor("speed-fly").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "outcome_templates:swim",
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: SWIM_OUTCOME_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Swim",
						outcome_bool: true,
						movement_descriptor: "move",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "outcome_templates:fly",
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: FLY_OUTCOME_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Fly",
						outcome_bool: true,
						movement_descriptor: "move",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "affordance_templates:swim",
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: SWIM_AFFORDANCE_ID,
						bundle_id: BUNDLE_ID,
						niche_id: TRAVERSABLE_WATER_NICHE_ID,
						capability_id: SWIM_CAPABILITY_ID,
						display_name: "Swim",
						predicate_bool: false,
						predicate_source: swimAffordancePredicate(),
						outcome_template_id: SWIM_OUTCOME_ID,
						range_m: STEP_EDGE_RANGE_M,
						accepts_global_storm: false,
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "affordance_templates:fly",
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: FLY_AFFORDANCE_ID,
						bundle_id: BUNDLE_ID,
						niche_id: TRAVERSABLE_AIR_NICHE_ID,
						capability_id: FLY_CAPABILITY_ID,
						display_name: "Fly",
						predicate_bool: false,
						predicate_source: flyAffordancePredicate(),
						outcome_template_id: FLY_OUTCOME_ID,
						range_m: STEP_EDGE_RANGE_M,
						accepts_global_storm: false,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_session",
			label: "session:long-running-move",
			params: {
				bundle: BUNDLE_ID,
				id: "long_running_move",
				turn_rule: "Sequential",
				round_duration_ms: LONG_RUNNING_MOVE_ROUND_DURATION_MS,
				termination_pred: LONG_RUNNING_MOVE_TERMINATION_PRED,
				description:
					"Clock-only Sequential travel session for over-reach r_move (sk-0m4.30). " +
					"The kernel names the long_running_move_session BINDING; this row is the " +
					"srd-owned session_definition that binding points at. Empty turn_scheduler_id " +
					"on purpose — a clock, not combat initiative.",
			},
		},
		// Wildcard edge attachment (place_edge_id = 0), mirroring core's
		// core/passable_portal attachment — without this, Step's
		// target.has_niche('srd/niche/traversable-square') is never true on any
		// authored edge and every exit stays blocked_by the step template.
		{
			toolName: "spellkave_write_rows",
			label: "spatial_niche_attachments:traversable-square-all-edges",
			params: {
				bundle: BUNDLE_ID,
				kind: "spatial_niche_attachments",
				rows: [
					{
						bundle_id: BUNDLE_ID,
						niche_id: TRAVERSABLE_SQUARE_NICHE_ID,
						place_edge_id: 0,
						place_node_id: "",
						visibility: "Public",
						condition_bool: true,
						ecological_invariant: false,
						on_entry_action_id: "",
						on_entry_target_entity_key: "",
					},
				],
			},
		},
		{
			// ADR-0101 (A-1): the bundle-scoped default that lets any `srd`-bundle
			// edge walk with ZERO per-edge place_edge_affordance rows — the
			// primitive `spellkave_link_places` docs point authors at instead of
			// the old per-edge Step idiom. Bindings are EXACTLY the two bindings
			// STEP_EDGE_BINDINGS_JSON has always carried (reach resource + travel
			// session) — deliberately still NO movement_channel here (sk-0m4.123
			// parts 1+2 only bind it on the minted tactical-grid edges via
			// STANDARD_COMBAT_GRID_EDGE_BINDINGS_JSON below; see that constant's
			// own comment for why an ambient/over-reach edge must stay unmetered)
			// and no terrain_state binding (the cost expression above names
			// DIFFICULT_TERRAIN_STATE_ID directly, task 0.2).
			toolName: "spellkave_set_movement_default",
			label: "movement-default:step",
			params: {
				bundle: BUNDLE_ID,
				affordance_template_id: STEP_AFFORDANCE_ID,
				bindings_json: STEP_EDGE_BINDINGS_JSON,
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "combat_grid_blueprints:standard-10x10",
			params: {
				bundle: BUNDLE_ID,
				kind: "combat_grid_blueprints",
				rows: [
					{
						blueprint_id: STANDARD_COMBAT_GRID_ID,
						bundle_id: BUNDLE_ID,
						width: STANDARD_COMBAT_GRID_WIDTH,
						height: STANDARD_COMBAT_GRID_HEIGHT,
						topology: STANDARD_COMBAT_GRID_TOPOLOGY,
						cell_size_m: STANDARD_COMBAT_GRID_CELL_SIZE_M,
						// ADR-0134 D-5: Chebyshev — see the constant's own comment.
						distance_metric_id: STANDARD_COMBAT_GRID_DISTANCE_METRIC_ID,
						// ADR-0134 D-5: the occupancy-gated grid template, never
						// the ambient movement default.
						edge_affordance_template_id: GRID_STEP_AFFORDANCE_ID,
						edge_affordance_bindings_json: STANDARD_COMBAT_GRID_EDGE_BINDINGS_JSON,
						edge_overrides_json: "[]",
					},
				],
			},
		},
	];
	const body = await driveUnitScene(
		BUNDLE_ID,
		withSrdTextNamespace([
			...calls,
			srdTextAttachmentWriteCall({
				targetKind: "resource_definition",
				targetRef: SPEED_WALK_RESOURCE_ID,
				extracted: markdownHeadingBlock("playing-the-game.md", "Movement and Position"),
			}),
		]),
		target,
	);
	const units: ChapterUnitSummary[] = [
		{ kind: "capability_definitions", id: WALK_CAPABILITY_ID, sourcePk: "" },
		{ kind: "resource_definitions", id: SPEED_WALK_RESOURCE_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: STEP_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: STEP_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: GRID_STEP_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "spatial_state_definitions", id: DIFFICULT_TERRAIN_STATE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: SWIM_CAPABILITY_ID, sourcePk: "" },
		{
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/${SPEED_CLIMB_RESOURCE_LOCAL_ID}`,
			sourcePk: "",
		},
		{ kind: "capability_definitions", id: CLIMB_CAPABILITY_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: FLY_CAPABILITY_ID, sourcePk: "" },
		{ kind: "resource_definitions", id: SPEED_SWIM_RESOURCE_ID, sourcePk: "" },
		{ kind: "resource_definitions", id: SPEED_FLY_RESOURCE_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: SWIM_OUTCOME_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: FLY_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: SWIM_AFFORDANCE_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: FLY_AFFORDANCE_ID, sourcePk: "" },
		{
			kind: "session_definitions",
			id: LONG_RUNNING_MOVE_SESSION_DEF_ID,
			sourcePk: "",
		},
		{
			kind: "spatial_niche_attachments",
			id: `${TRAVERSABLE_SQUARE_NICHE_ID}@edge:0`,
			sourcePk: "",
		},
		{ kind: "movement_defaults", id: `${BUNDLE_ID}::${STEP_AFFORDANCE_ID}`, sourcePk: "" },
		{ kind: "combat_grid_blueprints", id: STANDARD_COMBAT_GRID_ID, sourcePk: "" },
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/grid.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Generic SRD walking-edge chain, reused by ordinary place edges and tactical",
		"# grids, plus the reusable open 10x10 combat-grid preset:",
		"# srd/capability/walk (a real capability_definitions row, promoted from",
		"# bare — prone-free-action.md Slice B item 4) + srd/speed-walk (movement-",
		"# reach resource) + srd/long_running_move (clock-only travel session the",
		"# long_running_move_session BINDING names) + the Step outcome/",
		"# affordance edge template a combat_grid_blueprint scene binds. srd/niche/",
		"# traversable-square stays a deliberately BARE id (no niche_definitions",
		"# row — see grid-units.ts's own module header for the sister-precedent",
		"# shape). srd/combat-grid/standard-10x10 carries no scene terrain or walls;",
		"# consumers reference it instead of re-authoring the same open grid.",
		"#",
		"# ADR-0101 (movement-defaults-modes-terrain-cost): a bundle-scoped",
		"# [[movement_defaults]] row makes ordinary walking need ZERO per-edge",
		"# place_edge_affordance rows (A-1) — Step now also carries",
		"# movement_cost_expression_source, multiplying the crossing cost by",
		"# srd/state/difficult_terrain read off either incident place_node (D-4).",
		"# srd/capability/{swim,fly} + srd/niche/traversable-{water,air} (BARE, same",
		"# shape as traversable-square, never wildcard-attached) + srd/speed-{swim,fly}",
		"# + the Swim/Fly outcome/affordance template pairs are the first alternative-",
		"# mode traversal vocabulary (A-2 fly-only replace, A-3 walk-OR-swim) —",
		"# content authors bind them to specific edges via spellkave_bind_edge_affordance,",
		"# never universally.",
		"#",
		"# ADR-0134 (authored-grid-distance-metric-and-occupancy-rule) D-5: the",
		"# standard grid names core/metric/chebyshev as its distance_metric_id (every",
		"# step, straight or diagonal, is 5 ft — reach 1524 mm covers a diagonal",
		"# neighbour and a diagonal step costs one cell) and binds srd/affordance/",
		"# grid-step to its edges: Step's gate plus occupants_at('to_node',",
		"# 'srd/condition/dead') == 0 in place of the retired kernel destination-",
		"# occupancy veto (D-3) — a living creature blocks its cell, a corpse does",
		"# not; stricter than SRD 5.2 (allies block too) until a movement-end",
		"# predicate point exists (G-1). The ambient srd/affordance/step (the",
		"# [[movement_defaults]] template) stays clause-free: ambient nodes keep",
		"# free co-location.",
		"#",
		"# sk-0m4.123 (parts 1+2): the standard grid's edge bindings also carry",
		"# movement_channel = srd/economy_channel/movement (r_move.rs charges an",
		"# edge only when BOTH movement_channel and movement_reach_resource are",
		"# bound), so a tactical-grid step debits the actor's per-turn movement",
		"# budget. The ambient [[movement_defaults]] step template and the swim/",
		"# fly bindings deliberately stay unmetered — an ordinary place edge or a",
		"# swim/fly crossing can be authored longer than one round's reach and is",
		"# meant to PROMOTE into the long_running_move session; the pre-admission",
		"# budget check runs on the full edge distance BEFORE that promotion, so",
		"# metering an over-reach edge would refuse ordinary travel outright.",
		"",
		`# anchor: ${GRID_ANCHOR}`,
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
