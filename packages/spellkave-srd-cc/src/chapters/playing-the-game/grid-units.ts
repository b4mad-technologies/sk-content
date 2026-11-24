// Combat-arena proof, Slice A (`ledger/designs/combat-arena-proof.md`):
// the GENERIC SRD walking-edge vocabulary used by ordinary authored place
// edges as well as combat_grid_blueprint scenes — a walk capability, a
// traversable-square niche, and the edge-affordance chain (outcome +
// affordance template) a scene or blueprint binds. `playing-on-a-grid-units.ts`
// already reconciles the SQUARE-MATH sidebar (cell size, entry cost,
// diagonal rule) against the substrate's own `combat_grid_blueprints`/
// `movement_cost_cells` mechanism — this module is the missing PIECE that
// reconciliation named but never authored: the srd-own capability/niche/
// outcome/affordance chain a blueprint's `edge_affordance_bindings_json`
// actually points at (self-sufficiency — the sister's own equivalent,
// `core/walk`/`core/passable_portal`/`core/walk_edge`, is `core/*` and
// therefore off-limits here).
//
// SOURCE: Playing on a Grid sidebar (cache/markdown/playing-the-game.md:
// 917-929) — "Squares. Each square represents 5 feet." / "Speed. ... divide
// it by 5. For example, a Speed of 30 feet translates into 6 squares."
//
// SISTER PRECEDENT (AGENTS.md "question, never copy" — grounded, then
// diverged where self-sufficiency requires it): `world-fixtures/core/base/
// affordances.toml`'s `core/walk_edge`/`core/affordance/traverse_open_portal`
// rows (both identical predicates: `actor.has_capability("core/walk") &&
// target.has_niche("core/passable_portal")`, `range_m = 0.0`) and
// `core/base/spatial_niches.toml`'s bare `core/passable_portal`
// `spatial_niche_attachments` row — grepped directly, confirmed NEITHER
// `core/walk` (capability_definitions) NOR `core/passable_portal`
// (niche_definitions) has a DEFINITION row anywhere in `world-fixtures/`:
// both are bare, UNDEFINED ids referenced only as strings (capability grant
// / affordance predicate / spatial attachment). This is intentional, not an
// omission — `crates/spellkave-validate/src/refs.rs` has no existence check
// for either `affordance_templates.capability_id` or `.niche_id` (only
// MF-VAL-266's DUPLICATE-id scan touches `capability_definitions.capability_id`
// at all), and `server/src/world_interaction/target_niches.rs`'s
// `derive_entity_target_niches_from_parts` treats a niche as reachable purely
// via `spatial_niche_attachments`/tag membership, no `niche_definitions` row
// required. This module originally followed the SAME bare-id shape for both
// `srd/capability/walk` and `srd/niche/traversable-square` — `srd/niche/
// traversable-square` STILL does (attached via `spatial_niche_attachments`
// on a scene's own grid edges, no `niche_definitions` row authored HERE).
// `srd/capability/walk` was PROMOTED to a real `capability_definitions` row
// (`fragments/grid.ts`) — see the `WALK_CAPABILITY_ID` export's own comment
// below for the full grounding.
//
// `srd/speed-walk` (the movement-reach resource a blueprint's
// `edge_affordance_bindings_json = {"movement_reach_resource":"srd/speed-walk"}`
// binding names, `r_move.rs`'s `resolve_actor_movement_reach_cells`) IS a real,
// defined `resource_definitions` row (unlike the capability/niche pair above)
// — a numeric fact needs identity + bounds. Sister precedent:
// `world-fixtures/srd/base/resources.toml` ships the SAME id with
// `initial_value = 6` (30 ft / 5 = 6 cells, matching the sidebar's own worked
// example) as a CELL COUNT authored at RENDER time (feet→cells happens once,
// not per-move — `playing-on-a-grid-units.ts`'s own module header). Bounds
// adopted identically (min 0, max 120, `recovery_rule = "persistent"`) — same
// "generous safety-bound ceiling, not a per-creature cap" reasoning
// `hp-units.ts`'s module header already establishes for `srd/hp`'s own
// 999-ceiling choice, scaled to a plausible max Speed-in-cells instead.
//
// CAPABILITY PROMOTION (`ledger/designs/prone-free-action.md` Slice B item 4,
// operator ruling 2026-08-01): `srd/capability/walk` is NO LONGER bare —
// `fragments/grid.ts` now authors a real `capability_definitions` row for it
// (display_name/description, discovery-visible). Stable `srd.creature`
// identity grants it through `creature-identity.toml`, replacing both
// definition-level and per-instance scene copies. `srd/niche/traversable-square` stays BARE: niches
// are attached via `spatial_niche_attachments`, never `initial_capabilities`,
// so MF-VAL-254's definition-level check never applied to it and there is
// nothing to promote.

