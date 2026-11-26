// Shared identity TRUTH for the "Playing the Game" chapter's two identity
// bundles (abilities, skills) — the single source both the offline
// author-tool tests (`src/test/offline/fixtures-author-tool/`) and the
// live-preseeded test (`src/test/live-preseeded/mechanics/identity.
// test.ts`) consume, so the expected shape is asserted in exactly ONE place
// (operator instruction, test-architecture rework 2026-07-26). Structural
// invariants (bounds, recovery rule, tags, actor_kind, display-name prefix)
// live here as constants; per-unit expectations are DERIVED from the same
// `buildAbilityUnits`/`buildSkillUnits` domain functions the chapter
// generator itself calls (`src/chapters/playing-the-game/index.ts`) — never
// re-typed literals that could drift from the generator.

import {
	CLAIM_VICTORY_CAPABILITY_ID,
	HP_PER_LEVEL_ID,
	HP_PER_LEVEL_RECOVERY_RULE,
	INITIAL_HP_PER_LEVEL,
	INITIAL_XP,
	INITIAL_XP_VALUE,
	LEVEL_UP_CAPABILITY_ID,
	MAX_HP_PER_LEVEL,
	MAX_XP,
	MAX_XP_VALUE,
	MIN_HP_PER_LEVEL,
	MIN_XP,
	MIN_XP_VALUE,
	XP_ID,
	XP_RECOVERY_RULE,
	XP_VALUE_ID,
	XP_VALUE_RECOVERY_RULE,
} from "../../chapters/character-creation/advancement-units";
import { buildLanguageUnits, languageTag } from "../../chapters/character-creation/language-units";
import {
	SIZE_INITIAL,
	SIZE_MAX,
	SIZE_MIN,
	SIZE_RECOVERY_RULE,
	SIZE_RESOURCE_LOCAL_ID,
} from "../../chapters/character-origins/species-units";
import {
	BARDIC_CAPABILITY_ID,
	BARDIC_USES_INITIAL,
	BARDIC_USES_MAX,
	BARDIC_USES_MIN,
	BARDIC_USES_RESOURCE_ID,
	CLERIC_CD_CAPABILITY_ID,
	CLERIC_CD_RECOVERY_RULE,
	CLERIC_CD_USES_INITIAL,
	CLERIC_CD_USES_MAX,
	CLERIC_CD_USES_MIN,
	CLERIC_CD_USES_RESOURCE_ID,
	FAVORED_ENEMY_CAPABILITY_ID,
	FAVORED_ENEMY_USES_INITIAL,
	FAVORED_ENEMY_USES_MAX,
	FAVORED_ENEMY_USES_MIN,
	FAVORED_ENEMY_USES_RESOURCE_ID,
	INNATE_SORCERY_CAPABILITY_ID,
	INNATE_SORCERY_USES_INITIAL,
	INNATE_SORCERY_USES_MAX,
	INNATE_SORCERY_USES_MIN,
	INNATE_SORCERY_USES_RESOURCE_ID,
	LAY_ON_HANDS_CAPABILITY_ID,
	LAY_ON_HANDS_INITIAL,
	LAY_ON_HANDS_MAX,
	LAY_ON_HANDS_MIN,
	LAY_ON_HANDS_RESOURCE_ID,
	PALADIN_CD_CAPABILITY_ID,
	PALADIN_CD_USES_INITIAL,
	PALADIN_CD_USES_MAX,
	PALADIN_CD_USES_MIN,
	PALADIN_CD_USES_RESOURCE_ID,
	SORCERY_POINTS_INITIAL,
	SORCERY_POINTS_MAX,
	SORCERY_POINTS_MIN,
	SORCERY_POINTS_RESOURCE_ID,
	WILD_SHAPE_CAPABILITY_ID,
	WILD_SHAPE_USES_INITIAL,
	WILD_SHAPE_USES_MAX,
	WILD_SHAPE_USES_MIN,
	WILD_SHAPE_USES_RESOURCE_ID,
} from "../../chapters/classes/caster-features-units";
import {
	HIT_DIE_INITIAL,
	HIT_DIE_MAX,
	HIT_DIE_MIN,
	HIT_DIE_RECOVERY_RULE,
	HIT_DIE_RESOURCE_LOCAL_ID,
} from "../../chapters/classes/classes-units";
import {
	ACTION_SURGE_CAPABILITY_ID,
	ACTION_SURGE_RECOVERY_RULE,
	ACTION_SURGE_USES_INITIAL,
	ACTION_SURGE_USES_MAX,
	ACTION_SURGE_USES_MIN,
	ACTION_SURGE_USES_RESOURCE_ID,
	CLASS_FEATURE_TAG_PREFIX,
	FIGHTER_CLASS_TAG,
	SECOND_WIND_CAPABILITY_ID,
	SECOND_WIND_RECOVERY_RULE,
	SECOND_WIND_USES_INITIAL,
	SECOND_WIND_USES_MAX,
	SECOND_WIND_USES_MIN,
	SECOND_WIND_USES_RESOURCE_ID,
} from "../../chapters/classes/fighter-units";
import {
	CUNNING_ACTION_CAPABILITY_ID,
	MONKS_FOCUS_CAPABILITY_ID,
	RAGE_CAPABILITY_ID,
	RECKLESS_ATTACK_CAPABILITY_ID,
	STEADY_AIM_CAPABILITY_ID,
} from "../../chapters/classes/martial-features-units";
import { choiceToolUnits } from "../../chapters/equipment/choice-tools.ts";
import {
	ARMOR_AC_BASE_RESOURCE_ID,
	ARMOR_DEX_CAP_RESOURCE_ID,
	ARMOR_STEALTH_DISADVANTAGE_RESOURCE_ID,
	ARMOR_STR_REQUIRED_RESOURCE_ID,
	COST_CP_RESOURCE_ID,
	WEIGHT_LB10_RESOURCE_ID,
} from "../../chapters/equipment/item-measures";
import { ALERT_CAPABILITY_ID } from "../../chapters/feats/alert-units";
import { ASI_CAPABILITY_ID } from "../../chapters/feats/asi-units";
import { buildStarterBehaviors } from "../../chapters/monsters/starter-behaviors";
import { buildAbilityUnits } from "../../chapters/playing-the-game/ability-units";
import { buildActionUnits } from "../../chapters/playing-the-game/actions-units";
import {
	AC_RESOURCE_ID,
	AC_RESOURCE_INITIAL,
	AC_RESOURCE_MAX,
	AC_RESOURCE_MIN,
} from "../../chapters/playing-the-game/armor-class-units";
import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	LOCK_PICKING_CHECK_CAPABILITY_ID,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
} from "../../chapters/playing-the-game/equipment-proficiencies-units";
import { BASELINE_COMMUNICATE_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/communication";
import { CONSUME_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/consume";
import { DROP_PRONE_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/drop-prone";
import { HEROIC_INSPIRATION_REROLL_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/heroic-inspiration";
import { PICKUP_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/pickup";
import {
	LONG_REST_CAPABILITY_ID,
	SHORT_REST_CAPABILITY_ID,
} from "../../chapters/playing-the-game/fragments/rest";
import {
	SPEAK_CAPABILITY_ID,
	TELEPATHY_CAPABILITY_ID,
} from "../../chapters/playing-the-game/fragments/speech";
import { STAND_UP_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/stand-up";
import {
	buildGenericCheckSubjects,
	genericCheckCapabilitySuffix,
	genericCheckDcOverrideSuffix,
	maxTypicalDc,
} from "../../chapters/playing-the-game/generic-check-units";
import {
	CLIMB_CAPABILITY_ID,
	FLY_CAPABILITY_ID,
	SPEED_CLIMB_INITIAL,
	SPEED_CLIMB_MAX,
	SPEED_CLIMB_MIN,
	SPEED_CLIMB_RECOVERY_RULE,
	SPEED_CLIMB_RESOURCE_LOCAL_ID,
	SPEED_FLY_INITIAL,
	SPEED_FLY_MAX,
	SPEED_FLY_MIN,
	SPEED_FLY_RECOVERY_RULE,
	SPEED_FLY_RESOURCE_LOCAL_ID,
	SPEED_SWIM_INITIAL,
	SPEED_SWIM_MAX,
	SPEED_SWIM_MIN,
	SPEED_SWIM_RECOVERY_RULE,
	SPEED_SWIM_RESOURCE_LOCAL_ID,
	SPEED_WALK_INITIAL,
	SPEED_WALK_MAX,
	SPEED_WALK_MIN,
	SPEED_WALK_RECOVERY_RULE,
	SPEED_WALK_RESOURCE_LOCAL_ID,
	SWIM_CAPABILITY_ID,
	WALK_CAPABILITY_ID,
} from "../../chapters/playing-the-game/grid-units";
import {
	HEROIC_INSPIRATION_ID,
	HEROIC_INSPIRATION_RECOVERY_RULE,
	INITIAL_HEROIC_INSPIRATION,
	MAX_HEROIC_INSPIRATION,
	MIN_HEROIC_INSPIRATION,
} from "../../chapters/playing-the-game/heroic-inspiration-units";
import {
	HP_ID,
	HP_RECOVERY_RULE,
	HP_SAFETY_MAX,
	INITIAL_HP,
	MIN_HP,
} from "../../chapters/playing-the-game/hp-units";
import { BUNDLE_ID } from "../../chapters/playing-the-game/index";
import {
	INITIAL_CHARACTER_LEVEL,
	LEVEL_ID,
	MAX_CHARACTER_LEVEL,
	MIN_CHARACTER_LEVEL,
} from "../../chapters/playing-the-game/level-units";
import {
	PROFICIENCY_BONUS_STATE_ID,
	PROFICIENCY_BONUS_STATE_MAX,
	PROFICIENCY_BONUS_STATE_MIN,
} from "../../chapters/playing-the-game/modifier-units";
import { buildSkillUnits } from "../../chapters/playing-the-game/skill-units";
import { DIFFICULTY_CLASS_TAG } from "../../chapters/playing-the-game/tag-value-vocabulary";
import {
	INITIAL_TEMP_HP,
	MIN_TEMP_HP,
	TEMP_HP_ID,
	TEMP_HP_RECOVERY_RULE,
	TEMP_HP_SAFETY_MAX,
} from "../../chapters/playing-the-game/temp-hp-units";

/** `resource_definitions` shape every ability row carries (AGENTS.md "sister comparison"; ledger/playing-the-game.md). */
export const ABILITY_RESOURCE_BOUNDS = {
	min: 0,
	max: 30,
	initial: 10,
	recoveryRule: "persistent",
} as const;

/** The ONLY resource_definition_tag every ability carries — see index.ts's provenance header for why "core" is deliberately dropped. */
export const ABILITY_TAG = "srd.ability_score";

/** `capability_definitions.actor_kind` every skill carries. */
export const SKILL_ACTOR_KIND = "entity";

/** The non-ability-specific capability_definition_tag every skill carries (alongside `srd.ability.<code>`). */
export const SKILL_TAG = "srd.skill";

/**
 * The governing-ability ref-tag prefix (finding #2's rename,
 * 2026-07-27): this bundle's own dotted `srd.` domain, not the sister's
 * `key=value` `ability=` convention — see `src/bundle-row.ts`'s tag_prefixes
 * for why. `${SKILL_ABILITY_TAG_PREFIX}${code}` is the full tag value.
 */
export const SKILL_ABILITY_TAG_PREFIX = "srd.ability.";

/** `capability_definitions.display_name` prefix every skill carries. */
export const SKILL_DISPLAY_NAME_PREFIX = "Skill: ";

export interface AbilityIdentityExpectation {
	code: string;
	resourceDefinitionId: string;
}

/** One expectation row per ability, ids qualified under `BUNDLE_ID` — the same id template `index.ts`'s generator uses. */
export function expectedAbilityIdentities(): AbilityIdentityExpectation[] {
	return buildAbilityUnits().map((unit) => ({
		code: unit.code,
		resourceDefinitionId: `${BUNDLE_ID}/${unit.code}`,
	}));
}

/** `resource_definitions` shape the `srd/level` row carries — sister-grounded bounds, see level-units.ts. */
export const LEVEL_RESOURCE_BOUNDS = {
	min: MIN_CHARACTER_LEVEL,
	max: MAX_CHARACTER_LEVEL,
	initial: INITIAL_CHARACTER_LEVEL,
	recoveryRule: "persistent",
} as const;

/** The single `srd/level` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities. */
export function expectedLevelIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${LEVEL_ID}` };
}

/** `resource_definitions` shape the `srd/proficiency_bonus` STAT row carries (sk-84i.4) — see `modifier-units.ts`'s own `PROFICIENCY_BONUS_STATE_ID` doc comment. */
export const PROFICIENCY_BONUS_RESOURCE_BOUNDS = {
	min: PROFICIENCY_BONUS_STATE_MIN,
	max: PROFICIENCY_BONUS_STATE_MAX,
	initial: PROFICIENCY_BONUS_STATE_MIN,
	recoveryRule: "persistent",
} as const;

/** The single `srd/proficiency_bonus` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level (sk-84i.4). */
export function expectedProficiencyBonusIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: PROFICIENCY_BONUS_STATE_ID };
}

/** `resource_definitions` shape the `srd/hp` row carries — see hp-units.ts's own module header for the safety-bound-ceiling reasoning. */
export const HP_RESOURCE_BOUNDS = {
	min: MIN_HP,
	max: HP_SAFETY_MAX,
	initial: INITIAL_HP,
	recoveryRule: HP_RECOVERY_RULE,
} as const;

/** The single `srd/hp` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level. */
export function expectedHpIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${HP_ID}` };
}

/** `resource_definitions` shape the `srd/temp_hp` row carries — see temp-hp-units.ts's own module header for the recovery_rule caveat. */
export const TEMP_HP_RESOURCE_BOUNDS = {
	min: MIN_TEMP_HP,
	max: TEMP_HP_SAFETY_MAX,
	initial: INITIAL_TEMP_HP,
	recoveryRule: TEMP_HP_RECOVERY_RULE,
} as const;

/** The single `srd/temp_hp` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp. */
export function expectedTempHpIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${TEMP_HP_ID}` };
}

/** `resource_definitions` shape the `srd/xp` row carries (C4, `advancement-units.ts`'s own module header). */
export const XP_RESOURCE_BOUNDS = {
	min: MIN_XP,
	max: MAX_XP,
	initial: INITIAL_XP,
	recoveryRule: XP_RECOVERY_RULE,
} as const;

/** The single `srd/xp` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp. */
export function expectedXpIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${XP_ID}` };
}

/** `resource_definitions` shape the `srd/hp_per_level` row carries (C4, `advancement-units.ts`'s own module header). */
export const HP_PER_LEVEL_RESOURCE_BOUNDS = {
	min: MIN_HP_PER_LEVEL,
	max: MAX_HP_PER_LEVEL,
	initial: INITIAL_HP_PER_LEVEL,
	recoveryRule: HP_PER_LEVEL_RECOVERY_RULE,
} as const;

/** The single `srd/hp_per_level` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp. */
export function expectedHpPerLevelIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${HP_PER_LEVEL_ID}` };
}

/** `resource_definitions` shape the `srd/xp_value` row carries (level-up DM arc S1, `advancement-units.ts`'s own module header). */
export const XP_VALUE_RESOURCE_BOUNDS = {
	min: MIN_XP_VALUE,
	max: MAX_XP_VALUE,
	initial: INITIAL_XP_VALUE,
	recoveryRule: XP_VALUE_RECOVERY_RULE,
} as const;

/** The single `srd/xp_value` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp. */
export function expectedXpValueIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${XP_VALUE_ID}` };
}

