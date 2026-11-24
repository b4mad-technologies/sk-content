import { BUNDLE_ID } from "./constants";

export const TURN_START_BOUNDARY_ID = "turn_start";
export const TURN_END_BOUNDARY_ID = "turn_end";
export const SHORT_REST_BOUNDARY_ID = `${BUNDLE_ID}/boundary/short_rest`;
export const LONG_REST_BOUNDARY_ID = `${BUNDLE_ID}/boundary/long_rest`;

export const PRIMARY_CHANNEL_ID = `${BUNDLE_ID}/economy_channel/primary`;
export const BONUS_CHANNEL_ID = `${BUNDLE_ID}/economy_channel/bonus`;
export const REACTION_CHANNEL_ID = `${BUNDLE_ID}/economy_channel/reaction`;
export const OBJECT_INTERACTION_CHANNEL_ID = `${BUNDLE_ID}/economy_channel/object_interaction`;
/**
 * Cumulative per-turn movement budget (sk-0m4.123, parts 1+2 of the bead;
 * `ledger/designs/movement-channel-budget.md`'s own "open follow-up" —
 * srd-cc authoring its own self-sufficient movement channel, mirroring how
 * it already owns `srd/economy_channel/{primary,bonus,reaction,
 * object_interaction}` instead of referencing the mechanics-proof
 * `core/action_class/movement` row). Bound as `movement_channel` on an
 * edge's `place_edge_affordance`/`movement_defaults`/`combat_grid_blueprint`
 * bindings alongside `movement_reach_resource`
 * (`server/src/world_interaction/layer2/r_move.rs`'s
 * `movement_charge_candidate` requires BOTH bindings before it charges
 * anything). `off_turn_eligible = false`: SRD movement is spent by Move,
 * not by a Reaction — no SRD reaction moves the actor (Opportunity Attack,
 * Uncanny Dodge, etc. never move), so there is no off-turn movement spend
 * to admit; report if that changes.
 */
export const MOVEMENT_CHANNEL_ID = `${BUNDLE_ID}/economy_channel/movement`;

export const STANDARD_ROUND_MS = 6_000;
export const OBJECT_INTERACTION_MS = 500;

export interface BoundaryUnit {
	id: string;
	bundle_id: string;
	description: string;
}

export interface EconomyChannelUnit {
	id: string;
	bundle_id: string;
	pool_ms_per_round: number;
	resets_on: string;
	off_turn_eligible: boolean;
}

/**
 * A `modifier_target_definitions` row that lets a condition-driven Numeric
 * modifier scale one of THIS bundle's own economy channels (`applies_to` =
 * the channel id, matched at check time — `budget_gate.rs`'s
 * `effective_pool_from_composed` filters on `shape == Numeric` and reads it
 * by string equality against the channel id, no separate FK to
 * `economy_channel_definitions`). First consumer:
 * `srd/condition/incapacitated`'s three channel-zeroing siblings
 * (`fragments/conditions.ts`, sk-dms.40.2) — the SAME composition path
 * `budget_gate.rs`'s own `haste_like_channel_modifier_enlarges_then_expiry_restores_pool`
 * unit test already proves live.
 */
export function economyChannelModifierTargetRow(
	channelId: string,
	displayName: string,
): Record<string, unknown> {
	return {
		target_id: channelId,
		bundle_id: BUNDLE_ID,
		shape: "Numeric",
		display_name: displayName,
	};
}

/**
 * The two kernel-fired turn boundaries plus the SRD's rest boundaries.
 *
 * `turn_start`/`turn_end` deliberately keep their kernel names: the boundary
 * engine fires those open authored ids. Rest boundaries are namespaced
 * content and are reachable through authored `FireBoundary` consequences.
 */
export function buildBoundaryUnits(): BoundaryUnit[] {
	return [
		{
			id: TURN_START_BOUNDARY_ID,
			bundle_id: BUNDLE_ID,
			description: "Start of this actor's turn or derived out-of-session round window.",
		},
		{
			id: TURN_END_BOUNDARY_ID,
			bundle_id: BUNDLE_ID,
			description: "End of this actor's turn.",
		},
		{
			id: SHORT_REST_BOUNDARY_ID,
			bundle_id: BUNDLE_ID,
			description: "Completion of the SRD Short Rest described in rules-glossary.md § Short Rest.",
		},
		{
			id: LONG_REST_BOUNDARY_ID,
			bundle_id: BUNDLE_ID,
			description: "Completion of the SRD Long Rest described in rules-glossary.md § Long Rest.",
		},
	];
}

/**
 * The complete standalone SRD action economy.
 *
 * A round is about six seconds (`playing-the-game.md:877` in the source
 * edition used by ADR-0090; current cache section "Combat"). Primary, bonus,
 * reaction, and movement are parallel six-second pools. The free object
 * interaction is its own 500 ms pool so exactly one 500 ms interaction fits
 * per turn (`playing-the-game.md:780,903-915`). Movement is metered
 * separately from the other three (sk-0m4.123): it is charged by
 * `r_move.rs`'s edge-cost formula, not by an authored `cost_time_ms` on an
 * `action_definitions`/`affordance_templates` row, but it shares the same
 * `economy_channel_definitions` shape and six-second pool. These values are
 * the binding ADR-0090
 * D-2 authoring decision, not inherited from the retired sister bundle.
 */
export function buildEconomyChannelUnits(): EconomyChannelUnit[] {
	return [
		{
			id: PRIMARY_CHANNEL_ID,
			bundle_id: BUNDLE_ID,
			pool_ms_per_round: STANDARD_ROUND_MS,
			resets_on: TURN_START_BOUNDARY_ID,
			off_turn_eligible: false,
		},
		{
			id: BONUS_CHANNEL_ID,
			bundle_id: BUNDLE_ID,
			pool_ms_per_round: STANDARD_ROUND_MS,
			resets_on: TURN_START_BOUNDARY_ID,
			off_turn_eligible: false,
		},
		{
			id: REACTION_CHANNEL_ID,
			bundle_id: BUNDLE_ID,
			pool_ms_per_round: STANDARD_ROUND_MS,
			resets_on: TURN_START_BOUNDARY_ID,
			off_turn_eligible: true,
		},
		{
			id: OBJECT_INTERACTION_CHANNEL_ID,
			bundle_id: BUNDLE_ID,
			pool_ms_per_round: OBJECT_INTERACTION_MS,
			resets_on: TURN_START_BOUNDARY_ID,
			off_turn_eligible: false,
		},
		{
			id: MOVEMENT_CHANNEL_ID,
			bundle_id: BUNDLE_ID,
			pool_ms_per_round: STANDARD_ROUND_MS,
			resets_on: TURN_START_BOUNDARY_ID,
			off_turn_eligible: false,
		},
	];
}