import { DEAD_LOCAL_ID } from "./conditions-units";
import { BUNDLE_ID } from "./constants";

export const WALK_CAPABILITY_ID = "srd/capability/walk";
export const TRAVERSABLE_SQUARE_NICHE_ID = "srd/niche/traversable-square";
/**
 * ADR-0134 D-5: the condition that makes an occupant NOT block its cell.
 * `occupants_at('to_node', <this>)` on the grid-step predicate counts every
 * other actor seated on the destination that does not carry it, so a corpse
 * is an object whose space can be entered (playing-the-game.md § Moving
 * around Other Creatures) while any living creature blocks the step. The
 * kernel only compares the id (ADR-0134 D-4) — "dead" is content, never Rust.
 */
export const STEP_BLOCKING_EXCLUDED_CONDITION_ID = `srd/${DEAD_LOCAL_ID}`;
export const STEP_OUTCOME_LOCAL_ID = "outcome/step";
export const STEP_AFFORDANCE_LOCAL_ID = "affordance/step";
/**
 * ADR-0134 D-5: the traversal template a `combat_grid_blueprint` binds to
 * its minted edges — `srd/affordance/step` plus the occupancy clause. Kept
 * as its own row because the blueprint's `edge_affordance_template_id` is
 * the one place that names "this edge is a grid edge": the clause must
 * never ride the bundle-wide `movement_defaults` template every ambient
 * place edge inherits (ADR-0101 A-1), or a DM could no longer step onto a
 * candidate's station and a hero could not enter a room where the
 * innkeeper stands (caught live at chapter 0.1 of the elven-mini record).
 */
export const GRID_STEP_AFFORDANCE_LOCAL_ID = "affordance/grid-step";
export const STEP_EDGE_RANGE_M = 0;

export const SPEED_WALK_RESOURCE_LOCAL_ID = "speed-walk";
export const SPEED_WALK_DISPLAY_NAME = "Walking Speed";
export const SPEED_WALK_MIN = 0;
export const SPEED_WALK_MAX = 120;
/** 30 ft / 5 = 6 cells (cache/markdown/playing-the-game.md:923's own worked example). */
export const SPEED_WALK_INITIAL = 6;
export const SPEED_WALK_RECOVERY_RULE = "persistent";

/**
 * Canonical `modifier_target_definitions` row for `srd/speed-walk`, shared
 * by every rule that plants a Plus/Replacement modifier on it (Unarmored
 * Movement, Mastery Slow, speed-buff spells, area hazards) — call this
 * instead of re-declaring the row inline so the content stays identical
 * everywhere (same pattern as `resolutionScopeModifierTargetRow`/
 * `acModifierTargetRow`; sk-jay0.7.174.12: the four inline copies had
 * drifted apart on `description`).
 */
export function speedWalkModifierTargetRow(): Record<string, unknown> {
	return {
		target_id: `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}`,
		bundle_id: BUNDLE_ID,
		shape: "Numeric",
		display_name: SPEED_WALK_DISPLAY_NAME,
		description:
			"Shared srd/speed-walk modifier axis — additive and replacement composition for " +
			"Unarmored Movement, Mastery Slow, speed-buff spells, and area hazards.",
	};
}

/**
 * ADR-0101 (movement-defaults-modes-terrain-cost, task 6.1): swim/fly are the
 * FIRST alternative-mode traversal vocabulary in this bundle — mirroring
 * `WALK_CAPABILITY_ID`/`TRAVERSABLE_SQUARE_NICHE_ID`/`SPEED_WALK_*`/
 * `STEP_*` above 1:1 (capability + BARE niche id + reach resource +
 * outcome/affordance template pair each). Both capabilities are promoted to
 * real `capability_definitions` rows (same reasoning as `srd/capability/walk`'s
 * own promotion, `fragments/grid.ts`'s module header) since they gate a
 * predicate the same way. `srd/niche/traversable-water` / `-air` stay BARE
 * (no `niche_definitions` row) exactly like `traversable-square` — the
 * kernel synthesizes `target.has_niche(template.niche_id)` as always-true
 * for whichever template a `place_edge_affordance`/`movement_default` row
 * attaches (`traversal_affordance_facts_from_inputs`,
 * `server/src/world_interaction/layer2/r_move.rs`), so a template bound
 * directly to one edge never needs a separate `spatial_niche_attachments`
 * row — unlike `traversable-square`, water/air get NO wildcard
 * `place_edge_id = 0` attachment either: swim/fly must stay exceptional
 * (only where a content author explicitly binds the template to an edge),
 * never universal.
 */