/** `resource_definitions` shape the `srd/speed-walk` row carries — see grid-units.ts's own module header. */
export const SPEED_WALK_RESOURCE_BOUNDS = {
	min: SPEED_WALK_MIN,
	max: SPEED_WALK_MAX,
	initial: SPEED_WALK_INITIAL,
	recoveryRule: SPEED_WALK_RECOVERY_RULE,
} as const;

/** The single `srd/speed-walk` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp. */
export function expectedSpeedWalkIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}` };
}

/** `resource_definitions` shape the `srd/speed-swim` row carries (ADR-0101 task 6.1) — see grid-units.ts's own module header. */
export const SPEED_SWIM_RESOURCE_BOUNDS = {
	min: SPEED_SWIM_MIN,
	max: SPEED_SWIM_MAX,
	initial: SPEED_SWIM_INITIAL,
	recoveryRule: SPEED_SWIM_RECOVERY_RULE,
} as const;

/** The single `srd/speed-swim` identity expectation — id qualified under `BUNDLE_ID`, same template as speed-walk. */
export function expectedSpeedSwimIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${SPEED_SWIM_RESOURCE_LOCAL_ID}` };
}

/** `resource_definitions` shape the `srd/speed-fly` row carries (ADR-0101 task 6.1) — see grid-units.ts's own module header. */
export const SPEED_FLY_RESOURCE_BOUNDS = {
	min: SPEED_FLY_MIN,
	max: SPEED_FLY_MAX,
	initial: SPEED_FLY_INITIAL,
	recoveryRule: SPEED_FLY_RECOVERY_RULE,
} as const;

