// pattern: identity-tag-capability-grant
// Martial class features L1-4 (Barbarian / Fighter extras / Monk / Rogue) —
// constants + pure helpers. Fragment builders live in `martial-fragments.ts`.
// Design: `bead sk-609b.3 (design trail)`. Exemplar shapes: Second
// Wind (`fighter-units.ts`) + Dodge ApplyStatus
// (`playing-the-game/fragments/dodge.ts`).
//
// SOURCES (cache citations, never memory):
//   Barbarian Rage          classes.md:234-256 + ClassFeatureItem rages/rage-damage
//   Barbarian Unarmored Def classes.md:258
//   Reckless Attack         classes.md:272
//   Danger Sense            classes.md:268
//   Monk Unarmored Def      classes.md:5145
//   Monk's Focus            classes.md:5149 + ClassFeatureItem focus-points
//   Unarmored Movement      classes.md:5166
//   Deflect Attacks         classes.md:5176
//   Rogue Sneak Attack      classes.md:7039
//   Cunning Action          classes.md:7055
//   Steady Aim              classes.md:7063
//   Expertise / Thieves' Cant classes.md:7033 / :7045

import { readClassFeatureItems } from "../../open5e/class-feature";
import { BONUS_CHANNEL_ID } from "../playing-the-game/action-economy-units";
import { CLASS_FEATURE_TAG_PREFIX } from "./fighter-units";

export const BUNDLE_ID = "srd";

// --- Barbarian: Rage --------------------------------------------------------

export const RAGE_ANCHOR = "classes.md:234-256 (§ Barbarian > Level 1: Rage)";
export const RAGE_USES_LOCAL_ID = "barbarian/rage-uses";
export const RAGE_USES_RESOURCE_ID = `${BUNDLE_ID}/${RAGE_USES_LOCAL_ID}`;
export const RAGE_USES_DISPLAY_NAME = "Rage Uses";
export const RAGE_USES_MIN = 0;
/** ClassFeatureItem `srd-2024_barbarian_rages` ceiling at level 20 = 6. */
export const RAGE_USES_MAX = 6;
/** Level-1 column value. */
export const RAGE_USES_INITIAL = 2;
export const RAGE_RECOVERY_RULE = "short_rest_partial_long_rest_full";

export const RAGE_CAPABILITY_LOCAL_ID = "class-feature/barbarian/rage";
export const RAGE_CAPABILITY_ID = `${BUNDLE_ID}/${RAGE_CAPABILITY_LOCAL_ID}`;
export const RAGE_NICHE_ID = `capability:${RAGE_CAPABILITY_ID}`;
export const RAGE_ACTION_LOCAL_ID = "barbarian/rage";
export const RAGE_ACTION_ID = `${BUNDLE_ID}/${RAGE_ACTION_LOCAL_ID}`;
export const RAGE_CONDITION_LOCAL_ID = "condition/raging";
export const RAGE_CONDITION_ID = `${BUNDLE_ID}/${RAGE_CONDITION_LOCAL_ID}`;
export const RAGE_CHANNEL_ID = BONUS_CHANNEL_ID;

/**
 * L1–8 Rage Damage band is +2 (`ClassFeatureItem` rage-damage column). Higher
 * bands (+3/+4) are a follow-up once a level-fed resource is wired; this lane
 * only needs L1–4 playability.
 */
export const RAGE_DAMAGE_BONUS_L1_TO_8 = 2;

export function rageGatePredicateSource(): string {
	return `actor.stat('${RAGE_USES_RESOURCE_ID}') >= 1`;
}

/** True while the acting creature carries the Rage condition. */
export function ragingStatusPredicateSource(): string {
	return `actor.status('${RAGE_CONDITION_ID}') == true`;
}

/** Additive damage term folded into melee/unarmed deltas while raging. */
export function rageDamageBonusExpr(): string {
	return `cond(${ragingStatusPredicateSource()}, ${RAGE_DAMAGE_BONUS_L1_TO_8}, 0)`;
}

export function rageUsesColumn(): { level: number; uses: number }[] {
	const items = readClassFeatureItems("srd-2024_barbarian_rages");
	return items.map((item) => {
		if (item.columnValue === null) {
			throw new Error(
				`martial-features-units: barbarian rages item at level ${item.level} has null column_value.`,
			);
		}
		return { level: item.level, uses: Number.parseInt(item.columnValue, 10) };
	});
}