export const SWIM_CAPABILITY_ID = "srd/capability/swim";
export const FLY_CAPABILITY_ID = "srd/capability/fly";
export const TRAVERSABLE_WATER_NICHE_ID = "srd/niche/traversable-water";
export const TRAVERSABLE_AIR_NICHE_ID = "srd/niche/traversable-air";
export const SWIM_OUTCOME_LOCAL_ID = "outcome/swim";
export const FLY_OUTCOME_LOCAL_ID = "outcome/fly";
export const SWIM_AFFORDANCE_LOCAL_ID = "affordance/swim";
export const FLY_AFFORDANCE_LOCAL_ID = "affordance/fly";

export const SPEED_SWIM_RESOURCE_LOCAL_ID = "speed-swim";
export const SPEED_SWIM_DISPLAY_NAME = "Swimming Speed";
export const SPEED_FLY_RESOURCE_LOCAL_ID = "speed-fly";
export const SPEED_FLY_DISPLAY_NAME = "Flying Speed";
export const SPEED_CLIMB_RESOURCE_LOCAL_ID = "speed-climb";
export const SPEED_CLIMB_DISPLAY_NAME = "Climbing Speed";
export const CLIMB_CAPABILITY_ID = "srd/capability/climb";
/**
 * Same bounds/recovery as `SPEED_WALK_*` (0..120, persistent) and the SAME
 * 6-cell baseline (30 ft / 5) — a content-design placeholder shared with
 * walk rather than an invented number; a creature that grants an actual
 * swim/fly Speed different from its walking Speed is future authoring, not
 * a kernel or vocabulary concern this slice settles.
 */
export const SPEED_SWIM_MIN = SPEED_WALK_MIN;
export const SPEED_SWIM_MAX = SPEED_WALK_MAX;
export const SPEED_SWIM_INITIAL = SPEED_WALK_INITIAL;
export const SPEED_SWIM_RECOVERY_RULE = SPEED_WALK_RECOVERY_RULE;
export const SPEED_FLY_MIN = SPEED_WALK_MIN;
export const SPEED_FLY_MAX = SPEED_WALK_MAX;
export const SPEED_FLY_INITIAL = SPEED_WALK_INITIAL;
export const SPEED_FLY_RECOVERY_RULE = SPEED_WALK_RECOVERY_RULE;
export const SPEED_CLIMB_MIN = SPEED_WALK_MIN;
export const SPEED_CLIMB_MAX = SPEED_WALK_MAX;
export const SPEED_CLIMB_INITIAL = 0; // climb is granted, not baseline
export const SPEED_CLIMB_RECOVERY_RULE = SPEED_WALK_RECOVERY_RULE;

/** Build the swim/fly edge-affordance predicates — same shape as `stepAffordancePredicate`. */
export function swimAffordancePredicate(): string {
	return `actor.has_capability('${SWIM_CAPABILITY_ID}') && target.has_niche('${TRAVERSABLE_WATER_NICHE_ID}')`;
}
export function flyAffordancePredicate(): string {
	return `actor.has_capability('${FLY_CAPABILITY_ID}') && target.has_niche('${TRAVERSABLE_AIR_NICHE_ID}')`;
}

/**
 * ADR-0101 D-4 content shape: difficult terrain lives on the NODE
 * (`spatial_environment_state`), read by the Step template's
 * `movement_cost_expression_source` via the `@from_node`/`@to_node` fact
 * suffixes `r_move`'s node projection materialises (design.md D-4). Task 0.2
 * (2026-08-17) resolved that a cost expression cannot interpolate
 * `$bindings.<name>` (`crates/spellkave-dsl/src/eval.rs:780,798` match
 * `field_id` literally) — so the expression below names this state id
 * DIRECTLY rather than through a binding; no `terrain_state` binding is
 * carried on the bundle default. `writer_policy = "world_interaction"`
 * (mirrors `srd/darkness`, `archive/packages/spellkave-srd/fixtures/base/
 * darkness.toml:413`) so a reducer-driven effect (a spell, a hazard) may
 * flip this state and change the NEXT traversal's charge with no manifest
 * re-apply (A-4). `freshness_rule = ""` (persistent terrain, not a decaying
 * ambient marker — unlike `srd/darkness`'s `expires_after_ticks:...`).
 */