/** The single `srd/speed-fly` identity expectation — id qualified under `BUNDLE_ID`, same template as speed-walk. */
export function expectedSpeedFlyIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${SPEED_FLY_RESOURCE_LOCAL_ID}` };
}

export const SPEED_CLIMB_RESOURCE_BOUNDS = {
	min: SPEED_CLIMB_MIN,
	max: SPEED_CLIMB_MAX,
	initial: SPEED_CLIMB_INITIAL,
	recoveryRule: SPEED_CLIMB_RECOVERY_RULE,
};

export function expectedSpeedClimbIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${SPEED_CLIMB_RESOURCE_LOCAL_ID}` };
}

/**
 * `resource_definitions` shape the `srd/size` row carries (O2, Character
 * Origins Species, `species-units.ts`'s own module header) — Tiny=1 ..
 * Gargantuan=6, KNOWINGLY CONSUMER-LESS today (operator ruling 2026-07-31).
 */
export const SIZE_RESOURCE_BOUNDS = {
	min: SIZE_MIN,
	max: SIZE_MAX,
	initial: SIZE_INITIAL,
	recoveryRule: SIZE_RECOVERY_RULE,
} as const;

/** The single `srd/size` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp/speed-walk. */
export function expectedSizeIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${SIZE_RESOURCE_LOCAL_ID}` };
}

/**
 * `resource_definitions` shape the `srd/hit-die` row carries (K1, Classes,
 * `classes-units.ts`'s own module header) — d6..d12, an honest bound (the 4
 * real die sizes the 12 base classes use), not a safety-bound ceiling.
 */
export const HIT_DIE_RESOURCE_BOUNDS = {
	min: HIT_DIE_MIN,
	max: HIT_DIE_MAX,
	initial: HIT_DIE_INITIAL,
	recoveryRule: HIT_DIE_RECOVERY_RULE,
} as const;

/** The single `srd/hit-die` identity expectation — id qualified under `BUNDLE_ID`, same template as abilities/level/hp/speed-walk/size. */
export function expectedHitDieIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${HIT_DIE_RESOURCE_LOCAL_ID}` };
}

