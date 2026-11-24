// L12a: Sap / Slow / Topple / Graze / Vex mastery-gated melee variants.
// pattern: mastery-gated-attack-variant
// pattern: offer-vs-resolution-roll
// → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md
// + docs/substrate-verdicts/weapon-mastery-on-hit-riders.md (Push/Cleave/Nick only)
import type { AuthorTarget } from "@spellkave/tool-authoring";
import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { PRIMARY_CHANNEL_ID } from "../action-economy-units";
import { AC_RESOURCE_ID } from "../armor-class-units";
import { BUNDLE_ID } from "../constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../cover-units";
import { SPEED_WALK_RESOURCE_LOCAL_ID, speedWalkModifierTargetRow } from "../grid-units";
import { HP_ID } from "../hp-units";
import { PROFICIENCY_BONUS_STATE_ID } from "../modifier-units";
import {
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG, ROLL_BIAS_DISADVANTAGE_TAG } from "../tag-value-vocabulary";
import {
	attackMissInscribeFrameWrite,
	MELEE_ATTACK_LOCAL_ID,
	MELEE_ATTACK_RANGE_METERS,
	meleeAttackRollExpr,
	meleeDamageDeltaExpr,
	monsterDeathFrameWrite,
	weaponAttackRangePredicate,
} from "../weapon-attack-units";
import {
	grazeMissDeltaExpr,
	MASTERY_GRAZE_TAG,
	MASTERY_SAP_TAG,
	MASTERY_SLOW_SPEED_PENALTY_CELLS,
	MASTERY_SLOW_TAG,
	MASTERY_TOPPLE_TAG,
	MASTERY_VEX_TAG,
	masteryTagPredicate,
	SAP_CONDITION_ID,
	SAP_CONDITION_LOCAL_ID,
	SLOW_CONDITION_ID,
	SLOW_CONDITION_LOCAL_ID,
	sapApplyStatusWrite,
	slowApplyStatusWrite,
	toppleApplyStatusWrite,
	VEX_CONDITION_ID,
	VEX_CONDITION_LOCAL_ID,
	vexApplyStatusWrite,
} from "../weapon-mastery-riders-units";
import { attackCapabilityCall } from "./actions";
import { DEAD_CONDITION_ID } from "./conditions";

const speedWalkId = `${BUNDLE_ID}/${SPEED_WALK_RESOURCE_LOCAL_ID}`;
const attackVerbNicheId = `capability:${BUNDLE_ID}/action/attack`;
const proficiencyBonusExpr = `actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`;
const stackingRuleId = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
const removePolicyId = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;

function masteryMeleePredicate(tag: string): string {
	return `${weaponAttackRangePredicate("melee")} && ${masteryTagPredicate(tag)}`;
}

function baseMeleeParams(localId: string, displayName: string, description: string, tag: string) {
	return {
		bundle: BUNDLE_ID,
		id: localId,
		required_capability: `${BUNDLE_ID}/action/attack`,
		niche_id: attackVerbNicheId,
		display_name: displayName,
		description,
		resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
		predicate_source: masteryMeleePredicate(tag),
		resolution_mode: "Stochastic" as const,
		resolution_predicate_source: meleeAttackRollExpr(
			`actor.effective('${BUNDLE_ID}/str')`,
			`actor.effective('${BUNDLE_ID}/dex')`,
			`target.effective('${AC_RESOURCE_ID}')`,
			proficiencyBonusExpr,
		),
		on_failure: `${BUNDLE_ID}/${localId}/miss`,
		range_m: MELEE_ATTACK_RANGE_METERS,
		accepts_global_storm: true,
		cost_time_ms: 0,
		spends_channel: PRIMARY_CHANNEL_ID,
	};
}

export async function buildWeaponMasteryRidersFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	// pattern: mastery-gated-attack-variant
	// pattern: offer-vs-resolution-roll

	const calls: VerbCall[] = [
		attackCapabilityCall(),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:speed-walk-mastery",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [speedWalkModifierTargetRow()],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:attack-roll-mastery",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID)],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:mastery-sap",
			params: {
				bundle: BUNDLE_ID,
				id: SAP_CONDITION_LOCAL_ID,
				display_name: "Sapped",
				gate_predicate_source: "1 == 1",
				description:
					"Weapon Mastery Sap (equipment.md:106): Disadvantage on the next attack roll before " +
					"the start of this creature's next turn.",
				remove_time_policy: removePolicyId,
				stacking_rule: stackingRuleId,
				modifiers: [
					{
						id: `${SAP_CONDITION_LOCAL_ID}/attack-disadvantage`,
						display_name: "Sap: Disadvantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:mastery-slow",
			params: {
				bundle: BUNDLE_ID,
				id: SLOW_CONDITION_LOCAL_ID,
				display_name: "Slowed (Mastery)",
				gate_predicate_source: "1 == 1",
				description:
					"Weapon Mastery Slow (equipment.md:108): Speed reduced by 10 feet until the start " +
					"of this creature's next turn.",
				remove_time_policy: removePolicyId,
				stacking_rule: stackingRuleId,
				modifiers: [
					{
						id: `${SLOW_CONDITION_LOCAL_ID}/speed-penalty`,
						display_name: "Slow: −10 ft walking speed",
						applies_to: speedWalkId,
						modifier_expression_source: `let penalty = ${MASTERY_SLOW_SPEED_PENALTY_CELLS}; penalty`,
						delta_kind: "Plus",
						tags: [],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:mastery-vex",
			params: {
				bundle: BUNDLE_ID,
				id: VEX_CONDITION_LOCAL_ID,
				display_name: "Vexed (Mastery)",
				gate_predicate_source: "1 == 1",
				description:
					"Weapon Mastery Vex (equipment.md:112): Advantage on your next attack roll. " +
					"RAW scopes Advantage to the same target hit; same-target identity is not " +
					"readable in modifier predicates (Prone/Charmed gap class) — this condition " +
					"grants broad attack_roll Advantage until the attacker's next turn_start.",
				remove_time_policy: removePolicyId,
				stacking_rule: stackingRuleId,
				modifiers: [
					{
						id: `${VEX_CONDITION_LOCAL_ID}/attack-advantage`,
						display_name: "Vex: Advantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		// Sap attack
		{
			toolName: "spellkave_define_consequence",
			label: "miss:melee-sap",
			params: {
				bundle: BUNDLE_ID,
				id: `${MELEE_ATTACK_LOCAL_ID}-sap/miss`,
				description: "Melee Sap Attack miss.",
				// sk-jay0.1.8.63.40: a miss is a perceivable trace for the target,
				// not silence — weapon-attack-units.ts's attackMissInscribeFrameWrite.
				frame_writes: [attackMissInscribeFrameWrite("Melee Attack (Sap) misses")],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:melee-sap",
			params: {
				...baseMeleeParams(
					`${MELEE_ATTACK_LOCAL_ID}-sap`,
					"Melee Attack (Sap)",
					"Melee attack with a Sap mastery weapon: on hit, damage and Sap the target " +
						"(Disadvantage on its next attack until its turn_start).",
					MASTERY_SAP_TAG,
				),
				consequence: {
					description: "Sap hit: weapon damage + ApplyStatus Sapped.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						sapApplyStatusWrite(),
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		// Slow attack
		{
			toolName: "spellkave_define_consequence",
			label: "miss:melee-slow",
			params: {
				bundle: BUNDLE_ID,
				id: `${MELEE_ATTACK_LOCAL_ID}-slow/miss`,
				description: "Melee Slow Attack miss.",
				frame_writes: [attackMissInscribeFrameWrite("Melee Attack (Slow) misses")],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:melee-slow",
			params: {
				...baseMeleeParams(
					`${MELEE_ATTACK_LOCAL_ID}-slow`,
					"Melee Attack (Slow)",
					"Melee attack with a Slow mastery weapon: on hit, damage and reduce Speed by 10 ft " +
						"until the target's turn_start.",
					MASTERY_SLOW_TAG,
				),
				consequence: {
					description: "Slow hit: weapon damage + ApplyStatus Slowed.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						slowApplyStatusWrite(),
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		// Topple attack (Prone without CON save — save needs attacker facts in ForEach)
		{
			toolName: "spellkave_define_consequence",
			label: "miss:melee-topple",
			params: {
				bundle: BUNDLE_ID,
				id: `${MELEE_ATTACK_LOCAL_ID}-topple/miss`,
				description: "Melee Topple Attack miss.",
				frame_writes: [attackMissInscribeFrameWrite("Melee Attack (Topple) misses")],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:melee-topple",
			params: {
				...baseMeleeParams(
					`${MELEE_ATTACK_LOCAL_ID}-topple`,
					"Melee Attack (Topple)",
					"Melee attack with a Topple mastery weapon: on hit, damage and knock Prone. " +
						"CON save half of Topple is not folded (attacker PB unavailable in ForEach " +
						"target-rebound predicates) — automatic Prone is the content ceiling this lane.",
					MASTERY_TOPPLE_TAG,
				),
				consequence: {
					description: "Topple hit: weapon damage + ApplyStatus Prone (no save).",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						toppleApplyStatusWrite(),
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		// Graze: miss deals ability-mod damage
		{
			toolName: "spellkave_define_consequence",
			label: "miss:melee-graze",
			params: {
				bundle: BUNDLE_ID,
				id: `${MELEE_ATTACK_LOCAL_ID}-graze/miss`,
				description: "Graze miss: ability-modifier damage (equipment.md:100).",
				// sk-jay0.1.8.63.40: the chip damage below already makes a graze
				// miss a self_hit/dealt_hit for both sides — the Inscribe still
				// names WHICH attack this was ("Melee Attack (Graze) misses"),
				// same as every other /miss in this file, rather than leaving
				// Graze the one silent exception.
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							resource: `${BUNDLE_ID}/${HP_ID}`,
							delta_source: grazeMissDeltaExpr(),
						},
					},
					attackMissInscribeFrameWrite("Melee Attack (Graze) misses"),
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:melee-graze",
			params: {
				...baseMeleeParams(
					`${MELEE_ATTACK_LOCAL_ID}-graze`,
					"Melee Attack (Graze)",
					"Melee attack with a Graze mastery weapon: hit deals normal damage; miss still deals " +
						"STR modifier damage (equipment.md:100).",
					MASTERY_GRAZE_TAG,
				),
				consequence: {
					description: "Graze hit: full weapon damage.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		// Vex: Advantage on attacker's next attack (broad scope — same-target not expressible)
		{
			toolName: "spellkave_define_consequence",
			label: "miss:melee-vex",
			params: {
				bundle: BUNDLE_ID,
				id: `${MELEE_ATTACK_LOCAL_ID}-vex/miss`,
				description: "Melee Vex Attack miss.",
				frame_writes: [attackMissInscribeFrameWrite("Melee Attack (Vex) misses")],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:melee-vex",
			params: {
				...baseMeleeParams(
					`${MELEE_ATTACK_LOCAL_ID}-vex`,
					"Melee Attack (Vex)",
					"Melee attack with a Vex mastery weapon: on hit, damage and gain Advantage on " +
						"your attack rolls until your next turn_start (equipment.md:112). RAW is " +
						"vs the same target only — broad Advantage is the content ceiling.",
					MASTERY_VEX_TAG,
				),
				consequence: {
					description: "Vex hit: weapon damage + ApplyStatus Vexed on Actor (attack Advantage).",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						vexApplyStatusWrite(),
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
	];

	const body = await driveUnitScene(BUNDLE_ID, calls, target, {
		omitRowKinds: ["capability_definitions", "capability_definition_tag"],
	});
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/weapon-mastery-riders.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: mastery-gated-attack-variant",
		"# pattern: offer-vs-resolution-roll",
		"# → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md",
		"# Sap/Slow/Topple/Graze/Vex LIVE. Push + Cleave/Nick → docs/substrate-verdicts/weapon-mastery-on-hit-riders.md",
		"# sk-jay0.1.8.63.40: every /miss consequence above Inscribes",
		"# srd/attack-miss (defined once in fragments/attacks.ts) at the",
		"# target's place — a miss is a perceivable trace, not silence.",
		"",
		"",
	].join("\n");

	const units: ChapterUnitSummary[] = [
		{ kind: "condition_definitions", id: SAP_CONDITION_ID, sourcePk: "equipment.md:106" },
		{ kind: "condition_definitions", id: SLOW_CONDITION_ID, sourcePk: "equipment.md:108" },
		{ kind: "condition_definitions", id: VEX_CONDITION_ID, sourcePk: "equipment.md:112" },
		{
			kind: "action_definitions",
			id: `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}-sap`,
			sourcePk: "equipment.md:106",
		},
		{
			kind: "action_definitions",
			id: `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}-slow`,
			sourcePk: "equipment.md:108",
		},
		{
			kind: "action_definitions",
			id: `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}-topple`,
			sourcePk: "equipment.md:110",
		},
		{
			kind: "action_definitions",
			id: `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}-graze`,
			sourcePk: "equipment.md:100",
		},
		{
			kind: "action_definitions",
			id: `${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}-vex`,
			sourcePk: "equipment.md:112",
		},
	];
	return { toml: header + body, units };
}