export function rageDamageColumn(): { level: number; bonus: number }[] {
	const items = readClassFeatureItems("srd-2024_barbarian_rage-damage");
	return items.map((item) => {
		if (item.columnValue === null) {
			throw new Error(
				`martial-features-units: rage-damage item at level ${item.level} has null column_value.`,
			);
		}
		const raw = item.columnValue.replace(/^\+/, "");
		return { level: item.level, bonus: Number.parseInt(raw, 10) };
	});
}

// --- Barbarian: Reckless Attack ---------------------------------------------

export const RECKLESS_ATTACK_ANCHOR = "classes.md:272-274 (§ Barbarian > Level 2: Reckless Attack)";
export const RECKLESS_ATTACK_CAPABILITY_LOCAL_ID = "class-feature/barbarian/reckless-attack";
export const RECKLESS_ATTACK_CAPABILITY_ID = `${BUNDLE_ID}/${RECKLESS_ATTACK_CAPABILITY_LOCAL_ID}`;
export const RECKLESS_ATTACK_NICHE_ID = `capability:${RECKLESS_ATTACK_CAPABILITY_ID}`;
export const RECKLESS_ATTACK_ACTION_LOCAL_ID = "barbarian/reckless-attack";
export const RECKLESS_ATTACK_ACTION_ID = `${BUNDLE_ID}/${RECKLESS_ATTACK_ACTION_LOCAL_ID}`;
export const RECKLESS_ATTACK_CONDITION_LOCAL_ID = "condition/reckless-attacking";
export const RECKLESS_ATTACK_CONDITION_ID = `${BUNDLE_ID}/${RECKLESS_ATTACK_CONDITION_LOCAL_ID}`;
export const RECKLESS_ATTACKED_CONDITION_LOCAL_ID = "condition/reckless-attacked";
export const RECKLESS_ATTACKED_CONDITION_ID = `${BUNDLE_ID}/${RECKLESS_ATTACKED_CONDITION_LOCAL_ID}`;

// --- Barbarian / Monk: Unarmored Defense macros -----------------------------

export const BARBARIAN_UNARMORED_DEFENSE_ANCHOR =
	"classes.md:258-260 (§ Barbarian > Level 1: Unarmored Defense)";
export const BARBARIAN_UNARMORED_AC_MACRO_ID = `${BUNDLE_ID}/barbarian_unarmored_ac`;
/** Floor-correct ability-mod term for one ability resource id (derived-values.md). */
function abilityModBody(abilityResourceId: string): string {
	const score = `actor.effective('${abilityResourceId}')`;
	return `(((${score})) - 10) / 2 + cond((((${score})) - 10) - ((((${score})) - 10) / 2) * 2 < 0, -1, 0)`;
}
/**
 * 10 + Dex mod + Con mod. Body inlines the ability-mod formula (MF-DSL-MACRO-IN-BODY:
 * macro bodies are leaves — same posture as `srd/dexterity_modifier`).
 */
export const BARBARIAN_UNARMORED_AC_MACRO_BODY = `10 + (${abilityModBody(`${BUNDLE_ID}/dex`)}) + (${abilityModBody(`${BUNDLE_ID}/con`)})`;

export const MONK_UNARMORED_DEFENSE_ANCHOR =
	"classes.md:5145-5147 (§ Monk > Level 1: Unarmored Defense)";
export const MONK_UNARMORED_AC_MACRO_ID = `${BUNDLE_ID}/monk_unarmored_ac`;
export const MONK_UNARMORED_AC_MACRO_BODY = `10 + (${abilityModBody(`${BUNDLE_ID}/dex`)}) + (${abilityModBody(`${BUNDLE_ID}/wis`)})`;

// --- Monk: Focus ------------------------------------------------------------