/**
 * `resource_definitions` shape the `srd/fighter/second-wind-uses` row
 * carries (K2, Classes Fighter vertical, `fighter-units.ts`'s own module
 * header) — the recovery_rule caveat there mirrors `temp-hp-units.ts`'s own
 * (finding #31): descriptive metadata only, not enforced.
 */
export const SECOND_WIND_USES_RESOURCE_BOUNDS = {
	min: SECOND_WIND_USES_MIN,
	max: SECOND_WIND_USES_MAX,
	initial: SECOND_WIND_USES_INITIAL,
	recoveryRule: SECOND_WIND_RECOVERY_RULE,
} as const;

/** The single `srd/fighter/second-wind-uses` identity expectation — already fully qualified (`fighter-units.ts` builds it as `${BUNDLE_ID}/fighter/second-wind-uses`, not a bare local id under this file's own template). */
export function expectedSecondWindUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: SECOND_WIND_USES_RESOURCE_ID };
}

/** The single `srd/class-feature/fighter/second-wind` capability id (K2 — Second Wind mechanized LIVE). */
export function expectedSecondWindCapabilityId(): string {
	return SECOND_WIND_CAPABILITY_ID;
}

/**
 * `resource_definitions` shape the `srd/fighter/action-surge-uses` row
 * carries (K2, Classes Fighter vertical, D10 rework — `fighter-units.ts`'s
 * own module header): `initial: 0` is the D10 CRITICAL requirement (the
 * charge arrives at runtime via the level-up DM's own apply-level-up
 * consequence, never a seed-time value).
 */
export const ACTION_SURGE_USES_RESOURCE_BOUNDS = {
	min: ACTION_SURGE_USES_MIN,
	max: ACTION_SURGE_USES_MAX,
	initial: ACTION_SURGE_USES_INITIAL,
	recoveryRule: ACTION_SURGE_RECOVERY_RULE,
} as const;

