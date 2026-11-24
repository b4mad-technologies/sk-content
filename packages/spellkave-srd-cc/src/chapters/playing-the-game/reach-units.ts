/**
 * A creature's ordinary SRD melee reach. The SRD states that a creature has
 * a 5-foot reach; this is held as an explicit actor fact because effective
 * reads intentionally fail closed when a definition does not seed it.
 */
export const REACH_RESOURCE_ID = "srd/reach_mm";
export const REACH_RESOURCE_LOCAL_ID = "reach_mm";
export const STANDARD_REACH_MM = 1524;
/** CreatureActionAttack.json's authored melee-reach corpus tops out at 30 feet. */
export const MAX_REACH_MM = STANDARD_REACH_MM * 6;

/** Seed this canonical resource into isolated authoring workspaces, then strip it. */
export function reachResourceCall() {
	return {
		toolName: "spellkave_define_resource" as const,
		label: "resource:reach_mm-validation-seed",
		params: {
			id: REACH_RESOURCE_LOCAL_ID,
			display_name: "Reach",
			min_value: 0,
			max_value: MAX_REACH_MM,
			initial_value: STANDARD_REACH_MM,
			recovery_rule: "persistent",
			description: "Validation seed; canonical emitted definition is playing-the-game/level.toml.",
			tags: [],
		},
	};
}