export const DIFFICULT_TERRAIN_STATE_ID = "srd/state/difficult_terrain";
/**
 * `max(1, max(<from>, <to>))`: either incident node being difficult (value
 * >= 1) multiplies the crossing; both difficult takes the WORSE (Max, not
 * Mul — the SRD idiom recorded by design.md D-4) of the two; absent state
 * reads the definition's own zero default, so an ordinary edge with no
 * authored terrain state still costs `max(1, max(0,0)) = 1`, i.e. unchanged.
 */
export const DIFFICULT_TERRAIN_COST_EXPRESSION =
	`max(1, max(target.stat("${DIFFICULT_TERRAIN_STATE_ID}@from_node"), ` +
	`target.stat("${DIFFICULT_TERRAIN_STATE_ID}@to_node")))`;

/** Kernel-owned binding name (`LONG_RUNNING_MOVE_SESSION_BINDING` in
 * `server/src/world_interaction/layer2/long_running_move.rs`). Content
 * supplies the session_definition id; the kernel never hardcodes one. */
export const LONG_RUNNING_MOVE_SESSION_BINDING = "long_running_move_session";
export const LONG_RUNNING_MOVE_SESSION_DEF_ID = "srd/long_running_move";
export const LONG_RUNNING_MOVE_TERMINATION_PRED =
	"world.tick - session.stat('opened_at') >= session.stat('promoted_duration_ticks')";
export const LONG_RUNNING_MOVE_ROUND_DURATION_MS = 6_000;

/** Shared Step / r_move edge bindings: reach resource + travel session. */
export const STEP_EDGE_BINDINGS = {
	movement_reach_resource: `srd/${SPEED_WALK_RESOURCE_LOCAL_ID}`,
	[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
} as const;
export const STEP_EDGE_BINDINGS_JSON = JSON.stringify(STEP_EDGE_BINDINGS);

/** Same shape as `STEP_EDGE_BINDINGS`, for the swim/fly alternative modes. */
export const SWIM_EDGE_BINDINGS = {
	movement_reach_resource: `srd/${SPEED_SWIM_RESOURCE_LOCAL_ID}`,
	[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
} as const;
export const SWIM_EDGE_BINDINGS_JSON = JSON.stringify(SWIM_EDGE_BINDINGS);
export const FLY_EDGE_BINDINGS = {
	movement_reach_resource: `srd/${SPEED_FLY_RESOURCE_LOCAL_ID}`,
	[LONG_RUNNING_MOVE_SESSION_BINDING]: LONG_RUNNING_MOVE_SESSION_DEF_ID,
} as const;
export const FLY_EDGE_BINDINGS_JSON = JSON.stringify(FLY_EDGE_BINDINGS);

/**
 * Build the ambient edge-affordance predicate: actor has the walk capability
 * AND the target square is traversable. This is the bundle's
 * `movement_defaults` template, inherited by every ordinary place edge, so
 * it carries NO occupancy clause (ADR-0134 D-3/D-5): ambient nodes keep free
 * co-location. The grid rule lives on `gridStepAffordancePredicate`.
 */
export function stepAffordancePredicate(): string {
	return `actor.has_capability('${WALK_CAPABILITY_ID}') && target.has_niche('${TRAVERSABLE_SQUARE_NICHE_ID}')`;
}

/**
 * Build the grid edge-affordance predicate: the ambient Step gate AND no
 * living creature on the destination cell.
 *
 * ADR-0134 D-3/D-5: destination occupancy is an authored read, not a kernel
 * veto — the retired `DestinationOccupied` rejection blocked a cell for the
 * rest of a session once its occupant died (the elven-mini cellar stalemate).
 * The clause counts occupants of the edge's destination (`to_node`, the same
 * node the `@to_node` projection reads) minus those carrying
 * `srd/condition/dead`; a refused step is the ordinary traversal-predicate
 * refusal (`predicate_no_longer_holds`). Stricter than SRD 5.2 on purpose
 * (ADR-0134 G-1): the SRD forbids only ENDING a move in another creature's
 * space and lets you pass through an ally's, but the kernel has no "movement
 * ends here" predicate point yet, so every grid step — allies included — is
 * blocked by a living occupant. Only blueprints bind this template; minted
 * grid edges replace the movement default rather than inherit it
 * (`tactical_grid.rs`), so the two templates never AND-join.
 */
export function gridStepAffordancePredicate(): string {
	return `${stepAffordancePredicate()} && occupants_at('to_node', '${STEP_BLOCKING_EXCLUDED_CONDITION_ID}') == 0`;
}