/** The single `srd/fighter/action-surge-uses` identity expectation — already fully qualified (`fighter-units.ts` builds it as `${BUNDLE_ID}/fighter/action-surge-uses`). */
export function expectedActionSurgeUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: ACTION_SURGE_USES_RESOURCE_ID };
}

/** The single `srd/class-feature/fighter/action-surge` capability id (K2, D10 rework — Action Surge mechanized LIVE). */
export function expectedActionSurgeCapabilityId(): string {
	return ACTION_SURGE_CAPABILITY_ID;
}

/** Martial L1-4 mechanized class-feature capability ids (slice 1 + slice 2). */
export function expectedMartialClassFeatureCapabilityIds(): string[] {
	return [
		RAGE_CAPABILITY_ID,
		RECKLESS_ATTACK_CAPABILITY_ID,
		MONKS_FOCUS_CAPABILITY_ID,
		CUNNING_ACTION_CAPABILITY_ID,
		STEADY_AIM_CAPABILITY_ID,
		// slice 2
		"srd/class-feature/barbarian/danger-sense",
		"srd/class-feature/barbarian/path-of-the-berserker/frenzy",
		"srd/class-feature/monk/martial-arts",
		"srd/class-feature/monk/unarmored-movement",
		"srd/class-feature/monk/deflect-attacks",
		"srd/class-feature/monk/slow-fall",
		"srd/class-feature/rogue/thieves-cant",
		"srd/class-feature/rogue/sneak-attack",
		"srd/class-feature/bard/jack-of-all-trades",
		"srd/class-feature/fighter/champion/improved-critical",
		"srd/class-feature/fighter/champion/remarkable-athlete",
		"srd/class-feature/rogue/thief/fast-hands",
		"srd/class-feature/rogue/thief/second-story-work",
		// 18 expertise capabilities
		...[
			"acrobatics",
			"animal-handling",
			"arcana",
			"athletics",
			"deception",
			"history",
			"insight",
			"intimidation",
			"investigation",
			"medicine",
			"nature",
			"perception",
			"performance",
			"persuasion",
			"religion",
			"sleight-of-hand",
			"stealth",
			"survival",
		].map((slug) => `srd/expertise/${slug}`),
	];
}

/** L3 caster-feature resources (docs/caster-features-l1-4.md). */
export const CLERIC_CD_USES_RESOURCE_BOUNDS = {
	min: CLERIC_CD_USES_MIN,
	max: CLERIC_CD_USES_MAX,
	initial: CLERIC_CD_USES_INITIAL,
	recoveryRule: CLERIC_CD_RECOVERY_RULE,
} as const;
export function expectedClericCdUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: CLERIC_CD_USES_RESOURCE_ID };
}
export const PALADIN_CD_USES_RESOURCE_BOUNDS = {
	min: PALADIN_CD_USES_MIN,
	max: PALADIN_CD_USES_MAX,
	initial: PALADIN_CD_USES_INITIAL,
	recoveryRule: CLERIC_CD_RECOVERY_RULE,
} as const;
export function expectedPaladinCdUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: PALADIN_CD_USES_RESOURCE_ID };
}
export const BARDIC_USES_RESOURCE_BOUNDS = {
	min: BARDIC_USES_MIN,
	max: BARDIC_USES_MAX,
	initial: BARDIC_USES_INITIAL,
	recoveryRule: "long_rest",
} as const;
export function expectedBardicUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: BARDIC_USES_RESOURCE_ID };
}
export const WILD_SHAPE_USES_RESOURCE_BOUNDS = {
	min: WILD_SHAPE_USES_MIN,
	max: WILD_SHAPE_USES_MAX,
	initial: WILD_SHAPE_USES_INITIAL,
	recoveryRule: CLERIC_CD_RECOVERY_RULE,
} as const;
export function expectedWildShapeUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: WILD_SHAPE_USES_RESOURCE_ID };
}
export const LAY_ON_HANDS_RESOURCE_BOUNDS = {
	min: LAY_ON_HANDS_MIN,
	max: LAY_ON_HANDS_MAX,
	initial: LAY_ON_HANDS_INITIAL,
	recoveryRule: "long_rest",
} as const;
export function expectedLayOnHandsIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: LAY_ON_HANDS_RESOURCE_ID };
}
export const FAVORED_ENEMY_USES_RESOURCE_BOUNDS = {
	min: FAVORED_ENEMY_USES_MIN,
	max: FAVORED_ENEMY_USES_MAX,
	initial: FAVORED_ENEMY_USES_INITIAL,
	recoveryRule: "long_rest",
} as const;
export function expectedFavoredEnemyUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: FAVORED_ENEMY_USES_RESOURCE_ID };
}
export const INNATE_SORCERY_USES_RESOURCE_BOUNDS = {
	min: INNATE_SORCERY_USES_MIN,
	max: INNATE_SORCERY_USES_MAX,
	initial: INNATE_SORCERY_USES_INITIAL,
	recoveryRule: "long_rest",
} as const;
export function expectedInnateSorceryUsesIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: INNATE_SORCERY_USES_RESOURCE_ID };
}
export const SORCERY_POINTS_RESOURCE_BOUNDS = {
	min: SORCERY_POINTS_MIN,
	max: SORCERY_POINTS_MAX,
	initial: SORCERY_POINTS_INITIAL,
	recoveryRule: "long_rest",
} as const;
export function expectedSorceryPointsIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: SORCERY_POINTS_RESOURCE_ID };
}

