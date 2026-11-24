/**
 * Runtime SRD id literals (sk-jay0.7.21).
 *
 * NPC-host and DM runtime import these instead of srd-cc chapter modules.
 * Values match the compiler package; authoring still reads srd-cc.
 */

export const SRD_BUNDLE_ID = "srd";

export const HP_ID = "hp";
export const LEVEL_ID = "level";
export const XP_ID = "xp";
export const XP_VALUE_ID = "xp_value";
export const HP_PER_LEVEL_ID = "hp_per_level";
/** Full id of a state/resource the SRD bundle owns: `srd/<localId>`. */
export function srdState(localId: string): string {
	return `${SRD_BUNDLE_ID}/${localId}`;
}
export const LEVEL_STATE_ID = srdState(LEVEL_ID);
export const XP_STATE_ID = srdState(XP_ID);
export const XP_THRESHOLD_MACRO_ID = `${SRD_BUNDLE_ID}/xp_threshold`;

export const CLASS_TAG_PREFIX = "srd.class";
export const SPECIES_TAG_PREFIX = "srd.species";
export const BACKGROUND_TAG_PREFIX = "srd.background";
export const CREATURE_NICHE_TAG = "srd.creature";
export const PLAYER_CHARACTER_TAG = "srd.player_character";
export const VOCAL_COMMUNICATION_TAG = "srd.communication.vocal";

export const PARTY_HEROES_TAG = "srd.party.heroes";
export const FACTION_PARTY_TAG = "srd.faction.party";
export const FACTION_MONSTERS_TAG = "srd.faction.monsters";
export const DM_NPC_ALDWIN_TAG = "srd.dm_npc.aldwin";
export const DM_NPC_CREATION_TAG = "srd.dm_npc.creation";
export const DM_NPC_TALKER_TAG = "srd.dm_npc.talker";
export const ADVANCEMENT_TRAINER_TAG = "srd.advancement_trainer";
export const ITEM_CONTAINER_TAG = "srd.item.container";
export const ITEM_GEAR_TAG = "srd.item.gear";
export const ITEM_FOOD_TAG = "srd.item.food";
export const ITEM_LIGHT_TAG = "srd.item.light";

export const SPEECH_TRACE_KIND_ID = `${SRD_BUNDLE_ID}/speech`;
export const SPEAK_TO_ACTION_ID = `${SRD_BUNDLE_ID}/speak-to`;
export const TELEPATHY_CAPABILITY_ID = `${SRD_BUNDLE_ID}/action/communicate/telepathy`;
export const TELEPATHY_ACTION_ID = `${SRD_BUNDLE_ID}/communicate/telepathy`;
export const TELEPATHY_RANGE_M = 50;

export const DEAD_CONDITION_ID = `${SRD_BUNDLE_ID}/condition/dead`;
export const INCAPACITATED_CONDITION_ID = `${SRD_BUNDLE_ID}/condition/incapacitated`;

export const AC_RESOURCE_ID = `${SRD_BUNDLE_ID}/ac`;
export const SPEED_WALK_RESOURCE_ID = `${SRD_BUNDLE_ID}/speed-walk`;
export const SPEED_WALK_INITIAL = 6;
export const SPEED_WALK_MAX = 120;
export const REACH_RESOURCE_ID = `${SRD_BUNDLE_ID}/reach_mm`;
export const STANDARD_REACH_MM = 1524;
export const STANDARD_COMBAT_GRID_ID = `${SRD_BUNDLE_ID}/combat-grid/standard-10x10`;
export const MELEE_ATTACK_LOCAL_ID = "attack/melee";
export const MAIN_HAND_SLOT_LOCAL_ID = "slot/main-hand";
export const PROFICIENCY_BONUS_STATE_ID = `${SRD_BUNDLE_ID}/proficiency_bonus`;
export const ACTION_SURGE_USES_RESOURCE_ID = `${SRD_BUNDLE_ID}/fighter/action-surge-uses`;

export const SPELL_SLOT_GRANT_NAMESPACE = "srd.spell_slot_grant";
export const SPELLCASTING_PROFILE_NAMESPACE = "srd.spellcasting_profile";

export function levelUpGatePredicateSource(): string {
	return (
		`actor.stat('${SRD_BUNDLE_ID}/${XP_ID}') >= macro('${XP_THRESHOLD_MACRO_ID}', actor.stat('${SRD_BUNDLE_ID}/${LEVEL_ID}') + 1)` +
		` && actor.stat('${SRD_BUNDLE_ID}/${LEVEL_ID}') < 20`
	);
}
