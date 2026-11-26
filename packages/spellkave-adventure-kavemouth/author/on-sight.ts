// pattern: none — authored kavemouth encounter policy, read by the DM duty exporter.
/**
 * Which hostiles open a fight when the party walks in on them
 * (`duties.watches.initiative.on_sight`; contract in
 * `packages/spellkave-world-author/docs/metadata-attachments.md`, design
 * `ledger/designs/initiative-on-sight.md`, bead sk-jay0.3.27.4.2). Before
 * this, a fight opened only when somebody attacked, and no hostile attacks
 * outside a fight: a hero could walk past every monster.
 *
 * Every authored hostile is listed except the leaders whose quest has a
 * spoken no-kill ending (Q4 Sister Maelis, Q7 Grubnash). The storyline keeps
 * a leader's parley open while it lives (`docs/kavemouth-storyline.md`
 * section 6): a leader that opened the fight the moment the hero stepped
 * into its room would close that offer before it could be made, because the
 * offer is a verb of the room and a fight takes both bodies out of the room.
 * Their followers are listed, so the way to the leader is still fought for,
 * and the leader fights back as soon as it is attacked.
 *
 * `PEACE_CONDITION_ID` is what the two spoken endings leave on the leader
 * (`quest-milestones.ts`). It is listed as a peace condition, so the ending
 * holds even for a world whose duty source lists those leaders after all.
 */
import { authoredHostileActorKeys } from "./initiative-setup.ts";
import { BUNDLE } from "./lib/ids.ts";

export const PEACE_CONDITION_LOCAL_ID = "condition/at-peace";
export const PEACE_CONDITION_ID = `${BUNDLE}/${PEACE_CONDITION_LOCAL_ID}`;

/** Leaders with an authored spoken ending; they wait for the hero's word or blow. */
export const PARLEY_LEADER_ACTOR_KEYS: readonly string[] = [
	`${BUNDLE}/adventure/encounter/sister_maelis_1`,
	`${BUNDLE}/adventure/encounter/grubnash_1`,
];

/** A party body carrying one of these does not open a fight by arriving. */
export const ON_SIGHT_UNSEEN_CONDITION_IDS: readonly string[] = ["srd/condition/invisible"];

export function onSightInitiative(): {
	actor_keys: string[];
	unseen_condition_ids: string[];
	peace_condition_ids: string[];
} {
	const hostile = authoredHostileActorKeys();
	for (const key of PARLEY_LEADER_ACTOR_KEYS) {
		if (!hostile.includes(key)) throw new Error(`on-sight: ${key} is no authored hostile.`);
	}
	return {
		actor_keys: hostile.filter((key) => !PARLEY_LEADER_ACTOR_KEYS.includes(key)),
		unseen_condition_ids: [...ON_SIGHT_UNSEEN_CONDITION_IDS],
		peace_condition_ids: [PEACE_CONDITION_ID],
	};
}