/** All L3 caster-feature resource ids (for resources.test.ts list equality). */
export function expectedCasterFeatureResourceIds(): string[] {
	return [
		CLERIC_CD_USES_RESOURCE_ID,
		PALADIN_CD_USES_RESOURCE_ID,
		BARDIC_USES_RESOURCE_ID,
		WILD_SHAPE_USES_RESOURCE_ID,
		LAY_ON_HANDS_RESOURCE_ID,
		FAVORED_ENEMY_USES_RESOURCE_ID,
		INNATE_SORCERY_USES_RESOURCE_ID,
		SORCERY_POINTS_RESOURCE_ID,
		// L12b / BL-70
		"srd/wizard/arcane-recovery-uses",
		"srd/warlock/magical-cunning-uses",
	];
}

/** L3 caster-feature gate capability ids (all tagged srd.action only). */
export function expectedCasterFeatureCapabilityIds(): string[] {
	return [
		CLERIC_CD_CAPABILITY_ID,
		PALADIN_CD_CAPABILITY_ID,
		BARDIC_CAPABILITY_ID,
		WILD_SHAPE_CAPABILITY_ID,
		LAY_ON_HANDS_CAPABILITY_ID,
		FAVORED_ENEMY_CAPABILITY_ID,
		INNATE_SORCERY_CAPABILITY_ID,
		// L12b / BL-70
		"srd/class-feature/wizard/arcane-recovery",
		"srd/class-feature/warlock/magical-cunning",
		// L12c / sk-609b.12.3
		"srd/class-feature/cleric/life-domain/disciple-of-life",
		"srd/class-feature/cleric/life-domain/preserve-life",
		"srd/class-feature/druid/wild-companion",
		"srd/class-feature/paladin/divine-smite",
		"srd/class-feature/sorcerer/font-of-magic",
		"srd/eldritch-invocation/armor-of-shadows",
		"srd/metamagic/careful-spell",
	];
}

/** `resource_definitions` shape the binary Heroic Inspiration possession row carries. */
export const HEROIC_INSPIRATION_RESOURCE_BOUNDS = {
	min: MIN_HEROIC_INSPIRATION,
	max: MAX_HEROIC_INSPIRATION,
	initial: INITIAL_HEROIC_INSPIRATION,
	recoveryRule: HEROIC_INSPIRATION_RECOVERY_RULE,
} as const;

/** The single Heroic Inspiration identity expectation. */
export function expectedHeroicInspirationIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: `${BUNDLE_ID}/${HEROIC_INSPIRATION_ID}` };
}

export interface SkillIdentityExpectation {
	slug: string;
	capabilityId: string;
	governingAbility: string;
}

/** One expectation row per skill, ids qualified under `BUNDLE_ID` — the same id template `index.ts`'s generator uses. */
export function expectedSkillIdentities(): SkillIdentityExpectation[] {
	return buildSkillUnits().map((unit) => ({
		slug: unit.slug,
		capabilityId: `${BUNDLE_ID}/skill/${unit.slug}`,
		governingAbility: unit.governingAbility,
	}));
}

/** `capability_definitions.actor_kind` every action carries — same as skills. */
export const ACTION_ACTOR_KIND = "entity";

/** The ONE capability_definition_tag every action carries. */
export const ACTION_TAG = "srd.action";

/** The exact tag set Second Wind's own capability carries (`classes/index.ts`'s `capability:class-feature/fighter/second-wind` call) — `srd.action` (every mechanized action-gating capability) PLUS the class-feature identity tags, unlike the ACTION_TAG-only supplemental group. */
export const SECOND_WIND_CAPABILITY_TAGS = [
	ACTION_TAG,
	CLASS_FEATURE_TAG_PREFIX,
	`${CLASS_FEATURE_TAG_PREFIX}.second-wind`,
	FIGHTER_CLASS_TAG,
] as const;

/** The exact tag set Action Surge's own capability carries (`classes/index.ts`'s `buildActionSurgeFragment`, D10 rework) — the SAME shape Second Wind's own tag set uses. */
export const ACTION_SURGE_CAPABILITY_TAGS = [
	ACTION_TAG,
	CLASS_FEATURE_TAG_PREFIX,
	`${CLASS_FEATURE_TAG_PREFIX}.action-surge`,
	FIGHTER_CLASS_TAG,
] as const;

/** `capability_definitions.display_name` prefix every action carries. */
export const ACTION_DISPLAY_NAME_PREFIX = "Action: ";

export interface ActionIdentityExpectation {
	slug: string;
	capabilityId: string;
}

/** One expectation row per action, ids qualified under `BUNDLE_ID` — the same id template `index.ts`'s generator uses. */
export function expectedActionIdentities(): ActionIdentityExpectation[] {
	return buildActionUnits().map((unit) => ({
		slug: unit.slug,
		capabilityId: `${BUNDLE_ID}/action/${unit.slug}`,
	}));
}

/**
 * D6 (actor-carried-verbs, sk-o8k): the per-creature `srd/creature/<slug>/
 * action` capabilities `starter-behaviors.ts` grants — derived from that
 * module's own `buildStarterBehaviors().capabilityIds` (never a hand-listed
 * slug set — Wolf/Zombie are deliberately absent, see that field's own doc
 * comment).
 */
