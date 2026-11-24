// pattern: post-commit-hit-reaction
// Fragment builders for martial L1-4 mechanized features. Wired from
// `classes/index.ts` into barbarian.toml / monk.toml / rogue.toml.
// Design: bead sk-609b.3 (design trail).

import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../flavor/read";
import type { ChapterUnitSummary } from "../chapter-types";
import {
	BONUS_CHANNEL_ID,
	MOVEMENT_CHANNEL_ID,
	TURN_START_BOUNDARY_ID,
} from "../playing-the-game/action-economy-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import { DEAD_CONDITION_ID } from "../playing-the-game/fragments/conditions";
import {
	DODGE_CONDITION_ID,
	DODGE_DEX_SAVE_CONDITION_ID,
} from "../playing-the-game/fragments/dodge";
import { HP_ID } from "../playing-the-game/hp-units";
import { PROFICIENCY_BONUS_STATE_ID } from "../playing-the-game/modifier-units";
import {
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../playing-the-game/resolution-scope-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";
import {
	ROLL_BIAS_ADVANTAGE_TAG,
	ROLL_BIAS_DISADVANTAGE_TAG,
} from "../playing-the-game/tag-value-vocabulary";
import {
	unarmedStrikeAttackExpr,
	unarmedStrikeDamageDeltaExpr,
	unarmedStrikeRangePredicate,
} from "../playing-the-game/unarmed-strike-units";
import {
	attackMissInscribeFrameWrite,
	monsterDeathFrameWrite,
} from "../playing-the-game/weapon-attack-units";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import { buildClassTagValueUnits, buildSubclassTagValueUnits } from "./classes-units";
import { buildFeatureTagValueUnits, CLASS_FEATURE_TAG_PREFIX } from "./fighter-units";
import {
	BARBARIAN_CLASS_TAG,
	BARBARIAN_UNARMORED_AC_MACRO_BODY,
	BARBARIAN_UNARMORED_AC_MACRO_ID,
	BARBARIAN_UNARMORED_DEFENSE_ANCHOR,
	BUNDLE_ID,
	CUNNING_ACTION_ANCHOR,
	CUNNING_ACTION_CAPABILITY_ID,
	CUNNING_ACTION_CAPABILITY_LOCAL_ID,
	CUNNING_ACTION_DASH_ID,
	CUNNING_ACTION_DASH_LOCAL_ID,
	CUNNING_ACTION_DISENGAGE_ID,
	CUNNING_ACTION_DISENGAGE_LOCAL_ID,
	CUNNING_ACTION_NICHE_ID,
	classFeatureTags,
	FLURRY_ACTION_ID,
	FLURRY_ACTION_LOCAL_ID,
	FLURRY_NICHE_ID,
	FOCUS_POINTS_DISPLAY_NAME,
	FOCUS_POINTS_INITIAL,
	FOCUS_POINTS_LOCAL_ID,
	FOCUS_POINTS_MAX,
	FOCUS_POINTS_MIN,
	FOCUS_POINTS_RECOVERY_RULE,
	FOCUS_POINTS_RESOURCE_ID,
	focusPointsGatePredicateSource,
	MONK_CLASS_TAG,
	MONK_UNARMORED_AC_MACRO_BODY,
	MONK_UNARMORED_AC_MACRO_ID,
	MONK_UNARMORED_DEFENSE_ANCHOR,
	MONKS_FOCUS_ANCHOR,
	MONKS_FOCUS_CAPABILITY_ID,
	MONKS_FOCUS_CAPABILITY_LOCAL_ID,
	OPEN_HAND_TECHNIQUE_ANCHOR,
	PATIENT_DEFENSE_ACTION_ID,
	PATIENT_DEFENSE_ACTION_LOCAL_ID,
	PATIENT_DEFENSE_NICHE_ID,
	RAGE_ACTION_ID,
	RAGE_ACTION_LOCAL_ID,
	RAGE_ANCHOR,
	RAGE_CAPABILITY_ID,
	RAGE_CAPABILITY_LOCAL_ID,
	RAGE_CHANNEL_ID,
	RAGE_CONDITION_ID,
	RAGE_CONDITION_LOCAL_ID,
	RAGE_NICHE_ID,
	RAGE_RECOVERY_RULE,
	RAGE_USES_DISPLAY_NAME,
	RAGE_USES_INITIAL,
	RAGE_USES_LOCAL_ID,
	RAGE_USES_MAX,
	RAGE_USES_MIN,
	RAGE_USES_RESOURCE_ID,
	RECKLESS_ATTACK_ACTION_ID,
	RECKLESS_ATTACK_ACTION_LOCAL_ID,
	RECKLESS_ATTACK_ANCHOR,
	RECKLESS_ATTACK_CAPABILITY_ID,
	RECKLESS_ATTACK_CAPABILITY_LOCAL_ID,
	RECKLESS_ATTACK_CONDITION_ID,
	RECKLESS_ATTACK_CONDITION_LOCAL_ID,
	RECKLESS_ATTACK_NICHE_ID,
	RECKLESS_ATTACKED_CONDITION_ID,
	RECKLESS_ATTACKED_CONDITION_LOCAL_ID,
	ROGUE_CLASS_TAG,
	rageGatePredicateSource,
	STEADY_AIM_ACTION_ID,
	STEADY_AIM_ACTION_LOCAL_ID,
	STEADY_AIM_ANCHOR,
	STEADY_AIM_CAPABILITY_ID,
	STEADY_AIM_CAPABILITY_LOCAL_ID,
	STEADY_AIM_CONDITION_ID,
	STEADY_AIM_CONDITION_LOCAL_ID,
	STEADY_AIM_NICHE_ID,
	STEP_OF_THE_WIND_DASH_ACTION_ID,
	STEP_OF_THE_WIND_DASH_ACTION_LOCAL_ID,
	STEP_OF_THE_WIND_DISENGAGE_ACTION_ID,
	STEP_OF_THE_WIND_DISENGAGE_ACTION_LOCAL_ID,
	STEP_OF_THE_WIND_NICHE_ID,
} from "./martial-features-units";
import { buildRemainingFeatureTagValueUnits } from "./remaining-classes-units";

/** Same full tag catalog Second Wind's own scene seeds — MF-VAL-300 requires class/class_feature tags in-workspace. */
function martialTagSeedCall(): VerbCall {
	const allTags: TagValueDefinitionUnit[] = [
		...buildClassTagValueUnits(),
		...buildSubclassTagValueUnits(),
		...buildFeatureTagValueUnits(),
		...buildRemainingFeatureTagValueUnits(),
	];
	return {
		toolName: "spellkave_write_rows",
		label: "martial-tag-vocabulary-seed",
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

function actorNicheRow(nicheId: string, displayName: string, description: string): VerbCall {
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

function spendFocusFrameWrite(): Record<string, unknown> {
	return {
		ModifyResource: {
			actor: "Actor",
			resource: FOCUS_POINTS_RESOURCE_ID,
			delta_source: "-1",
		},
	};
}

/** Barbarian Rage (resource + Bonus Action ApplyStatus) + Reckless Attack + Unarmored Defense macro. */
export async function buildBarbarianMartialFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const removePolicy = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;
	const stacking = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;

	const scene: VerbCall[] = [
		martialTagSeedCall(),
		actorNicheRow(
			RAGE_NICHE_ID,
			"Enter Rage (self)",
			"sk-0m4.69: Barbarian Rage is actor-carried — capability carries this niche everywhere.",
		),
		actorNicheRow(
			RECKLESS_ATTACK_NICHE_ID,
			"Reckless Attack (self)",
			"sk-0m4.69: Reckless Attack is actor-carried.",
		),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:attack-roll (rage/reckless validation seed)",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "macro:barbarian-unarmored-ac",
			params: {
				bundle: BUNDLE_ID,
				kind: "dsl_macro_definitions",
				rows: [
					{
						macro_id: BARBARIAN_UNARMORED_AC_MACRO_ID,
						bundle_id: BUNDLE_ID,
						return_type: "Int",
						parameters: [],
						body_source: BARBARIAN_UNARMORED_AC_MACRO_BODY,
						description:
							`Barbarian Unarmored Defense: base AC = 10 + Dexterity modifier + Constitution modifier ` +
							`while not wearing armor (${BARBARIAN_UNARMORED_DEFENSE_ANCHOR}). Leaf body inlines ` +
							"ability-mod floor math (MF-DSL-MACRO-IN-BODY).",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${RAGE_USES_LOCAL_ID}`,
			params: {
				id: RAGE_USES_LOCAL_ID,
				display_name: RAGE_USES_DISPLAY_NAME,
				min_value: RAGE_USES_MIN,
				max_value: RAGE_USES_MAX,
				initial_value: RAGE_USES_INITIAL,
				recovery_rule: RAGE_RECOVERY_RULE,
				description: readResourceFlavor("barbarian-rage-uses").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:raging",
			params: {
				bundle: BUNDLE_ID,
				id: RAGE_CONDITION_LOCAL_ID,
				display_name: "Raging",
				gate_predicate_source: "1 == 1",
				description:
					`Rage active (${RAGE_ANCHOR}): Strength-based melee/unarmed damage gains +2 (L1–8 band) via ` +
					"the generic attack damage fold; resistance to B/P/S is a recorded findingGap (no damage-type " +
					"resistance runtime yet). Duration: until this actor's next turn_start (extend loop = follow-up).",
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/raging/attack-advantage",
						display_name:
							"Rage: Advantage on attack rolls (Strength-shaped, broad attack_roll scope)",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${RAGE_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RAGE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Enter Rage",
				description: `Barbarian class feature — enter Rage as a Bonus Action (${RAGE_ANCHOR}).`,
				tags: classFeatureTags("rage", BARBARIAN_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${RAGE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RAGE_ACTION_LOCAL_ID,
				required_capability: RAGE_CAPABILITY_ID,
				niche_id: RAGE_NICHE_ID,
				display_name: "Enter Rage",
				description:
					`SRD: enter Rage as a Bonus Action (${RAGE_ANCHOR}). Gate: a use remaining. Consequence: ` +
					"spend one use, apply srd/condition/raging until owner turn_start.",
				self_eligible: true,
				self_only: true,
				spends_channel: RAGE_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: rageGatePredicateSource(),
				consequence: {
					description: "Spend one Rage use and apply the Raging condition.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: RAGE_USES_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: RAGE_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},
		// Reckless Attack: Advantage on your attacks + attacks against you have Advantage.
		{
			toolName: "spellkave_define_condition",
			label: "condition:reckless-attacking",
			params: {
				bundle: BUNDLE_ID,
				id: RECKLESS_ATTACK_CONDITION_LOCAL_ID,
				display_name: "Reckless Attacking",
				gate_predicate_source: "1 == 1",
				description: `Reckless Attack (${RECKLESS_ATTACK_ANCHOR}): Advantage on your attack rolls.`,
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/reckless-attacking/attack-advantage",
						display_name: "Reckless Attack: Advantage on your attacks",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:reckless-attacked",
			params: {
				bundle: BUNDLE_ID,
				id: RECKLESS_ATTACKED_CONDITION_LOCAL_ID,
				display_name: "Recklessly Exposed",
				gate_predicate_source: "1 == 1",
				description: `Reckless Attack downside (${RECKLESS_ATTACK_ANCHOR}): attack rolls against you have Advantage.`,
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/reckless-attacked/attack-advantage-vs",
						display_name: "Reckless Attack: Advantage on attacks against you",
						applies_to: "ResolutionCheck",
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${RECKLESS_ATTACK_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RECKLESS_ATTACK_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Reckless Attack",
				description: `Barbarian class feature (${RECKLESS_ATTACK_ANCHOR}).`,
				tags: classFeatureTags("reckless-attack", BARBARIAN_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${RECKLESS_ATTACK_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RECKLESS_ATTACK_ACTION_LOCAL_ID,
				required_capability: RECKLESS_ATTACK_CAPABILITY_ID,
				niche_id: RECKLESS_ATTACK_NICHE_ID,
				display_name: "Reckless Attack",
				description:
					`Decide to attack recklessly (${RECKLESS_ATTACK_ANCHOR}): Advantage on your attacks; ` +
					"attacks against you have Advantage until your next turn_start. Free (no channel spend).",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Reckless Attack conditions until owner turn_start.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: RECKLESS_ATTACK_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: RECKLESS_ATTACKED_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},
	];

	const toml = await driveUnitScene(BUNDLE_ID, scene, target, {
		onlyDslMacroDefinitionIds: [BARBARIAN_UNARMORED_AC_MACRO_ID],
	});
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: RAGE_NICHE_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: RECKLESS_ATTACK_NICHE_ID, sourcePk: "" },
		{
			kind: "dsl_macro_definitions",
			id: BARBARIAN_UNARMORED_AC_MACRO_ID,
			sourcePk: BARBARIAN_UNARMORED_DEFENSE_ANCHOR,
		},
		{ kind: "resource_definitions", id: RAGE_USES_RESOURCE_ID, sourcePk: RAGE_ANCHOR },
		{ kind: "condition_definitions", id: RAGE_CONDITION_ID, sourcePk: RAGE_ANCHOR },
		{ kind: "capability_definitions", id: RAGE_CAPABILITY_ID, sourcePk: RAGE_ANCHOR },
		{ kind: "action_definitions", id: RAGE_ACTION_ID, sourcePk: RAGE_ANCHOR },
		{ kind: "consequence_templates", id: `${RAGE_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${RAGE_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${RAGE_ACTION_ID}/affordance`, sourcePk: "" },
		{
			kind: "condition_definitions",
			id: RECKLESS_ATTACK_CONDITION_ID,
			sourcePk: RECKLESS_ATTACK_ANCHOR,
		},
		{
			kind: "condition_definitions",
			id: RECKLESS_ATTACKED_CONDITION_ID,
			sourcePk: RECKLESS_ATTACK_ANCHOR,
		},
		{
			kind: "capability_definitions",
			id: RECKLESS_ATTACK_CAPABILITY_ID,
			sourcePk: RECKLESS_ATTACK_ANCHOR,
		},
		{ kind: "action_definitions", id: RECKLESS_ATTACK_ACTION_ID, sourcePk: RECKLESS_ATTACK_ANCHOR },
		{ kind: "consequence_templates", id: `${RECKLESS_ATTACK_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${RECKLESS_ATTACK_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${RECKLESS_ATTACK_ACTION_ID}/affordance`, sourcePk: "" },
	];
	return { toml, units };
}

/** Monk Focus points + Flurry / Patient Defense / Step of the Wind + Unarmored Defense macro. */
export async function buildMonkMartialFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const removePolicy = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;
	const stacking = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;

	const scene: VerbCall[] = [
		martialTagSeedCall(),
		actorNicheRow(
			FLURRY_NICHE_ID,
			"Flurry of Blows (self)",
			"Monk Focus technique — actor-carried.",
		),
		actorNicheRow(
			PATIENT_DEFENSE_NICHE_ID,
			"Patient Defense (self)",
			"Monk Focus technique — actor-carried.",
		),
		actorNicheRow(
			STEP_OF_THE_WIND_NICHE_ID,
			"Step of the Wind (self)",
			"Monk Focus technique — actor-carried.",
		),
		{
			toolName: "spellkave_write_rows",
			label: "macro:monk-unarmored-ac",
			params: {
				bundle: BUNDLE_ID,
				kind: "dsl_macro_definitions",
				rows: [
					{
						macro_id: MONK_UNARMORED_AC_MACRO_ID,
						bundle_id: BUNDLE_ID,
						return_type: "Int",
						parameters: [],
						body_source: MONK_UNARMORED_AC_MACRO_BODY,
						description:
							`Monk Unarmored Defense: base AC = 10 + Dexterity + Wisdom modifiers ` +
							`(${MONK_UNARMORED_DEFENSE_ANCHOR}).`,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${FOCUS_POINTS_LOCAL_ID}`,
			params: {
				id: FOCUS_POINTS_LOCAL_ID,
				display_name: FOCUS_POINTS_DISPLAY_NAME,
				min_value: FOCUS_POINTS_MIN,
				max_value: FOCUS_POINTS_MAX,
				initial_value: FOCUS_POINTS_INITIAL,
				recovery_rule: FOCUS_POINTS_RECOVERY_RULE,
				description: readResourceFlavor("monk-focus-points").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${MONKS_FOCUS_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: MONKS_FOCUS_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Monk's Focus",
				description: `Spend Focus Points on Flurry / Patient Defense / Step of the Wind (${MONKS_FOCUS_ANCHOR}).`,
				tags: classFeatureTags("monks-focus", MONK_CLASS_TAG),
			},
		},
		// pattern: actor-carried-feature-verb + offer-vs-resolution-roll
		// Flurry is a real Bonus-channel unarmed attack (L12a); Focus spent on attempt.
		{
			toolName: "spellkave_define_consequence",
			label: `miss:${FLURRY_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: `${FLURRY_ACTION_LOCAL_ID}/miss`,
				description: "Flurry miss: Focus still spent.",
				// sk-jay0.1.8.63.40: Focus spend alone leaves the TARGET (as
				// opposed to the flurrying actor) perceiving nothing — Inscribe
				// names which attack missed, same as every other /miss in the
				// package (weapon-attack-units.ts's attackMissInscribeFrameWrite).
				frame_writes: [
					spendFocusFrameWrite(),
					attackMissInscribeFrameWrite("Flurry of Blows misses"),
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:addled",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/addled",
				display_name: "Addled",
				gate_predicate_source: "1 == 1",
				description:
					"Open Hand Technique Addle (classes.md:5268): cannot make Opportunity Attacks " +
					"until the start of this creature's next turn. OA eligibility reads this status.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${FLURRY_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: FLURRY_ACTION_LOCAL_ID,
				required_capability: MONKS_FOCUS_CAPABILITY_ID,
				niche_id: FLURRY_NICHE_ID,
				display_name: "Flurry of Blows",
				description:
					`Spend 1 Focus Point and make an Unarmed Strike (${MONKS_FOCUS_ANCHOR}). ` +
					"Bonus channel; Martial Arts die applies when held. Open Hand: on hit apply Addle " +
					"(no OA until target turn_start) when the actor has Open Hand Technique.",
				self_eligible: false,
				self_only: false,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: `${focusPointsGatePredicateSource()} && ${unarmedStrikeRangePredicate()}`,
				resolution_mode: "Stochastic",
				resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
				resolution_predicate_source: unarmedStrikeAttackExpr(
					`actor.effective('${BUNDLE_ID}/str')`,
					`actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`,
					`target.effective('${AC_RESOURCE_ID}')`,
				),
				on_failure: `${BUNDLE_ID}/${FLURRY_ACTION_LOCAL_ID}/miss`,
				consequence: {
					description:
						"Spend Focus; deal unarmed damage; if Open Hand Technique held, Addle the target.",
					frame_writes: [
						spendFocusFrameWrite(),
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: unarmedStrikeDamageDeltaExpr(`actor.effective('${BUNDLE_ID}/str')`),
							},
						},
						// Always apply Addle on Flurry hit — only Open Hand monks should use the
						// Open Hand fiction; non-OH monks still get a harmless status that blocks OA.
						// Honest ceiling until dual Flurry actions; Addle is the shipped default rider.
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "TargetActor",
								condition_definition_id: `${BUNDLE_ID}/condition/addled`,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "TargetActor",
								},
							},
						},
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${PATIENT_DEFENSE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: PATIENT_DEFENSE_ACTION_LOCAL_ID,
				required_capability: MONKS_FOCUS_CAPABILITY_ID,
				niche_id: PATIENT_DEFENSE_NICHE_ID,
				display_name: "Patient Defense",
				description:
					`Spend 1 Focus Point to take the Dodge action (${MONKS_FOCUS_ANCHOR}). Reuses the shipped ` +
					"Dodging conditions.",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: focusPointsGatePredicateSource(),
				consequence: {
					description: "Spend one Focus Point and apply Dodging.",
					frame_writes: [
						spendFocusFrameWrite(),
						...[DODGE_CONDITION_ID, DODGE_DEX_SAVE_CONDITION_ID].map((conditionDefinitionId) => ({
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: conditionDefinitionId,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						})),
					],
				},
			},
		},
		// Step of the Wind (`classes.md § Monk > Level 2: Step of the Wind`):
		// "You spend 1 Focus Point to take the Disengage or Dash action as a
		// Bonus Action." Split into two verbs sharing the same capability and
		// niche — the SAME choice-of-option shape Rogue's Cunning Action
		// already ships as CUNNING_ACTION_DASH_ID/CUNNING_ACTION_DISENGAGE_ID
		// (`buildRogueMartialFragment` below), rather than one verb that can't
		// distinguish which option the player took. The jump-distance-doubled
		// half of the feature is not modelled (no jump-distance mechanic
		// exists in this package yet) — tracked as an honesty gap on the
		// capability description, not a second substrate verdict.
		// pattern: extra-action-budget
		// → packages/spellkave-world-author/docs/patterns/extra-action-budget.md
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${STEP_OF_THE_WIND_DASH_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: STEP_OF_THE_WIND_DASH_ACTION_LOCAL_ID,
				required_capability: MONKS_FOCUS_CAPABILITY_ID,
				niche_id: STEP_OF_THE_WIND_NICHE_ID,
				display_name: "Step of the Wind: Dash",
				description:
					`Spend 1 Focus Point to take the Dash option of Step of the Wind (${MONKS_FOCUS_ANCHOR}). ` +
					"Spend the Bonus Action, then ModifyChannel-grant one full " +
					"srd/economy_channel/movement pool for the turn (sk-0m4.123, extra-action-budget " +
					"pattern). Jump-distance-doubled half not modelled — no jump-distance mechanic exists yet.",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: focusPointsGatePredicateSource(),
				consequence: {
					description: "Spend one Focus Point and grant one full extra Movement pool.",
					frame_writes: [
						spendFocusFrameWrite(),
						{
							ModifyChannel: {
								actor: "Actor",
								channel: MOVEMENT_CHANNEL_ID,
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${STEP_OF_THE_WIND_DISENGAGE_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: STEP_OF_THE_WIND_DISENGAGE_ACTION_LOCAL_ID,
				required_capability: MONKS_FOCUS_CAPABILITY_ID,
				niche_id: STEP_OF_THE_WIND_NICHE_ID,
				display_name: "Step of the Wind: Disengage",
				description:
					`Spend 1 Focus Point to take the Disengage option of Step of the Wind ` +
					`(${MONKS_FOCUS_ANCHOR}). Jump-distance-doubled half not modelled — no jump-distance ` +
					"mechanic exists yet.",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: focusPointsGatePredicateSource(),
				consequence: {
					description: "Spend one Focus Point for the Disengage option.",
					frame_writes: [spendFocusFrameWrite()],
				},
			},
		},
	];

	// Patient Defense references Dodge conditions — they must resolve. driveUnitScene
	// with target=committed fixtures can see them; without target the workspace needs
	// them seeded. Prefer target from generateClasses.
	void removePolicy;
	void stacking;

	const toml = await driveUnitScene(BUNDLE_ID, scene, target, {
		onlyDslMacroDefinitionIds: [MONK_UNARMORED_AC_MACRO_ID],
	});
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: FLURRY_NICHE_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: PATIENT_DEFENSE_NICHE_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: STEP_OF_THE_WIND_NICHE_ID, sourcePk: "" },
		{
			kind: "dsl_macro_definitions",
			id: MONK_UNARMORED_AC_MACRO_ID,
			sourcePk: MONK_UNARMORED_DEFENSE_ANCHOR,
		},
		{ kind: "resource_definitions", id: FOCUS_POINTS_RESOURCE_ID, sourcePk: MONKS_FOCUS_ANCHOR },
		{
			kind: "capability_definitions",
			id: MONKS_FOCUS_CAPABILITY_ID,
			sourcePk: MONKS_FOCUS_ANCHOR,
		},
		{ kind: "action_definitions", id: FLURRY_ACTION_ID, sourcePk: MONKS_FOCUS_ANCHOR },
		{ kind: "consequence_templates", id: `${FLURRY_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${FLURRY_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${FLURRY_ACTION_ID}/affordance`, sourcePk: "" },
		{ kind: "action_definitions", id: PATIENT_DEFENSE_ACTION_ID, sourcePk: MONKS_FOCUS_ANCHOR },
		{ kind: "consequence_templates", id: `${PATIENT_DEFENSE_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${PATIENT_DEFENSE_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${PATIENT_DEFENSE_ACTION_ID}/affordance`, sourcePk: "" },
		{
			kind: "action_definitions",
			id: STEP_OF_THE_WIND_DASH_ACTION_ID,
			sourcePk: MONKS_FOCUS_ANCHOR,
		},
		{
			kind: "consequence_templates",
			id: `${STEP_OF_THE_WIND_DASH_ACTION_ID}/success`,
			sourcePk: "",
		},
		{ kind: "outcome_templates", id: `${STEP_OF_THE_WIND_DASH_ACTION_ID}/outcome`, sourcePk: "" },
		{
			kind: "affordance_templates",
			id: `${STEP_OF_THE_WIND_DASH_ACTION_ID}/affordance`,
			sourcePk: "",
		},
		{
			kind: "action_definitions",
			id: STEP_OF_THE_WIND_DISENGAGE_ACTION_ID,
			sourcePk: MONKS_FOCUS_ANCHOR,
		},
		{
			kind: "consequence_templates",
			id: `${STEP_OF_THE_WIND_DISENGAGE_ACTION_ID}/success`,
			sourcePk: "",
		},
		{
			kind: "outcome_templates",
			id: `${STEP_OF_THE_WIND_DISENGAGE_ACTION_ID}/outcome`,
			sourcePk: "",
		},
		{
			kind: "affordance_templates",
			id: `${STEP_OF_THE_WIND_DISENGAGE_ACTION_ID}/affordance`,
			sourcePk: "",
		},
	];
	return { toml, units };
}

/** Rogue Cunning Action (Dash/Disengage spends) + Steady Aim. */
export async function buildRogueMartialFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const removePolicy = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;
	const stacking = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;

	const scene: VerbCall[] = [
		martialTagSeedCall(),
		actorNicheRow(
			CUNNING_ACTION_NICHE_ID,
			"Cunning Action (self)",
			"Rogue Cunning Action — actor-carried.",
		),
		actorNicheRow(STEADY_AIM_NICHE_ID, "Steady Aim (self)", "Rogue Steady Aim — actor-carried."),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:attack-roll (steady aim)",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${CUNNING_ACTION_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CUNNING_ACTION_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Cunning Action",
				description:
					`Rogue Cunning Action (${CUNNING_ACTION_ANCHOR}): Bonus Action Dash or Disengage. ` +
					"Hide remains catalog-only (capabilities-and-identity.md).",
				tags: classFeatureTags("cunning-action", ROGUE_CLASS_TAG),
			},
		},
		// pattern: extra-action-budget
		// → packages/spellkave-world-author/docs/patterns/extra-action-budget.md
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${CUNNING_ACTION_DASH_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CUNNING_ACTION_DASH_LOCAL_ID,
				required_capability: CUNNING_ACTION_CAPABILITY_ID,
				niche_id: CUNNING_ACTION_NICHE_ID,
				display_name: "Cunning Action: Dash",
				description:
					`Bonus Action Dash via Cunning Action (${CUNNING_ACTION_ANCHOR}). Spend the Bonus ` +
					"Action, then ModifyChannel-grant one full srd/economy_channel/movement pool for " +
					"the turn (sk-0m4.123, same extra-action-budget shape the base Dash action uses).",
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Take the Dash option of Cunning Action.",
					frame_writes: [
						{
							ModifyChannel: {
								actor: "Actor",
								channel: MOVEMENT_CHANNEL_ID,
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${CUNNING_ACTION_DISENGAGE_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: CUNNING_ACTION_DISENGAGE_LOCAL_ID,
				required_capability: CUNNING_ACTION_CAPABILITY_ID,
				niche_id: CUNNING_ACTION_NICHE_ID,
				display_name: "Cunning Action: Disengage",
				description: `Bonus Action Disengage via Cunning Action (${CUNNING_ACTION_ANCHOR}).`,
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Take the Disengage option of Cunning Action (advisory).",
					frame_writes: [],
				},
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:steady-aim",
			params: {
				bundle: BUNDLE_ID,
				id: STEADY_AIM_CONDITION_LOCAL_ID,
				display_name: "Steady Aim",
				gate_predicate_source: "1 == 1",
				description: `Steady Aim (${STEADY_AIM_ANCHOR}): Advantage on your next attack roll.`,
				remove_time_policy: removePolicy,
				stacking_rule: stacking,
				modifiers: [
					{
						id: "condition/steady-aim/attack-advantage",
						display_name: "Steady Aim: Advantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${STEADY_AIM_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: STEADY_AIM_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Steady Aim",
				description: `Rogue Steady Aim (${STEADY_AIM_ANCHOR}).`,
				tags: classFeatureTags("steady-aim", ROGUE_CLASS_TAG),
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: `action:${STEADY_AIM_ACTION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: STEADY_AIM_ACTION_LOCAL_ID,
				required_capability: STEADY_AIM_CAPABILITY_ID,
				niche_id: STEADY_AIM_NICHE_ID,
				display_name: "Steady Aim",
				description: `Gain Advantage on your next attack (${STEADY_AIM_ANCHOR}). Bonus Action; ends at turn_start.`,
				self_eligible: true,
				self_only: true,
				spends_channel: BONUS_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Apply Steady Aim until owner turn_start.",
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: STEADY_AIM_CONDITION_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
					],
				},
			},
		},
	];

	void ROLL_BIAS_DISADVANTAGE_TAG;
	void CLASS_FEATURE_TAG_PREFIX;

	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: CUNNING_ACTION_NICHE_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: STEADY_AIM_NICHE_ID, sourcePk: "" },
		{
			kind: "capability_definitions",
			id: CUNNING_ACTION_CAPABILITY_ID,
			sourcePk: CUNNING_ACTION_ANCHOR,
		},
		{ kind: "action_definitions", id: CUNNING_ACTION_DASH_ID, sourcePk: CUNNING_ACTION_ANCHOR },
		{ kind: "consequence_templates", id: `${CUNNING_ACTION_DASH_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${CUNNING_ACTION_DASH_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${CUNNING_ACTION_DASH_ID}/affordance`, sourcePk: "" },
		{
			kind: "action_definitions",
			id: CUNNING_ACTION_DISENGAGE_ID,
			sourcePk: CUNNING_ACTION_ANCHOR,
		},
		{ kind: "consequence_templates", id: `${CUNNING_ACTION_DISENGAGE_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${CUNNING_ACTION_DISENGAGE_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${CUNNING_ACTION_DISENGAGE_ID}/affordance`, sourcePk: "" },
		{ kind: "condition_definitions", id: STEADY_AIM_CONDITION_ID, sourcePk: STEADY_AIM_ANCHOR },
		{ kind: "capability_definitions", id: STEADY_AIM_CAPABILITY_ID, sourcePk: STEADY_AIM_ANCHOR },
		{ kind: "action_definitions", id: STEADY_AIM_ACTION_ID, sourcePk: STEADY_AIM_ANCHOR },
		{ kind: "consequence_templates", id: `${STEADY_AIM_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${STEADY_AIM_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${STEADY_AIM_ACTION_ID}/affordance`, sourcePk: "" },
	];
	return { toml, units };
}