export const MONKS_FOCUS_ANCHOR = "classes.md:5149-5164 (§ Monk > Level 2: Monk's Focus)";
export const FOCUS_POINTS_LOCAL_ID = "monk/focus-points";
export const FOCUS_POINTS_RESOURCE_ID = `${BUNDLE_ID}/${FOCUS_POINTS_LOCAL_ID}`;
export const FOCUS_POINTS_DISPLAY_NAME = "Focus Points";
export const FOCUS_POINTS_MIN = 0;
/** ClassFeatureItem focus-points ceiling at level 20 = 20. */
export const FOCUS_POINTS_MAX = 20;
/** Level-2 column value (feature arrives at L2). */
export const FOCUS_POINTS_INITIAL = 2;
export const FOCUS_POINTS_RECOVERY_RULE = "short_rest_partial_long_rest_full";

export const MONKS_FOCUS_CAPABILITY_LOCAL_ID = "class-feature/monk/monks-focus";
export const MONKS_FOCUS_CAPABILITY_ID = `${BUNDLE_ID}/${MONKS_FOCUS_CAPABILITY_LOCAL_ID}`;

export const FLURRY_ACTION_LOCAL_ID = "monk/flurry-of-blows";
export const FLURRY_ACTION_ID = `${BUNDLE_ID}/${FLURRY_ACTION_LOCAL_ID}`;
export const FLURRY_NICHE_ID = `capability:${MONKS_FOCUS_CAPABILITY_ID}/flurry`;

export const PATIENT_DEFENSE_ACTION_LOCAL_ID = "monk/patient-defense";
export const PATIENT_DEFENSE_ACTION_ID = `${BUNDLE_ID}/${PATIENT_DEFENSE_ACTION_LOCAL_ID}`;
export const PATIENT_DEFENSE_NICHE_ID = `capability:${MONKS_FOCUS_CAPABILITY_ID}/patient-defense`;

export const STEP_OF_THE_WIND_NICHE_ID = `capability:${MONKS_FOCUS_CAPABILITY_ID}/step-of-the-wind`;
/** Step of the Wind's Dash option (`monk/step-of-the-wind/dash`) — split from Disengage, same shape as Rogue's Cunning Action. */
export const STEP_OF_THE_WIND_DASH_ACTION_LOCAL_ID = "monk/step-of-the-wind/dash";
export const STEP_OF_THE_WIND_DASH_ACTION_ID = `${BUNDLE_ID}/${STEP_OF_THE_WIND_DASH_ACTION_LOCAL_ID}`;
/** Step of the Wind's Disengage option (`monk/step-of-the-wind/disengage`) — split from Dash, same shape as Rogue's Cunning Action. */
export const STEP_OF_THE_WIND_DISENGAGE_ACTION_LOCAL_ID = "monk/step-of-the-wind/disengage";
export const STEP_OF_THE_WIND_DISENGAGE_ACTION_ID = `${BUNDLE_ID}/${STEP_OF_THE_WIND_DISENGAGE_ACTION_LOCAL_ID}`;

export function focusPointsGatePredicateSource(): string {
	return `actor.stat('${FOCUS_POINTS_RESOURCE_ID}') >= 1`;
}

export function focusPointsColumn(): { level: number; points: number }[] {
	const items = readClassFeatureItems("srd-2024_monk_focus-points");
	return items.map((item) => {
		if (item.columnValue === null) {
			throw new Error(
				`martial-features-units: focus-points item at level ${item.level} has null column_value.`,
			);
		}
		return { level: item.level, points: Number.parseInt(item.columnValue, 10) };
	});
}

// --- Rogue: Cunning Action / Steady Aim -------------------------------------