export function expectedStarterCreatureCapabilityIds(): string[] {
	return buildStarterBehaviors().capabilityIds;
}

/**
 * Capabilities used by real completion/mechanic verbs; not one of the SRD's
 * 12 `[Action]` identities — all carry the `srd.action`
 * `capability_definition_tag`. `LEVEL_UP_CAPABILITY_ID` is C4's
 * `srd/advancement/level-up` action's required capability
 * (`advancement-units.ts`). `LONG_REST_CAPABILITY_ID` is O3's Long Rest
 * completion action (`rest.ts`'s own O3-consumer comment, Resourceful).
 * `DROP_PRONE_CAPABILITY_ID` is Prone Slice B's Dropping Prone free action
 * (`fragments/drop-prone.ts`). `STAND_UP_CAPABILITY_ID` is sk-0m4.123 part
 * 3's Standing Up action, gated on Prone (`fragments/stand-up.ts`).
 * `CLAIM_VICTORY_CAPABILITY_ID` is the level-up
 * DM arc S1's `srd/claim-victory` action's required capability
 * (`advancement-units.ts`). `BASELINE_COMMUNICATE_CAPABILITY_ID` is the
 * level-up DM arc S4a's baseline srd-own communicate primitive
 * (`fragments/communication.ts`). `SPEAK_CAPABILITY_ID` is the srd/speech
 * mechanic's shared eligibility capability for `srd/speak-aloud` and
 * `srd/speak-to-room` (`fragments/speech.ts`). `TELEPATHY_CAPABILITY_ID` is
 * the ranged directed communicate verb (`srd/communicate/telepathy`). Weapon variants reuse the
 * catalogued Attack capability and are gated by wielded-item facts instead.
 * `PICKUP_CAPABILITY_ID` is sk-jay0.1.23.36.22.4's Pick Up free object
 * interaction (`fragments/pickup.ts`); `CONSUME_CAPABILITY_ID` is
 * sk-jay0.1.23.36.22.10's Use a Consumable gate (`fragments/consume.ts`).
 */
export function expectedSupplementalCapabilityIds(): string[] {
	return [
		SHORT_REST_CAPABILITY_ID,
		HEROIC_INSPIRATION_REROLL_CAPABILITY_ID,
		LEVEL_UP_CAPABILITY_ID,
		LONG_REST_CAPABILITY_ID,
		DROP_PRONE_CAPABILITY_ID,
		STAND_UP_CAPABILITY_ID,
		CLAIM_VICTORY_CAPABILITY_ID,
		BASELINE_COMMUNICATE_CAPABILITY_ID,
		SPEAK_CAPABILITY_ID,
		TELEPATHY_CAPABILITY_ID,
		PICKUP_CAPABILITY_ID,
		CONSUME_CAPABILITY_ID,
	];
}

/**
 * `srd/capability/walk` (`fragments/grid.ts`, promoted from bare —
 * `prone-free-action.md` Slice B item 4): a real `capability_definitions`
 * row like the supplementals above, but carries NO `capability_definition_
 * tag` row — it is a grid-traversal gate, not one of the SRD's 12 named
 * `[Action]`s, so tagging it `srd.action` would misrepresent it. Kept
 * SEPARATE from `expectedSupplementalCapabilityIds()`, whose own tag-test
 * consumer assumes every listed id carries exactly `{srd.action}`.
 */
export function expectedUntaggedSupplementalCapabilityIds(): string[] {
	// srd/capability/{swim,fly} (ADR-0101 task 6.1, fragments/grid.ts): same
	// shape as srd/capability/walk above — grid-traversal gates, not one of
	// the SRD's named [Action]s, so no capability_definition_tag row.
	return [WALK_CAPABILITY_ID, SWIM_CAPABILITY_ID, FLY_CAPABILITY_ID, CLIMB_CAPABILITY_ID];
}

export function expectedTraitCapabilityIds(): string[] {
	return [`${BUNDLE_ID}/action/dragonborn/breath-weapon`, `${BUNDLE_ID}/capability/darkvision`];
}

export function expectedEquipmentCapabilityIds(): readonly [string, string, ...string[]] {
	return [
		THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
		LOCK_PICKING_CHECK_CAPABILITY_ID,
		...choiceToolUnits()
			.map((unit) => unit.proficiencyCapabilityId)
			.filter((id) => id !== CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID),
	];
}

export const EQUIPMENT_PROFICIENCY_TAG = "srd.tool_proficiency";

/**
 * O1 (Character Origins, `ledger/character-origins.md`): the TWO net-new
 * tool-proficiency capabilities Backgrounds reference (Calligrapher's
 * Supplies — Acolyte + Sage; Gaming Set, Dice — Soldier's concrete
 * authorial pick), shipped in `equipment-proficiencies-units.ts` alongside
 * the existing Thieves' Tools one — never granted to any actor in the base
 * bundle.
 */
export function expectedOriginToolProficiencyCapabilityIds(): readonly [string, string] {
	return [
		CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
		GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	];
}

/** Feats chapter capability rows: Alert (F1 Origin) + ASI (L4 General). */
export function expectedFeatsCapabilityIds(): readonly [string, string] {
	return [ALERT_CAPABILITY_ID, ASI_CAPABILITY_ID];
}

/** The exact tag set Alert's gate capability carries (`feats/index.ts`'s `capability:feat/alert` call). */
export const FEATS_CAPABILITY_TAGS = ["srd.feat", "srd.feat.origin"] as const;

