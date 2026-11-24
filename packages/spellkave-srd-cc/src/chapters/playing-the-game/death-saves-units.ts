// PC death-save clock (sk-609b.18 / sk-b3m): Falling Unconscious + Death
// Saving Throws from cache/markdown/playing-the-game.md:1211-1247.
//
// Content-only. Stateful clock shape is the sister's retired
// `death-saves.toml` (two tallies + scratch cell + turn-gated roll action +
// ordinal ModifyResource / threshold ApplyStatus) and the world-author
// `Clock` primitive that folds the same rows. Monster Death stays
// monster-only (`weapon-attack-units.ts` monsterDeathFrameWrite).
//
// pattern: condition-hook-on-event
// → packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md

import { PLAYER_CHARACTER_TAG } from "./creature-type-units";
import { DEATH_SAVE_DC, deathSaveExpr } from "./damage-healing-misc-units";

export { deathSaveExpr, DEATH_SAVE_DC };

export const DEATH_SAVE_SUCCESSES_LOCAL_ID = "death_save_successes";
export const DEATH_SAVE_FAILURES_LOCAL_ID = "death_save_failures";
export const DEATH_SAVE_LAST_ROLL_LOCAL_ID = "death_save_last_roll";

export const DEATH_SAVE_SUCCESSES_DISPLAY_NAME = "Death save successes";
export const DEATH_SAVE_FAILURES_DISPLAY_NAME = "Death save failures";
export const DEATH_SAVE_LAST_ROLL_DISPLAY_NAME = "Death save — last d20 draw (scratch)";

export const DEATH_SAVE_TALLY_MIN = 0;
export const DEATH_SAVE_TALLY_MAX = 3;
export const DEATH_SAVE_LAST_ROLL_MIN = 0;
export const DEATH_SAVE_LAST_ROLL_MAX = 20;

export const DEATH_SAVE_CAPABILITY_LOCAL_ID = "capability/death_save";
export const DEATH_SAVE_ACTION_LOCAL_ID = "death_save/roll";
export const DEATH_SAVE_HEAL_CLEAR_CONSEQUENCE_LOCAL_ID = "death_save/heal_clear";

/**
 * Character-path guard for Falling Unconscious (playing-the-game.md:1229):
 * HP ≤ 0 and the struck subject is a player character — never a monster
 * (Monster Death owns the monster branch).
 *
 * HAS_TAG FIRST (sk-awlo, 2026-08-23 — same fix as `monsterDeathGuardExpr`,
 * `weapon-attack-units.ts`): this predicate composes inside a
 * `ForEachActorInRadius` body (`characterUnconsciousFrameWrite` below), so it
 * is evaluated against EVERY actor co-located with the struck target, not
 * just the target itself. `&&` short-circuits left-to-right
 * (`crates/spellkave-dsl/src/eval.rs`'s `Op::And`) but does not swallow an
 * evaluation ERROR — reading `stat(hpResourceId)` on a co-located bystander
 * that carries no such resource (e.g. a training dummy) throws `UnknownField`
 * and aborts the whole consequence dispatch, `for_each_actor_in_radius.rs`'s
 * error handling being loud/fatal by design (D-5). `has_tag` is a
 * never-throwing set-membership read; checking it FIRST lets an untagged
 * bystander short-circuit before the stat read is ever attempted, for the
 * identical final boolean on every actor that does carry both.
 */
export function characterUnconsciousGuardExpr(
	hpResourceId: string,
	subject: "target" | "actor" = "target",
): string {
	return `${subject}.has_tag('${PLAYER_CHARACTER_TAG}') && ${subject}.stat('${hpResourceId}') <= 0`;
}

/**
 * Same-cell ForEachActorInRadius body that lands Unconscious on a PC at 0 HP
 * and seeds the death-save clock pools at 0 (resource_definition.initial_value
 * is a bound, not a per-actor default — first ModifyResource with a constant
 * delta seeds the row without reading actor.stat).
 */
export function characterUnconsciousFrameWrite(
	hpResourceId: string,
	unconsciousConditionId: string,
	successesResourceId: string,
	failuresResourceId: string,
	lastRollResourceId: string,
): Record<string, unknown> {
	return {
		ForEachActorInRadius: {
			center_ref: "TargetSpatialRef",
			shape_id: "core/area/node_ball",
			shape_params_json: '{"ball_radius": 0}',
			predicate_source: characterUnconsciousGuardExpr(hpResourceId, "actor"),
			body: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "Actor",
						condition_definition_id: unconsciousConditionId,
					},
				},
				// Seed tallies + scratch without reading missing rows (constant delta).
				{
					ModifyResource: {
						actor: "Actor",
						resource: successesResourceId,
						delta_source: "0",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: failuresResourceId,
						delta_source: "0",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: lastRollResourceId,
						delta_source: "0",
					},
				},
			],
		},
	};
}

/** Affordance gate: unconscious, not yet stable or dead. */
export function deathSaveEligibilityExpr(
	unconsciousConditionId: string,
	_stableConditionId: string,
	deadConditionId: string,
): string {
	return (
		`actor.status('${unconsciousConditionId}') == true` +
		` && actor.status('${deadConditionId}') == false`
	);
}

/** Capture one d20 into the scratch cell (set-via-delta). */
export function deathSaveCaptureDeltaExpr(lastRollResourceId: string): string {
	return `d20 - actor.stat('${lastRollResourceId}')`;
}

export function deathSaveSuccessTallyDeltaExpr(lastRollResourceId: string): string {
	return `cond(actor.stat('${lastRollResourceId}') >= ${DEATH_SAVE_DC}, 1, 0)`;
}

export function deathSaveFailureTallyDeltaExpr(lastRollResourceId: string): string {
	return `cond(actor.stat('${lastRollResourceId}') < ${DEATH_SAVE_DC}, 1, 0)`;
}

/** Nat-1 counts as two failures (extra +1 on top of the ordinary failure). */
export function deathSaveNat1ExtraFailureDeltaExpr(lastRollResourceId: string): string {
	return `cond(actor.stat('${lastRollResourceId}') == 1, 1, 0)`;
}

/** Nat-20 regains 1 HP. */
export function deathSaveNat20HpDeltaExpr(lastRollResourceId: string): string {
	return `cond(actor.stat('${lastRollResourceId}') == 20, 1, 0)`;
}

export function deathSaveStableThresholdExpr(
	successesResourceId: string,
	lastRollResourceId: string,
): string {
	return (
		`actor.stat('${successesResourceId}') >= ${DEATH_SAVE_TALLY_MAX}` +
		` || actor.stat('${lastRollResourceId}') == 20`
	);
}

export function deathSaveDeadThresholdExpr(failuresResourceId: string): string {
	return `actor.stat('${failuresResourceId}') >= ${DEATH_SAVE_TALLY_MAX}`;
}

/**
 * Reset one tally/scratch pool to 0 via set-via-delta (row must already exist
 * — applied after unconscious seeding or a prior roll).
 */
export function deathSaveResetDeltaExpr(resourceId: string): string {
	return `0 - actor.stat('${resourceId}')`;
}