export const CUNNING_ACTION_ANCHOR = "classes.md:7055-7057 (§ Rogue > Level 2: Cunning Action)";
export const CUNNING_ACTION_CAPABILITY_LOCAL_ID = "class-feature/rogue/cunning-action";
export const CUNNING_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/${CUNNING_ACTION_CAPABILITY_LOCAL_ID}`;
export const CUNNING_ACTION_DASH_LOCAL_ID = "rogue/cunning-action/dash";
export const CUNNING_ACTION_DASH_ID = `${BUNDLE_ID}/${CUNNING_ACTION_DASH_LOCAL_ID}`;
export const CUNNING_ACTION_DISENGAGE_LOCAL_ID = "rogue/cunning-action/disengage";
export const CUNNING_ACTION_DISENGAGE_ID = `${BUNDLE_ID}/${CUNNING_ACTION_DISENGAGE_LOCAL_ID}`;
export const CUNNING_ACTION_NICHE_ID = `capability:${CUNNING_ACTION_CAPABILITY_ID}`;

export const STEADY_AIM_ANCHOR = "classes.md:7063-7069 (§ Rogue > Level 3: Steady Aim)";
export const STEADY_AIM_CAPABILITY_LOCAL_ID = "class-feature/rogue/steady-aim";
export const STEADY_AIM_CAPABILITY_ID = `${BUNDLE_ID}/${STEADY_AIM_CAPABILITY_LOCAL_ID}`;
export const STEADY_AIM_ACTION_LOCAL_ID = "rogue/steady-aim";
export const STEADY_AIM_ACTION_ID = `${BUNDLE_ID}/${STEADY_AIM_ACTION_LOCAL_ID}`;
export const STEADY_AIM_NICHE_ID = `capability:${STEADY_AIM_CAPABILITY_ID}`;
export const STEADY_AIM_CONDITION_LOCAL_ID = "condition/steady-aim";
export const STEADY_AIM_CONDITION_ID = `${BUNDLE_ID}/${STEADY_AIM_CONDITION_LOCAL_ID}`;

export const SNEAK_ATTACK_ANCHOR = "classes.md:7039-7043 (§ Rogue > Level 1: Sneak Attack)";
export const EXPERTISE_ANCHOR = "classes.md:7033-7037 (§ Rogue > Level 1: Expertise)";
export const THIEVES_CANT_ANCHOR = "classes.md:7045-7053 (§ Rogue > Level 1: Thieves' Cant)";
export const DANGER_SENSE_ANCHOR = "classes.md:268-270 (§ Barbarian > Level 2: Danger Sense)";
export const MARTIAL_ARTS_ANCHOR = "classes.md:5130-5143 (§ Monk > Level 1: Martial Arts)";
export const UNARMORED_MOVEMENT_ANCHOR =
	"classes.md:5166-5174 (§ Monk > Level 2: Unarmored Movement)";
export const DEFLECT_ATTACKS_ANCHOR = "classes.md:5176-5180 (§ Monk > Level 3: Deflect Attacks)";
export const FRENZY_ANCHOR =
	"classes.md:355-357 (§ Barbarian Subclass: Path of the Berserker > Level 3: Frenzy)";
export const IMPROVED_CRITICAL_ANCHOR =
	"classes.md (§ Fighter Subclass: Champion > Level 3: Improved Critical)";
export const OPEN_HAND_TECHNIQUE_ANCHOR =
	"classes.md:5264-5278 (§ Monk Subclass: Warrior of the Open Hand > Level 3: Open Hand Technique)";
export const FAST_HANDS_ANCHOR =
	"classes.md:7135-7141 (§ Rogue Subclass: Thief > Level 3: Fast Hands)";
export const SECOND_STORY_WORK_ANCHOR =
	"classes.md:7143-7149 (§ Rogue Subclass: Thief > Level 3: Second-Story Work)";
export const REMARKABLE_ATHLETE_ANCHOR =
	"classes.md:4870-4874 (§ Fighter Subclass: Champion > Level 3: Remarkable Athlete)";
export const SLOW_FALL_ANCHOR = "classes.md:5205-5209 (§ Monk > Level 4: Slow Fall)";
export const PRIMAL_KNOWLEDGE_ANCHOR =
	"classes.md:280-284 (§ Barbarian > Level 3: Primal Knowledge)";
export const WEAPON_MASTERY_FIGHTER_ANCHOR =
	"classes.md:4790-4792 (§ Fighter > Level 1: Weapon Mastery)";
export const IMPROVED_CRITICAL_CAPABILITY_ID = `${BUNDLE_ID}/class-feature/fighter/champion/improved-critical`;

// --- Deflect Attacks / Slow Fall / Frenzy (L12b) -----------------------------

export const DEFLECT_ATTACKS_CAPABILITY_LOCAL_ID = "class-feature/monk/deflect-attacks";
export const DEFLECT_ATTACKS_CAPABILITY_ID = `${BUNDLE_ID}/${DEFLECT_ATTACKS_CAPABILITY_LOCAL_ID}`;
export const DEFLECT_ATTACKS_ACTION_LOCAL_ID = "monk/deflect-attacks";
export const DEFLECT_ATTACKS_ACTION_ID = `${BUNDLE_ID}/${DEFLECT_ATTACKS_ACTION_LOCAL_ID}`;
export const DEFLECT_ATTACKS_NICHE_ID = `capability:${DEFLECT_ATTACKS_CAPABILITY_ID}`;
/** Auto-mitigation ready marker — pattern condition-hook-on-event (replaces heal-back reaction). */
export const DEFLECT_READY_CONDITION_LOCAL_ID = "condition/deflect-ready";
export const DEFLECT_READY_CONDITION_ID = `${BUNDLE_ID}/${DEFLECT_READY_CONDITION_LOCAL_ID}`;
export const DEFLECT_EXPENDED_CONDITION_LOCAL_ID = "condition/deflect-expended";
export const DEFLECT_EXPENDED_CONDITION_ID = `${BUNDLE_ID}/${DEFLECT_EXPENDED_CONDITION_LOCAL_ID}`;
export const DEFLECT_MITIGATE_TEMPLATE_LOCAL_ID = "monk/deflect-attacks/mitigate";
export const DEFLECT_MITIGATE_TEMPLATE_ID = `${BUNDLE_ID}/${DEFLECT_MITIGATE_TEMPLATE_LOCAL_ID}`;

export const SLOW_FALL_CAPABILITY_LOCAL_ID = "class-feature/monk/slow-fall";
export const SLOW_FALL_CAPABILITY_ID = `${BUNDLE_ID}/${SLOW_FALL_CAPABILITY_LOCAL_ID}`;
export const SLOW_FALL_ACTION_LOCAL_ID = "monk/slow-fall";
export const SLOW_FALL_ACTION_ID = `${BUNDLE_ID}/${SLOW_FALL_ACTION_LOCAL_ID}`;
export const SLOW_FALL_NICHE_ID = `capability:${SLOW_FALL_CAPABILITY_ID}`;

export const FRENZY_CAPABILITY_LOCAL_ID = "class-feature/barbarian/path-of-the-berserker/frenzy";
export const FRENZY_CAPABILITY_ID = `${BUNDLE_ID}/${FRENZY_CAPABILITY_LOCAL_ID}`;
/** Once-per-turn first-hit spent marker — expires at turn_start (sneak-attack expended idiom). */
export const FRENZY_HIT_USED_CONDITION_LOCAL_ID = "condition/frenzy-hit-used";
export const FRENZY_HIT_USED_CONDITION_ID = `${BUNDLE_ID}/${FRENZY_HIT_USED_CONDITION_LOCAL_ID}`;
/** @deprecated Prefer FRENZY_HIT_USED_CONDITION_ID — resource counter replaced by turn_start-expiring condition. */
export const FRENZY_HITS_LOCAL_ID = "barbarian/frenzy-hits-this-turn";
export const FRENZY_HITS_RESOURCE_ID = `${BUNDLE_ID}/${FRENZY_HITS_LOCAL_ID}`;

// --- Danger Sense -----------------------------------------------------------

export const DANGER_SENSE_CAPABILITY_LOCAL_ID = "class-feature/barbarian/danger-sense";
export const DANGER_SENSE_CAPABILITY_ID = `${BUNDLE_ID}/${DANGER_SENSE_CAPABILITY_LOCAL_ID}`;
export const DANGER_SENSE_CONDITION_LOCAL_ID = "condition/danger-sense";
export const DANGER_SENSE_CONDITION_ID = `${BUNDLE_ID}/${DANGER_SENSE_CONDITION_LOCAL_ID}`;
export const DANGER_SENSE_ACTION_LOCAL_ID = "barbarian/danger-sense/attune";
export const DANGER_SENSE_ACTION_ID = `${BUNDLE_ID}/${DANGER_SENSE_ACTION_LOCAL_ID}`;
export const DANGER_SENSE_NICHE_ID = `capability:${DANGER_SENSE_CAPABILITY_ID}`;

// --- Sneak Attack dice ladder (authored values; auto-damage via srd/attack/sneak-attack, #101 evidence) ---

export const SNEAK_ATTACK_DICE_LOCAL_ID = "rogue/sneak-attack-dice";
export const SNEAK_ATTACK_DICE_RESOURCE_ID = `${BUNDLE_ID}/${SNEAK_ATTACK_DICE_LOCAL_ID}`;
export const SNEAK_ATTACK_DICE_DISPLAY_NAME = "Sneak Attack Dice";
export const SNEAK_ATTACK_DICE_MIN = 0;
/** ClassFeatureItem ceiling at high levels (e.g. 10d6). */
export const SNEAK_ATTACK_DICE_MAX = 10;
/** L1 column value. */
export const SNEAK_ATTACK_DICE_INITIAL = 1;

export function sneakAttackDiceColumn(): { level: number; dice: number }[] {
	const items = readClassFeatureItems("srd-2024_rogue_sneak-attack-column-data");
	return items.map((item) => {
		if (item.columnValue === null) {
			throw new Error(
				`martial-features-units: sneak-attack column at level ${item.level} has null column_value.`,
			);
		}
		const match = /^(\d+)d6$/i.exec(item.columnValue.trim());
		if (match?.[1] === undefined) {
			throw new Error(
				`martial-features-units: unexpected sneak-attack column_value '${item.columnValue}' at level ${item.level}.`,
			);
		}
		return { level: item.level, dice: Number.parseInt(match[1], 10) };
	});
}

// --- Martial Arts -----------------------------------------------------------

export const MARTIAL_ARTS_CAPABILITY_LOCAL_ID = "class-feature/monk/martial-arts";
export const MARTIAL_ARTS_CAPABILITY_ID = `${BUNDLE_ID}/${MARTIAL_ARTS_CAPABILITY_LOCAL_ID}`;
export const MARTIAL_ARTS_DIE_SIDES_LOCAL_ID = "monk/martial-arts-die-sides";
export const MARTIAL_ARTS_DIE_SIDES_RESOURCE_ID = `${BUNDLE_ID}/${MARTIAL_ARTS_DIE_SIDES_LOCAL_ID}`;
export const MARTIAL_ARTS_DIE_SIDES_INITIAL = 6;
export const MARTIAL_ARTS_DIE_SIDES_MAX = 12;
export const MARTIAL_ARTS_DIE_SIDES_MIN = 4;
export const BONUS_UNARMED_ACTION_LOCAL_ID = "monk/martial-arts/bonus-unarmed-strike";
export const BONUS_UNARMED_ACTION_ID = `${BUNDLE_ID}/${BONUS_UNARMED_ACTION_LOCAL_ID}`;
export const BONUS_UNARMED_NICHE_ID = `capability:${MARTIAL_ARTS_CAPABILITY_ID}`;

// --- Unarmored Movement (+10 ft = +2 five-foot cells on srd/speed-walk) ------

export const UNARMORED_MOVEMENT_CAPABILITY_LOCAL_ID = "class-feature/monk/unarmored-movement";
export const UNARMORED_MOVEMENT_CAPABILITY_ID = `${BUNDLE_ID}/${UNARMORED_MOVEMENT_CAPABILITY_LOCAL_ID}`;
export const UNARMORED_MOVEMENT_CONDITION_LOCAL_ID = "condition/unarmored-movement";
export const UNARMORED_MOVEMENT_CONDITION_ID = `${BUNDLE_ID}/${UNARMORED_MOVEMENT_CONDITION_LOCAL_ID}`;
export const UNARMORED_MOVEMENT_ACTION_LOCAL_ID = "monk/unarmored-movement/attune";
export const UNARMORED_MOVEMENT_ACTION_ID = `${BUNDLE_ID}/${UNARMORED_MOVEMENT_ACTION_LOCAL_ID}`;
export const UNARMORED_MOVEMENT_NICHE_ID = `capability:${UNARMORED_MOVEMENT_CAPABILITY_ID}`;
/** +10 feet → +2 squares (5 ft each, grid-units.md). */
export const UNARMORED_MOVEMENT_SPEED_BONUS_CELLS = 2;

// --- Expertise --------------------------------------------------------------

export const EXPERTISE_CAPABILITY_PREFIX = `${BUNDLE_ID}/expertise`;
export function expertiseCapabilityId(skillSlug: string): string {
	return `${EXPERTISE_CAPABILITY_PREFIX}/${skillSlug}`;
}
/** Derive expertise id from a skill capability id `srd/skill/<slug>`. */
export function expertiseIdFromSkillCapabilityId(skillCapabilityId: string): string | undefined {
	const prefix = `${BUNDLE_ID}/skill/`;
	if (!skillCapabilityId.startsWith(prefix)) return undefined;
	return expertiseCapabilityId(skillCapabilityId.slice(prefix.length));
}

// --- Thieves' Cant ----------------------------------------------------------

export const THIEVES_CANT_CAPABILITY_LOCAL_ID = "class-feature/rogue/thieves-cant";
export const THIEVES_CANT_CAPABILITY_ID = `${BUNDLE_ID}/${THIEVES_CANT_CAPABILITY_LOCAL_ID}`;
export const THIEVES_CANT_LANGUAGE_TAG = "srd.language.thieves-cant";

// --- Remarkable Athlete -----------------------------------------------------

export const REMARKABLE_ATHLETE_CAPABILITY_LOCAL_ID =
	"class-feature/fighter/champion/remarkable-athlete";
export const REMARKABLE_ATHLETE_CAPABILITY_ID = `${BUNDLE_ID}/${REMARKABLE_ATHLETE_CAPABILITY_LOCAL_ID}`;
export const REMARKABLE_ATHLETE_CONDITION_LOCAL_ID = "condition/remarkable-athlete";
export const REMARKABLE_ATHLETE_CONDITION_ID = `${BUNDLE_ID}/${REMARKABLE_ATHLETE_CONDITION_LOCAL_ID}`;
export const REMARKABLE_ATHLETE_ACTION_LOCAL_ID = "fighter/remarkable-athlete/attune";
export const REMARKABLE_ATHLETE_ACTION_ID = `${BUNDLE_ID}/${REMARKABLE_ATHLETE_ACTION_LOCAL_ID}`;
export const REMARKABLE_ATHLETE_NICHE_ID = `capability:${REMARKABLE_ATHLETE_CAPABILITY_ID}`;

// --- Fast Hands -------------------------------------------------------------

export const FAST_HANDS_CAPABILITY_LOCAL_ID = "class-feature/rogue/thief/fast-hands";
export const FAST_HANDS_CAPABILITY_ID = `${BUNDLE_ID}/${FAST_HANDS_CAPABILITY_LOCAL_ID}`;
export const FAST_HANDS_ACTION_LOCAL_ID = "rogue/thief/fast-hands";
export const FAST_HANDS_ACTION_ID = `${BUNDLE_ID}/${FAST_HANDS_ACTION_LOCAL_ID}`;
export const FAST_HANDS_NICHE_ID = `capability:${FAST_HANDS_CAPABILITY_ID}`;
export const SECOND_STORY_WORK_CAPABILITY_LOCAL_ID = "class-feature/rogue/thief/second-story-work";
export const SECOND_STORY_WORK_CAPABILITY_ID = `${BUNDLE_ID}/${SECOND_STORY_WORK_CAPABILITY_LOCAL_ID}`;
export const SECOND_STORY_WORK_ACTION_LOCAL_ID = "rogue/thief/second-story-work";
export const SECOND_STORY_WORK_ACTION_ID = `${BUNDLE_ID}/${SECOND_STORY_WORK_ACTION_LOCAL_ID}`;
export const SECOND_STORY_WORK_NICHE_ID = `capability:${SECOND_STORY_WORK_CAPABILITY_ID}`;
/** L1–4 typical walk 30 ft = 6 cells; Climb Speed equals Speed (literal grant). */
export const SECOND_STORY_CLIMB_SPEED_CELLS = 6;

export const BARBARIAN_CLASS_TAG = "srd.class.barbarian";
export const MONK_CLASS_TAG = "srd.class.monk";
export const ROGUE_CLASS_TAG = "srd.class.rogue";
export const FIGHTER_CLASS_TAG = "srd.class.fighter";
export const CHAMPION_SUBCLASS_TAG = "srd.subclass.champion";

export function classFeatureTags(slug: string, classTag: string): string[] {
	return ["srd.action", CLASS_FEATURE_TAG_PREFIX, `${CLASS_FEATURE_TAG_PREFIX}.${slug}`, classTag];
}
