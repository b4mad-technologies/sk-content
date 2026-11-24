// pattern: post-commit-hit-reaction
// Martial L1-4 slice 2: remaining feature mechanizations.
// Design: bead sk-609b.3 (design trail) (slice 2 extension).

import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../flavor/read";
import type { ChapterUnitSummary } from "../chapter-types";
import {
	BONUS_CHANNEL_ID,
	REACTION_CHANNEL_ID,
	TURN_START_BOUNDARY_ID,
} from "../playing-the-game/action-economy-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import {
	CLIMB_CAPABILITY_ID,
	SPEED_CLIMB_RESOURCE_LOCAL_ID,
	SPEED_WALK_RESOURCE_LOCAL_ID,
	speedWalkModifierTargetRow,
} from "../playing-the-game/grid-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { LEVEL_ID } from "../playing-the-game/level-units";
import { abilityModifierExpr } from "../playing-the-game/modifier-units";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	DEX_SAVE_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../playing-the-game/resolution-scope-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";
import { ROLL_BIAS_ADVANTAGE_TAG } from "../playing-the-game/tag-value-vocabulary";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import { buildClassTagValueUnits, buildSubclassTagValueUnits } from "./classes-units";
import { buildFeatureTagValueUnits, CLASS_FEATURE_TAG_PREFIX } from "./fighter-units";
import {
	BARBARIAN_CLASS_TAG,
	BONUS_UNARMED_ACTION_ID,
	BONUS_UNARMED_ACTION_LOCAL_ID,
	BONUS_UNARMED_NICHE_ID,
	BUNDLE_ID,
	CHAMPION_SUBCLASS_TAG,
	classFeatureTags,
	DANGER_SENSE_ACTION_ID,
	DANGER_SENSE_ACTION_LOCAL_ID,
	DANGER_SENSE_ANCHOR,
	DANGER_SENSE_CAPABILITY_ID,
	DANGER_SENSE_CAPABILITY_LOCAL_ID,
	DANGER_SENSE_CONDITION_ID,
	DANGER_SENSE_CONDITION_LOCAL_ID,
	DANGER_SENSE_NICHE_ID,
	DEFLECT_ATTACKS_ACTION_ID,
	DEFLECT_ATTACKS_ACTION_LOCAL_ID,
	DEFLECT_ATTACKS_ANCHOR,
	DEFLECT_ATTACKS_CAPABILITY_ID,
	DEFLECT_ATTACKS_CAPABILITY_LOCAL_ID,
	DEFLECT_ATTACKS_NICHE_ID,
	DEFLECT_EXPENDED_CONDITION_ID,
	DEFLECT_EXPENDED_CONDITION_LOCAL_ID,
	DEFLECT_MITIGATE_TEMPLATE_ID,
	DEFLECT_MITIGATE_TEMPLATE_LOCAL_ID,
	DEFLECT_READY_CONDITION_ID,
	DEFLECT_READY_CONDITION_LOCAL_ID,
	EXPERTISE_ANCHOR,
	expertiseCapabilityId,
	FAST_HANDS_ACTION_ID,
	FAST_HANDS_ACTION_LOCAL_ID,
	FAST_HANDS_ANCHOR,
	FAST_HANDS_CAPABILITY_ID,
	FAST_HANDS_CAPABILITY_LOCAL_ID,
	FAST_HANDS_NICHE_ID,
	FIGHTER_CLASS_TAG,
	FRENZY_ANCHOR,
	FRENZY_CAPABILITY_ID,
	FRENZY_CAPABILITY_LOCAL_ID,
	FRENZY_HIT_USED_CONDITION_ID,
	FRENZY_HIT_USED_CONDITION_LOCAL_ID,
	FRENZY_HITS_LOCAL_ID,
	FRENZY_HITS_RESOURCE_ID,
	MARTIAL_ARTS_ANCHOR,
	MARTIAL_ARTS_CAPABILITY_ID,
	MARTIAL_ARTS_CAPABILITY_LOCAL_ID,
	MARTIAL_ARTS_DIE_SIDES_INITIAL,
	MARTIAL_ARTS_DIE_SIDES_LOCAL_ID,
	MARTIAL_ARTS_DIE_SIDES_MAX,
	MARTIAL_ARTS_DIE_SIDES_MIN,
	MARTIAL_ARTS_DIE_SIDES_RESOURCE_ID,
	MONK_CLASS_TAG,
	REMARKABLE_ATHLETE_ACTION_ID,
	REMARKABLE_ATHLETE_ACTION_LOCAL_ID,
	REMARKABLE_ATHLETE_ANCHOR,
	REMARKABLE_ATHLETE_CAPABILITY_ID,
	REMARKABLE_ATHLETE_CAPABILITY_LOCAL_ID,
	REMARKABLE_ATHLETE_CONDITION_ID,
	REMARKABLE_ATHLETE_CONDITION_LOCAL_ID,
	REMARKABLE_ATHLETE_NICHE_ID,
	ROGUE_CLASS_TAG,
	SECOND_STORY_CLIMB_SPEED_CELLS,
	SECOND_STORY_WORK_ACTION_ID,
	SECOND_STORY_WORK_ACTION_LOCAL_ID,
	SECOND_STORY_WORK_ANCHOR,
	SECOND_STORY_WORK_CAPABILITY_ID,
	SECOND_STORY_WORK_CAPABILITY_LOCAL_ID,
	SECOND_STORY_WORK_NICHE_ID,
	SLOW_FALL_ACTION_ID,
	SLOW_FALL_ACTION_LOCAL_ID,
	SLOW_FALL_ANCHOR,
	SLOW_FALL_CAPABILITY_ID,
	SLOW_FALL_CAPABILITY_LOCAL_ID,
	SLOW_FALL_NICHE_ID,
	SNEAK_ATTACK_ANCHOR,
	SNEAK_ATTACK_DICE_DISPLAY_NAME,
	SNEAK_ATTACK_DICE_INITIAL,
	SNEAK_ATTACK_DICE_LOCAL_ID,
	SNEAK_ATTACK_DICE_MAX,
	SNEAK_ATTACK_DICE_MIN,
	SNEAK_ATTACK_DICE_RESOURCE_ID,
	THIEVES_CANT_ANCHOR,
	THIEVES_CANT_CAPABILITY_ID,
	THIEVES_CANT_CAPABILITY_LOCAL_ID,
	THIEVES_CANT_LANGUAGE_TAG,
	UNARMORED_MOVEMENT_ACTION_ID,
	UNARMORED_MOVEMENT_ACTION_LOCAL_ID,
	UNARMORED_MOVEMENT_ANCHOR,
	UNARMORED_MOVEMENT_CAPABILITY_ID,
	UNARMORED_MOVEMENT_CAPABILITY_LOCAL_ID,
	UNARMORED_MOVEMENT_CONDITION_ID,
	UNARMORED_MOVEMENT_CONDITION_LOCAL_ID,
	UNARMORED_MOVEMENT_NICHE_ID,
	UNARMORED_MOVEMENT_SPEED_BONUS_CELLS,
} from "./martial-features-units";
import { buildRemainingFeatureTagValueUnits } from "./remaining-classes-units";