/** ASI gate capability tags (`asi-units.ts`). */
export const ASI_CAPABILITY_TAGS = ["srd.feat", "srd.feat.general"] as const;

/** `resource_definitions` shape every generic-check DC-override row carries — see generic-check-units.ts's own module header. */
export const GENERIC_CHECK_DC_RESOURCE_BOUNDS = {
	min: 0,
	initial: 0,
	recoveryRule: "persistent",
} as const;

/** The ONE resource_definition_tag every generic-check DC override carries. */
export const GENERIC_CHECK_DC_TAG = DIFFICULTY_CLASS_TAG;

export interface GenericCheckDcIdentityExpectation {
	slug: string;
	resourceDefinitionId: string;
}

/**
 * One expectation row per generic-check DC-override resource (18 skills + 6
 * abilities), ids qualified under `BUNDLE_ID` — the same id template
 * `index.ts`'s generator uses. `max` bound is DERIVED from `maxTypicalDc()`
 * (the same cached-table read `index.ts` uses), never a hand-typed literal.
 */
export function expectedGenericCheckDcIdentities(): GenericCheckDcIdentityExpectation[] {
	return buildGenericCheckSubjects().map((subject) => ({
		slug: subject.slug,
		resourceDefinitionId: `${BUNDLE_ID}/${genericCheckDcOverrideSuffix(subject)}`,
	}));
}

export function expectedGenericCheckDcMaxBound(): number {
	return maxTypicalDc();
}

/** `capability_definitions.actor_kind` every generic-check verb carries (slice 2). */
export const GENERIC_CHECK_VERB_ACTOR_KIND = "entity";

/** The ONE capability_definition_tag every generic-check verb carries (slice 2). */
export const GENERIC_CHECK_VERB_TAG = "srd.check";

export interface GenericCheckVerbIdentityExpectation {
	slug: string;
	capabilityId: string;
}

/**
 * One expectation row per generic-check verb (18 skills + 6 abilities,
 * `srd/check/<slug>`, slice 2) — ids qualified under `BUNDLE_ID`, same id
 * template `index.ts`'s generator uses.
 */
export function expectedGenericCheckVerbIdentities(): GenericCheckVerbIdentityExpectation[] {
	return buildGenericCheckSubjects().map((subject) => ({
		slug: subject.slug,
		capabilityId: `${BUNDLE_ID}/${genericCheckCapabilitySuffix(subject)}`,
	}));
}

/**
 * `resource_definitions` shape the centrally authored `srd/ac` row carries
 * (`ledger/designs/equipment-ac-target-fact.md`); see `equipment/armor-
 * units.ts`'s own module header for the resource-vs-object_state
 * representation decision.
 */
export const AC_RESOURCE_BOUNDS = {
	min: AC_RESOURCE_MIN,
	max: AC_RESOURCE_MAX,
	initial: AC_RESOURCE_INITIAL,
	recoveryRule: "persistent",
} as const;

/** The single `srd/ac` identity expectation — same id template as every other stat row. */
export function expectedAcIdentity(): { resourceDefinitionId: string } {
	return { resourceDefinitionId: AC_RESOURCE_ID };
}

/**
 * Character Creation's Choose Languages catalog (C2, `ledger/
 * character-creation.md`): 1 class row (`srd.language`) + 19 per-language
 * `tag_value_definitions` rows (10 Standard + 9 Rare), identity/discovery
 * vocabulary only — no actor is tagged yet (deferred to C3).
 */
export const LANGUAGE_CLASS_TAG = "srd.language";

export interface LanguageIdentityExpectation {
	slug: string;
	tag: string;
}

/** One expectation row per language — DERIVED from the same `buildLanguageUnits`/`languageTag` the generator itself calls, never a re-typed literal list. */
export function expectedLanguageIdentities(): LanguageIdentityExpectation[] {
	return buildLanguageUnits().map((unit) => ({ slug: unit.slug, tag: languageTag(unit) }));
}

/** Slugs of the 10 Standard Languages, in SRD table order (Common first). */
export function expectedStandardLanguageSlugs(): string[] {
	return buildLanguageUnits()
		.filter((unit) => unit.membership === "standard")
		.map((unit) => unit.slug);
}

/** Slugs of the 9 Rare Languages, in SRD table order. */
export function expectedRareLanguageSlugs(): string[] {
	return buildLanguageUnits()
		.filter((unit) => unit.membership === "rare")
		.map((unit) => unit.slug);
}

/** Slugs of the two secret languages (Druidic, Thieves' Cant) — grounded in `Language.json`'s own `is_secret` field. */
export function expectedSecretLanguageSlugs(): string[] {
	return buildLanguageUnits()
		.filter((unit) => unit.isSecret)
		.map((unit) => unit.slug);
}

/** Equipment facts share the SRD bundle with the actor identity resources. */
export function expectedItemMeasureResourceIds(): string[] {
	return [
		COST_CP_RESOURCE_ID,
		WEIGHT_LB10_RESOURCE_ID,
		ARMOR_AC_BASE_RESOURCE_ID,
		ARMOR_DEX_CAP_RESOURCE_ID,
		ARMOR_STR_REQUIRED_RESOURCE_ID,
		ARMOR_STEALTH_DISADVANTAGE_RESOURCE_ID,
	];
}
