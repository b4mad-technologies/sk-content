/**
 * // pattern: draft-then-confirm-wizard
 *
 * The creation candidate's FAIL-CLOSED SEED FLOOR (generic mechanism
 * extracted from elven-mini's `author/creation-candidate.ts`, sk-s26).
 *
 * Every fact the creation confirm step writes must already carry a seed row
 * BEFORE confirm ever fires: confirm's `setToExactValueDeltaSource` writes
 * assume an existing `object_state` row, and reading one that was never
 * seeded fails closed with `UnknownField`, never a silent 0 default. So the
 * candidate is seeded with `srd/level` at its own floor (1 — `level-units.ts`
 * `min_value = 1`; a "not yet created" candidate cannot legally read 0),
 * `srd/hp` at 0, and all six ability resources at their own floor (0,
 * `abilities.toml`).
 *
 * `SPEED_WALK_RESOURCE_ID` is ALSO seeded (at the safety-bound maximum the
 * pregen hero uses — the candidate has no class/species yet) together with
 * the standard reach: the Step edge affordance's `movement_reach_resource`
 * binding reads it, and a tag-derived Walk capability with no seeded reach
 * resource is the same fail-closed trap as the abilities.
 *
 * Nothing here names a bundle, entity or place: the story still authors its
 * own entity type / placement around these rows.
 */

import {
	CREATURE_NICHE_TAG,
	HP_ID,
	LEVEL_ID,
	PLAYER_CHARACTER_TAG,
	REACH_RESOURCE_ID,
	SPEED_WALK_MAX,
	SPEED_WALK_RESOURCE_ID,
	SRD_BUNDLE_ID,
	STANDARD_REACH_MM,
	VOCAL_COMMUNICATION_TAG,
} from "../../srd-ids";

/** srd/level's own floor. */
export const CANDIDATE_LEVEL_FLOOR = 1;
export const CANDIDATE_HP_FLOOR = 0;
/** All six ability resources' own floor (`abilities.toml`). */
export const CANDIDATE_ABILITY_FLOOR = 0;
/** The safety-bound maximum, not a class/species-derived value. */
export const CANDIDATE_SPEED_WALK_CELLS = SPEED_WALK_MAX;

/** Explicit creature / player-character / vocal identity: derives the
 * universal + PC-only attempts and the Speak capability the creation
 * dialogue needs (knowing a language does not establish that modality). */
export const CANDIDATE_IDENTITY_TAGS: readonly string[] = [
	CREATURE_NICHE_TAG,
	PLAYER_CHARACTER_TAG,
	VOCAL_COMMUNICATION_TAG,
];

export interface CandidateInitialState {
	state: string;
	value_int: number;
}

const ABILITY_STATE_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

/** The candidate entity type's `initial_states`, in the authored order
 * (reach, level, hp, six abilities, walk speed). Fresh array per call. */
export function candidateInitialStates(): CandidateInitialState[] {
	return [
		{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
		{ state: `${SRD_BUNDLE_ID}/${LEVEL_ID}`, value_int: CANDIDATE_LEVEL_FLOOR },
		{ state: `${SRD_BUNDLE_ID}/${HP_ID}`, value_int: CANDIDATE_HP_FLOOR },
		...ABILITY_STATE_KEYS.map((key) => ({
			state: `${SRD_BUNDLE_ID}/${key}`,
			value_int: CANDIDATE_ABILITY_FLOOR,
		})),
		{ state: SPEED_WALK_RESOURCE_ID, value_int: CANDIDATE_SPEED_WALK_CELLS },
	];
}