function martialTagSeedCall(): VerbCall {
	const allTags = [
		...buildClassTagValueUnits(),
		...buildSubclassTagValueUnits(),
		...buildFeatureTagValueUnits(),
		...buildRemainingFeatureTagValueUnits(),
	];
	return {
		toolName: "spellkave_write_rows",
		label: "martial-slice2-tag-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: allTags.map((unit) => ({
				tag: unit.tag,
				prefix: unit.prefix,
				bundle_id: BUNDLE_ID,
				description: unit.description,
			})),
		},
	};
}

function actorNiche(nicheId: string, displayName: string, description: string): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: `niche:${nicheId}`,
		params: {
			bundle: BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: nicheId,
					bundle_id: BUNDLE_ID,
					display_name: displayName,
					description,
					predicate_source: "",
					provider: "actor",
				},
			],
		},
	};
}

const removePolicy = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;
const stacking = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
const speedWalkId = `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}`;

/** Barbarian Danger Sense (Dex-save Advantage condition). */
export async function buildBarbarianSlice2Fragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const barbarianSkillOptions = [
		"animal-handling",
		"athletics",
		"intimidation",
		"nature",
		"perception",
		"survival",
	];
	const skillOptionEntities: VerbCall[] = barbarianSkillOptions.map((slug) => ({
		toolName: "spellkave_define_entity_type",
		label: `entity:skill-option/${slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `skill-option/${slug}`,
			display_name: `Primal Knowledge skill option: ${slug}`,
			description: `Menu member for Barbarian Primal Knowledge. Dialogue grants srd/skill/${slug} when chosen.`,
			tags: [CLASS_FEATURE_TAG_PREFIX, BARBARIAN_CLASS_TAG],
		},
	}));
	const scene: VerbCall[] = [
		martialTagSeedCall(),
		...skillOptionEntities,
		actorNiche(DANGER_SENSE_NICHE_ID, "Danger Sense (self)", "Actor-carried Danger Sense attune."),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:dex-save",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(DEX_SAVE_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:danger-sense",
			params: {
				bundle: BUNDLE_ID,
				id: DANGER_SENSE_CONDITION_LOCAL_ID,
				display_name: "Danger Sense",
				gate_predicate_source: "1 == 1",
				description:
					`Danger Sense (${DANGER_SENSE_ANCHOR}): Advantage on Dexterity saving throws. ` +
					"Incapacitated exclusion is identity-noted (no automatic suppress while Incapacitated this slice).",
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/danger-sense/dex-save-advantage",
						display_name: "Danger Sense: Advantage on Dexterity saving throws",
						applies_to: DEX_SAVE_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${DANGER_SENSE_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DANGER_SENSE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Danger Sense",
				description: `Barbarian Danger Sense (${DANGER_SENSE_ANCHOR}).`,
				tags: classFeatureTags("danger-sense", BARBARIAN_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${DANGER_SENSE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DANGER_SENSE_ACTION_LOCAL_ID,
				required_capability: DANGER_SENSE_CAPABILITY_ID,
				niche_id: DANGER_SENSE_NICHE_ID,
				display_name: "Attune Danger Sense",
				description:
					"Apply the Danger Sense condition (Dexterity save Advantage). Free, once-style attune for a permanent class feature.",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Danger Sense.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: DANGER_SENSE_CONDITION_ID,
							},
						},
					],
				},
			},
		},

		// pattern: condition-hook-on-event (turn_start-expiring expended marker)
		// Frenzy (#105): capability + once-per-turn hit-used condition that expires
		// at the barbarian's turn_start (sneak-attack expended idiom) — no resource
		// counter / autonomy job required.
		{
			toolName: "spellkave_define_condition",
			label: `condition:${FRENZY_HIT_USED_CONDITION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FRENZY_HIT_USED_CONDITION_LOCAL_ID,
				display_name: "Frenzy Hit Used",
				description:
					`Frenzy first-hit spent this turn (${FRENZY_ANCHOR}). Applied after the first ` +
					"Strength hit while raging; expires at owner turn_start so the next turn's first hit qualifies again.",
				gate_predicate_source: "1 == 1",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${FRENZY_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FRENZY_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Frenzy",
				description:
					`Frenzy (${FRENZY_ANCHOR}): while raging, first Strength hit each turn deals extra d6s ` +
					`equal to Rage Damage when !status('${FRENZY_HIT_USED_CONDITION_ID}'). Once-per-turn via ` +
					"turn_start-expiring expended condition (pattern: condition-hook-on-event / sneak-attack idiom).",
				tags: classFeatureTags("frenzy", BARBARIAN_CLASS_TAG),
			},
		},
	];
	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	return {
		toml,
		units: [
			{ kind: "niche_definitions", id: DANGER_SENSE_NICHE_ID, sourcePk: "" },
			{
				kind: "condition_definitions",
				id: DANGER_SENSE_CONDITION_ID,
				sourcePk: DANGER_SENSE_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: DANGER_SENSE_CAPABILITY_ID,
				sourcePk: DANGER_SENSE_ANCHOR,
			},
			{ kind: "action_definitions", id: DANGER_SENSE_ACTION_ID, sourcePk: DANGER_SENSE_ANCHOR },
			{ kind: "consequence_templates", id: `${DANGER_SENSE_ACTION_ID}/success`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${DANGER_SENSE_ACTION_ID}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${DANGER_SENSE_ACTION_ID}/affordance`, sourcePk: "" },
			{
				kind: "condition_definitions",
				id: FRENZY_HIT_USED_CONDITION_ID,
				sourcePk: FRENZY_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: FRENZY_CAPABILITY_ID,
				sourcePk: FRENZY_ANCHOR,
			},
		],
	};
}

/** Monk Martial Arts (die resource + bonus unarmed) + Unarmored Movement speed. */
export async function buildMonkSlice2Fragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const scene: VerbCall[] = [
		martialTagSeedCall(),
		actorNiche(BONUS_UNARMED_NICHE_ID, "Martial Arts Bonus Unarmed (self)", "Actor-carried."),
		actorNiche(
			UNARMORED_MOVEMENT_NICHE_ID,
			"Unarmored Movement (self)",
			"Actor-carried attune for +10 ft speed.",
		),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:speed-walk",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [speedWalkModifierTargetRow()],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${MARTIAL_ARTS_DIE_SIDES_LOCAL_ID}`,
			params: {
				id: MARTIAL_ARTS_DIE_SIDES_LOCAL_ID,
				display_name: "Martial Arts Die Sides",
				min_value: MARTIAL_ARTS_DIE_SIDES_MIN,
				max_value: MARTIAL_ARTS_DIE_SIDES_MAX,
				initial_value: MARTIAL_ARTS_DIE_SIDES_INITIAL,
				recovery_rule: "persistent",
				description: readResourceFlavor("monk-martial-arts-die-sides").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${MARTIAL_ARTS_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: MARTIAL_ARTS_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Martial Arts",
				description:
					`Monk Martial Arts (${MARTIAL_ARTS_ANCHOR}): unarmed uses Martial Arts die + better of STR/DEX; ` +
					"Bonus Action Unarmed Strike.",
				tags: classFeatureTags("martial-arts", MONK_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${BONUS_UNARMED_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: BONUS_UNARMED_ACTION_LOCAL_ID,
				required_capability: MARTIAL_ARTS_CAPABILITY_ID,
				niche_id: BONUS_UNARMED_NICHE_ID,
				display_name: "Martial Arts: Bonus Unarmed Strike",
				description:
					`Make an Unarmed Strike as a Bonus Action (${MARTIAL_ARTS_ANCHOR}). Spends Bonus channel; ` +
					"damage uses the Martial Arts-aware unarmed formula when the capability is held.",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				// Self-only advisory strike: spend is LIVE; targeting a foe uses the
				// shared Attack action. This proves the Bonus Action grant.
				consequence: {
					description: "Bonus Unarmed Strike (channel spend LIVE; use Attack for the roll).",
					frame_writes: [],
				},
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:unarmored-movement",
			params: {
				bundle: BUNDLE_ID,
				id: UNARMORED_MOVEMENT_CONDITION_LOCAL_ID,
				display_name: "Unarmored Movement",
				gate_predicate_source: "1 == 1",
				description: `Unarmored Movement (${UNARMORED_MOVEMENT_ANCHOR}): +10 feet Speed (+${UNARMORED_MOVEMENT_SPEED_BONUS_CELLS} cells) while not armored.`,
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/unarmored-movement/speed-bonus",
						display_name: "Unarmored Movement: +10 feet walking speed",
						applies_to: speedWalkId,
						modifier_expression_source: `let bonus = ${UNARMORED_MOVEMENT_SPEED_BONUS_CELLS}; bonus`,
						delta_kind: "Plus",
						tags: [],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${UNARMORED_MOVEMENT_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: UNARMORED_MOVEMENT_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Unarmored Movement",
				description: `Monk Unarmored Movement (${UNARMORED_MOVEMENT_ANCHOR}).`,
				tags: classFeatureTags("unarmored-movement", MONK_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${UNARMORED_MOVEMENT_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: UNARMORED_MOVEMENT_ACTION_LOCAL_ID,
				required_capability: UNARMORED_MOVEMENT_CAPABILITY_ID,
				niche_id: UNARMORED_MOVEMENT_NICHE_ID,
				display_name: "Attune Unarmored Movement",
				description: "Apply the Unarmored Movement speed bonus condition.",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Unarmored Movement.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: UNARMORED_MOVEMENT_CONDITION_ID,
							},
						},
					],
				},
			},
		},

		// pattern: condition-hook-on-event
		// Deflect Attacks — true post-damage mitigation via ResourceDelta hook on
		// deflect-ready (replaces heal-back reaction). Once-per-turn via
		// deflect-expended (turn_start expiry). Residual: consequence template
		// cannot read $event.detail.delta, so the heal amount is the full roll
		// (1d10+DEX+level) rather than min(damage, roll); same amount as the
		// SRD reduction die, applied immediately after the HP write.
		{
			toolName: "spellkave_define_condition",
			label: `condition:${DEFLECT_EXPENDED_CONDITION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DEFLECT_EXPENDED_CONDITION_LOCAL_ID,
				display_name: "Deflect Expended",
				description: `Deflect Attacks used this turn (${DEFLECT_ATTACKS_ANCHOR}). Expires at owner turn_start.`,
				gate_predicate_source: "1 == 1",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `consequence:${DEFLECT_MITIGATE_TEMPLATE_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DEFLECT_MITIGATE_TEMPLATE_LOCAL_ID,
				description:
					"Deflect Attacks mitigation: restore 1d10 + DEX + level HP and mark expended. " +
					"pattern: condition-hook-on-event",
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: `1d10 + ((actor.stat('${BUNDLE_ID}/dex') - 10) / 2) + actor.stat('${BUNDLE_ID}/${LEVEL_ID}')`,
						},
					},
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: DEFLECT_EXPENDED_CONDITION_ID,
							expires_at_boundary: {
								boundary_id: TURN_START_BOUNDARY_ID,
								owner_actor: "Actor",
							},
						},
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: `condition:${DEFLECT_READY_CONDITION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DEFLECT_READY_CONDITION_LOCAL_ID,
				display_name: "Deflect Ready",
				description:
					`Deflect Attacks ready (${DEFLECT_ATTACKS_ANCHOR}). While active and not expended, ` +
					"HP damage auto-mitigates by 1d10 + DEX + Monk level (condition-hook-on-event).",
				gate_predicate_source: "1 == 1",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				hooks: [
					{
						event_kind: "Layer2.ResourceDelta",
						detail_filter_source: [
							`$event.detail.entity_id == target.stat('core/entity_id')`,
							`$event.detail.resource_id == '${BUNDLE_ID}/${HP_ID}'`,
							`$event.detail.delta < 0`,
							`target.status('${DEFLECT_EXPENDED_CONDITION_ID}') == false`,
						].join(" && "),
						expression_source: `invoke_outcome_graph('${DEFLECT_MITIGATE_TEMPLATE_ID}')`,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${DEFLECT_ATTACKS_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DEFLECT_ATTACKS_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Deflect Attacks",
				description:
					`Deflect Attacks (${DEFLECT_ATTACKS_ANCHOR}): while deflect-ready, HP damage is ` +
					"auto-mitigated by 1d10 + DEX mod + Monk level once per turn (condition-hook-on-event).",
				tags: classFeatureTags("deflect-attacks", MONK_CLASS_TAG),
			},
		},
		// Attune action applies deflect-ready (monks who want the feature on).
		actorNiche(
			DEFLECT_ATTACKS_NICHE_ID,
			"Deflect Attacks (attune)",
			"Actor-carried Deflect Attacks ready-state.",
		),
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${DEFLECT_ATTACKS_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: DEFLECT_ATTACKS_ACTION_LOCAL_ID,
				required_capability: DEFLECT_ATTACKS_CAPABILITY_ID,
				niche_id: DEFLECT_ATTACKS_NICHE_ID,
				display_name: "Ready Deflect Attacks",
				description:
					`Apply deflect-ready (${DEFLECT_ATTACKS_ANCHOR}). Mitigation is automatic via ` +
					"condition-hook-on-event while ready and not expended this turn.",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Deflect Ready.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: DEFLECT_READY_CONDITION_ID,
							},
						},
					],
				},
			},
		},
		// Slow Fall — capability + reaction shell. No fall event on the substrate
		// (verdict: slow-fall-fall-event); eligibility is capability-only so the
		// reaction is discoverable; consequence is the 5×level heal-back.
		actorNiche(SLOW_FALL_NICHE_ID, "Slow Fall (reaction)", "Actor-carried Slow Fall."),
		{
			toolName: "spellkave_define_capability",
			label: `capability:${SLOW_FALL_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: SLOW_FALL_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Slow Fall",
				description:
					`Slow Fall (${SLOW_FALL_ANCHOR}): Reaction when you fall — reduce fall damage by ` +
					"5 × Monk level. Fall event trigger is substrate-deferred.",
				tags: classFeatureTags("slow-fall", MONK_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${SLOW_FALL_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: SLOW_FALL_ACTION_LOCAL_ID,
				required_capability: SLOW_FALL_CAPABILITY_ID,
				niche_id: SLOW_FALL_NICHE_ID,
				display_name: "Slow Fall",
				description:
					`Reaction: reduce falling damage by 5 × level (${SLOW_FALL_ANCHOR}). ` +
					"No dedicated fall event — trigger is r_manipulate placeholder; see substrate verdict.",
				self_eligible: true,
				spends_channel: REACTION_CHANNEL_ID,
				cost_time_ms: 0,
				// No fall event exists; keep an explicit trigger so the action is
				// reaction-shaped. Will not open windows without a matching event.
				reaction_trigger: "$event.kind == 'r_fall'",
				reaction_eligibility: `actor.has_capability('${SLOW_FALL_CAPABILITY_ID}')`,
				reaction_window_ms: 30_000,
				consequence: {
					description: "Heal 5 × character level (SRD fall-damage reduction as post-hit heal).",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: `5 * actor.stat('${BUNDLE_ID}/${LEVEL_ID}')`,
							},
						},
					],
				},
			},
		},
	];
	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	return {
		toml,
		units: [
			{ kind: "niche_definitions", id: BONUS_UNARMED_NICHE_ID, sourcePk: "" },
			{ kind: "niche_definitions", id: UNARMORED_MOVEMENT_NICHE_ID, sourcePk: "" },
			{
				kind: "resource_definitions",
				id: MARTIAL_ARTS_DIE_SIDES_RESOURCE_ID,
				sourcePk: MARTIAL_ARTS_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: MARTIAL_ARTS_CAPABILITY_ID,
				sourcePk: MARTIAL_ARTS_ANCHOR,
			},
			{ kind: "action_definitions", id: BONUS_UNARMED_ACTION_ID, sourcePk: MARTIAL_ARTS_ANCHOR },
			{ kind: "consequence_templates", id: `${BONUS_UNARMED_ACTION_ID}/success`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${BONUS_UNARMED_ACTION_ID}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${BONUS_UNARMED_ACTION_ID}/affordance`, sourcePk: "" },
			{
				kind: "condition_definitions",
				id: UNARMORED_MOVEMENT_CONDITION_ID,
				sourcePk: UNARMORED_MOVEMENT_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: UNARMORED_MOVEMENT_CAPABILITY_ID,
				sourcePk: UNARMORED_MOVEMENT_ANCHOR,
			},
			{
				kind: "action_definitions",
				id: UNARMORED_MOVEMENT_ACTION_ID,
				sourcePk: UNARMORED_MOVEMENT_ANCHOR,
			},
			{
				kind: "consequence_templates",
				id: `${UNARMORED_MOVEMENT_ACTION_ID}/success`,
				sourcePk: "",
			},
			{ kind: "outcome_templates", id: `${UNARMORED_MOVEMENT_ACTION_ID}/outcome`, sourcePk: "" },
			{
				kind: "affordance_templates",
				id: `${UNARMORED_MOVEMENT_ACTION_ID}/affordance`,
				sourcePk: "",
			},
			{ kind: "niche_definitions", id: DEFLECT_ATTACKS_NICHE_ID, sourcePk: "" },
			{
				kind: "condition_definitions",
				id: DEFLECT_READY_CONDITION_ID,
				sourcePk: DEFLECT_ATTACKS_ANCHOR,
			},
			{
				kind: "condition_definitions",
				id: DEFLECT_EXPENDED_CONDITION_ID,
				sourcePk: DEFLECT_ATTACKS_ANCHOR,
			},
			{
				kind: "consequence_templates",
				id: DEFLECT_MITIGATE_TEMPLATE_ID,
				sourcePk: DEFLECT_ATTACKS_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: DEFLECT_ATTACKS_CAPABILITY_ID,
				sourcePk: DEFLECT_ATTACKS_ANCHOR,
			},
			{
				kind: "action_definitions",
				id: DEFLECT_ATTACKS_ACTION_ID,
				sourcePk: DEFLECT_ATTACKS_ANCHOR,
			},
			{ kind: "consequence_templates", id: `${DEFLECT_ATTACKS_ACTION_ID}/success`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${DEFLECT_ATTACKS_ACTION_ID}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${DEFLECT_ATTACKS_ACTION_ID}/affordance`, sourcePk: "" },
			{ kind: "niche_definitions", id: SLOW_FALL_NICHE_ID, sourcePk: "" },
			{
				kind: "capability_definitions",
				id: SLOW_FALL_CAPABILITY_ID,
				sourcePk: SLOW_FALL_ANCHOR,
			},
			{ kind: "action_definitions", id: SLOW_FALL_ACTION_ID, sourcePk: SLOW_FALL_ANCHOR },
			{ kind: "consequence_templates", id: `${SLOW_FALL_ACTION_ID}/success`, sourcePk: "" },
			{ kind: "outcome_templates", id: `${SLOW_FALL_ACTION_ID}/outcome`, sourcePk: "" },
			{ kind: "affordance_templates", id: `${SLOW_FALL_ACTION_ID}/affordance`, sourcePk: "" },
		],
	};
}

/** Rogue Sneak Attack dice resource, Expertise capabilities, Thieves' Cant, Fast Hands. */
export async function buildRogueSlice2Fragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const skills = buildSkillUnits();
	const expertiseCaps: VerbCall[] = skills.map((skill) => ({
		toolName: "spellkave_define_capability",
		label: `capability:expertise/${skill.slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `expertise/${skill.slug}`,
			actor_kind: "entity",
			display_name: `Expertise: ${skill.displayName}`,
			description:
				`Rogue Expertise in ${skill.displayName} (${EXPERTISE_ANCHOR}): doubles Proficiency Bonus ` +
				"on checks with this skill (wired into skillCheckExpr / d20TestExpr).",
			tags: [
				"srd.action",
				CLASS_FEATURE_TAG_PREFIX,
				`${CLASS_FEATURE_TAG_PREFIX}.expertise`,
				ROGUE_CLASS_TAG,
			],
		},
	}));
	const expertiseOptionEntities: VerbCall[] = skills.map((skill) => ({
		toolName: "spellkave_define_entity_type",
		label: `entity:expertise-option/${skill.slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `expertise-option/${skill.slug}`,
			display_name: `Expertise option: ${skill.displayName}`,
			description:
				`Menu member for Rogue Expertise (${EXPERTISE_ANCHOR}). Dialogue grants ` +
				`${expertiseCapabilityId(skill.slug)} when this option is chosen.`,
			tags: [CLASS_FEATURE_TAG_PREFIX, `${CLASS_FEATURE_TAG_PREFIX}.expertise`, ROGUE_CLASS_TAG],
		},
	}));

	const scene: VerbCall[] = [
		martialTagSeedCall(),
		{
			toolName: "spellkave_define_capability",
			label: "capability:rogue-sneak-attack",
			params: {
				bundle: BUNDLE_ID,
				id: "class-feature/rogue/sneak-attack",
				actor_kind: "entity",
				display_name: "Sneak Attack",
				description:
					"Once per turn you can deal extra damage when you hit with a finesse or ranged weapon, given advantage or an active ally near the target.",
				tags: classFeatureTags("thieves-cant", ROGUE_CLASS_TAG),
			},
		},
		actorNiche(FAST_HANDS_NICHE_ID, "Fast Hands (self)", "Thief Fast Hands — actor-carried."),
		{
			toolName: "spellkave_define_resource",
			label: `resource:${SNEAK_ATTACK_DICE_LOCAL_ID}`,
			params: {
				id: SNEAK_ATTACK_DICE_LOCAL_ID,
				display_name: SNEAK_ATTACK_DICE_DISPLAY_NAME,
				min_value: SNEAK_ATTACK_DICE_MIN,
				max_value: SNEAK_ATTACK_DICE_MAX,
				initial_value: SNEAK_ATTACK_DICE_INITIAL,
				recovery_rule: "persistent",
				description: readResourceFlavor("rogue-sneak-attack-dice").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${THIEVES_CANT_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: THIEVES_CANT_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Thieves' Cant",
				description:
					`Thieves' Cant (${THIEVES_CANT_ANCHOR}). Knows ${THIEVES_CANT_LANGUAGE_TAG} ` +
					"(language tag is applied at character creation / grant time; capability is the feature gate).",
				tags: classFeatureTags("thieves-cant", ROGUE_CLASS_TAG),
			},
		},
		...expertiseCaps,
		...expertiseOptionEntities,
		{
			toolName: "spellkave_define_capability",
			label: `capability:${FAST_HANDS_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FAST_HANDS_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Fast Hands",
				description: `Thief Fast Hands (${FAST_HANDS_ANCHOR}): Bonus Action Utilize / Sleight of Hand.`,
				tags: classFeatureTags("fast-hands", ROGUE_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FAST_HANDS_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FAST_HANDS_ACTION_LOCAL_ID,
				required_capability: FAST_HANDS_CAPABILITY_ID,
				niche_id: FAST_HANDS_NICHE_ID,
				display_name: "Fast Hands",
				description: `Bonus Action Fast Hands (${FAST_HANDS_ANCHOR}). Spend is LIVE; Utilize/Sleight details advisory.`,
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Fast Hands Bonus Action (advisory object use).",
					frame_writes: [],
				},
			},
		},

		actorNiche(
			SECOND_STORY_WORK_NICHE_ID,
			"Second-Story Work (self)",
			"Thief Second-Story — actor-carried.",
		),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:speed-climb",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					{
						target_id: `${BUNDLE_ID}/${SPEED_CLIMB_RESOURCE_LOCAL_ID}`,
						bundle_id: BUNDLE_ID,
						display_name: "Climbing Speed",
						shape: "Numeric",
						description: "Climb speed axis for Second-Story Work literal grant.",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:second-story-work",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/second-story-work",
				display_name: "Second-Story Work",
				gate_predicate_source: "1 == 1",
				description:
					`Second-Story Work (${SECOND_STORY_WORK_ANCHOR}): Climb Speed ${SECOND_STORY_CLIMB_SPEED_CELLS} cells ` +
					"(30 ft L1–4 literal; equals typical Speed). Dynamic mirror of walk is substrate-deferred.",
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/second-story-work/climb-speed",
						display_name: "Second-Story Work: Climb Speed 30 ft",
						applies_to: `${BUNDLE_ID}/${SPEED_CLIMB_RESOURCE_LOCAL_ID}`,
						modifier_expression_source: `let climb = ${SECOND_STORY_CLIMB_SPEED_CELLS}; climb`,
						delta_kind: "FlatSet",
						tags: [],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${SECOND_STORY_WORK_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: SECOND_STORY_WORK_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Second-Story Work",
				description: `Thief Second-Story Work (${SECOND_STORY_WORK_ANCHOR}): Climb Speed = Speed (literal L1–4).`,
				tags: classFeatureTags("second-story-work", ROGUE_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${SECOND_STORY_WORK_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: SECOND_STORY_WORK_ACTION_LOCAL_ID,
				required_capability: SECOND_STORY_WORK_CAPABILITY_ID,
				niche_id: SECOND_STORY_WORK_NICHE_ID,
				display_name: "Attune Second-Story Work",
				description: `Apply Climb Speed ${SECOND_STORY_CLIMB_SPEED_CELLS} cells and climb capability (${SECOND_STORY_WORK_ANCHOR}).`,
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Second-Story Work climb speed condition.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: `${BUNDLE_ID}/condition/second-story-work`,
							},
						},
					],
				},
			},
		},
	];

	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	const units: ChapterUnitSummary[] = [
		{
			kind: "resource_definitions",
			id: SNEAK_ATTACK_DICE_RESOURCE_ID,
			sourcePk: SNEAK_ATTACK_ANCHOR,
		},
		{
			kind: "capability_definitions",
			id: "srd/class-feature/rogue/sneak-attack",
			sourcePk: SNEAK_ATTACK_ANCHOR,
		},
		{
			kind: "capability_definitions",
			id: THIEVES_CANT_CAPABILITY_ID,
			sourcePk: THIEVES_CANT_ANCHOR,
		},
		...skills.map((skill) => ({
			kind: "capability_definitions" as const,
			id: expertiseCapabilityId(skill.slug),
			sourcePk: EXPERTISE_ANCHOR,
		})),
		{ kind: "niche_definitions", id: FAST_HANDS_NICHE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: FAST_HANDS_CAPABILITY_ID, sourcePk: FAST_HANDS_ANCHOR },
		{ kind: "action_definitions", id: FAST_HANDS_ACTION_ID, sourcePk: FAST_HANDS_ANCHOR },
		{ kind: "consequence_templates", id: `${FAST_HANDS_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${FAST_HANDS_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${FAST_HANDS_ACTION_ID}/affordance`, sourcePk: "" },
	];
	return { toml, units };
}

/** Champion Remarkable Athlete (Athletics / initiative-shaped Advantage on ability checks). */
export async function buildFighterSlice2Fragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const scene: VerbCall[] = [
		martialTagSeedCall(),
		actorNiche(
			REMARKABLE_ATHLETE_NICHE_ID,
			"Remarkable Athlete (self)",
			"Champion Remarkable Athlete attune.",
		),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:ability-check",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ABILITY_CHECK_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:remarkable-athlete",
			params: {
				bundle: BUNDLE_ID,
				id: REMARKABLE_ATHLETE_CONDITION_LOCAL_ID,
				display_name: "Remarkable Athlete",
				gate_predicate_source: "1 == 1",
				description:
					`Remarkable Athlete (${REMARKABLE_ATHLETE_ANCHOR}): Advantage on Strength (Athletics) checks ` +
					"and Initiative (modeled as ability-check Advantage scope). Post-crit half-Speed move is identity.",
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/remarkable-athlete/ability-check-advantage",
						display_name:
							"Remarkable Athlete: Advantage on ability checks (Athletics/Initiative band)",
						applies_to: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		// Round 4 d005: `has_capability` reads these two ids in the generic check and
		// attack roll crit rules. Both sit here because this scene seeds the
		// class-feature tag vocabulary their tags need.
		{
			toolName: "spellkave_define_capability",
			label: "capability:class-feature/bard/jack-of-all-trades",
			params: {
				bundle: BUNDLE_ID,
				id: "class-feature/bard/jack-of-all-trades",
				actor_kind: "entity",
				display_name: "Jack of All Trades",
				description:
					"You can add half your Proficiency Bonus, rounded down, to any ability check you make that uses a skill proficiency you lack.",
				tags: ["srd.class_feature", "srd.class_feature.jack-of-all-trades"],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:class-feature/fighter/champion/improved-critical",
			params: {
				bundle: BUNDLE_ID,
				id: "class-feature/fighter/champion/improved-critical",
				actor_kind: "entity",
				display_name: "Improved Critical",
				description:
					"Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.",
				tags: ["srd.class_feature", "srd.class_feature.improved-critical"],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${REMARKABLE_ATHLETE_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: REMARKABLE_ATHLETE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Remarkable Athlete",
				description: `Champion Remarkable Athlete (${REMARKABLE_ATHLETE_ANCHOR}).`,
				tags: [...classFeatureTags("remarkable-athlete", FIGHTER_CLASS_TAG), CHAMPION_SUBCLASS_TAG],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${REMARKABLE_ATHLETE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: REMARKABLE_ATHLETE_ACTION_LOCAL_ID,
				required_capability: REMARKABLE_ATHLETE_CAPABILITY_ID,
				niche_id: REMARKABLE_ATHLETE_NICHE_ID,
				display_name: "Attune Remarkable Athlete",
				description: "Apply the Remarkable Athlete condition.",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Remarkable Athlete.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: REMARKABLE_ATHLETE_CONDITION_ID,
							},
						},
					],
				},
			},
		},
	];
	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	return {
		toml,
		units: [
			{ kind: "niche_definitions", id: REMARKABLE_ATHLETE_NICHE_ID, sourcePk: "" },
			{
				kind: "condition_definitions",
				id: REMARKABLE_ATHLETE_CONDITION_ID,
				sourcePk: REMARKABLE_ATHLETE_ANCHOR,
			},
			{
				kind: "capability_definitions",
				id: REMARKABLE_ATHLETE_CAPABILITY_ID,
				sourcePk: REMARKABLE_ATHLETE_ANCHOR,
			},
			{
				kind: "action_definitions",
				id: REMARKABLE_ATHLETE_ACTION_ID,
				sourcePk: REMARKABLE_ATHLETE_ANCHOR,
			},
			{
				kind: "consequence_templates",
				id: `${REMARKABLE_ATHLETE_ACTION_ID}/success`,
				sourcePk: "",
			},
			{ kind: "outcome_templates", id: `${REMARKABLE_ATHLETE_ACTION_ID}/outcome`, sourcePk: "" },
			{
				kind: "affordance_templates",
				id: `${REMARKABLE_ATHLETE_ACTION_ID}/affordance`,
				sourcePk: "",
			},
		],
	};
}
