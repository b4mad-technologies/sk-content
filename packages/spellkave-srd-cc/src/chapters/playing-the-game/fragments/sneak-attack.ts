// Sneak Attack dedicated shallow action (L12a follow-up / sk-609b.12.1).
// pattern: mastery-gated-attack-variant
// → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md
// K-A: core/resolution_roll_modifier + peers_near_target (classes.md:7039-7043).
import type { AuthorTarget } from "@spellkave/tool-authoring";
import type { ChapterUnitSummary } from "../../chapter-types";
import { WEAPON_SUBJECT } from "../../equipment/weapon-subject";
import { WEAPON_RANGE_TAG_PREFIX } from "../../equipment/weapon-tag-values";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { PRIMARY_CHANNEL_ID, TURN_START_BOUNDARY_ID } from "../action-economy-units";
import { AC_RESOURCE_ID } from "../armor-class-units";
import { attackRollExpr } from "../attack-roll-units";
import { BUNDLE_ID } from "../constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../cover-units";
import { HP_ID } from "../hp-units";
import { PROFICIENCY_BONUS_STATE_ID } from "../modifier-units";
import { ATTACK_ROLL_RESOLUTION_SCOPE_ID } from "../resolution-scope-units";
import {
	SNEAK_ATTACK_ACTION_ID,
	SNEAK_ATTACK_ACTION_LOCAL_ID,
	SNEAK_ATTACK_CAPABILITY_ID,
	SNEAK_ATTACK_EXPENDED_ID,
	SNEAK_ATTACK_EXPENDED_LOCAL_ID,
	SNEAK_ATTACK_ONCE_PER_TURN_RESET,
	sneakAttackBonusDeltaExpr,
	sneakAttackOfferPredicate,
	sneakAttackRangedOfferPredicate,
} from "../sneak-attack-units";
import {
	ATTACK_VERB_NICHE_LOCAL_ID,
	attackAbilityScoreExpr,
	attackMissInscribeFrameWrite,
	MELEE_ATTACK_RANGE_METERS,
	meleeDamageDeltaExpr,
	monsterDeathFrameWrite,
	RANGED_ATTACK_RANGE_METERS,
} from "../weapon-attack-units";
import { attackCapabilityCall } from "./actions";
import { DEAD_CONDITION_ID } from "./conditions";

const ANCHOR = "classes.md:7039-7043 (§ Rogue > Level 1: Sneak Attack)";
const attackVerbNicheId = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;
const proficiencyBonusExpr = `actor.stat('${PROFICIENCY_BONUS_STATE_ID}')`;
const stackingRuleId = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
const removePolicyId = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;

/** Unified to-hit: one attackRollExpr; ability score picks melee vs ranged base. */
function sneakAttackResolutionExpr(): string {
	const str = `actor.effective('${BUNDLE_ID}/str')`;
	const dex = `actor.effective('${BUNDLE_ID}/dex')`;
	// Ranged weapons: DEX base (Finesse still widens to max). Melee: STR base.
	const score =
		`cond(${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.ranged'), ` +
		`${attackAbilityScoreExpr(dex, str)}, ${attackAbilityScoreExpr(str, dex)})`;
	return attackRollExpr({
		scoreExpr: score,
		acExpr: `target.effective('${AC_RESOURCE_ID}')`,
		circumstantialExpr: proficiencyBonusExpr,
	});
}

export async function buildSneakAttackFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	// pattern: mastery-gated-attack-variant

	const calls: VerbCall[] = [
		attackCapabilityCall(),
		{
			toolName: "spellkave_define_condition",
			label: "condition:sneak-attack-expended",
			params: {
				bundle: BUNDLE_ID,
				id: SNEAK_ATTACK_EXPENDED_LOCAL_ID,
				display_name: "Sneak Attack Expended",
				gate_predicate_source: "1 == 1",
				description:
					`Sneak Attack once-per-turn marker (${ANCHOR}). Applied on a hit with the ` +
					`dedicated srd/attack/sneak-attack action. Cleared at the rogue's next turn_start ` +
					`(${SNEAK_ATTACK_ONCE_PER_TURN_RESET}). Identity-only — no modifiers.`,
				remove_time_policy: removePolicyId,
				stacking_rule: stackingRuleId,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: "miss:sneak-attack",
			params: {
				bundle: BUNDLE_ID,
				id: `${SNEAK_ATTACK_ACTION_LOCAL_ID}/miss`,
				description: "Sneak Attack miss: no damage, once-per-turn marker not applied.",
				// sk-jay0.1.8.63.40: a miss is a perceivable trace for the target,
				// not silence — weapon-attack-units.ts's attackMissInscribeFrameWrite.
				frame_writes: [attackMissInscribeFrameWrite("Sneak Attack misses")],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:sneak-attack",
			params: {
				bundle: BUNDLE_ID,
				id: SNEAK_ATTACK_ACTION_LOCAL_ID,
				required_capability: `${BUNDLE_ID}/action/attack`,
				niche_id: attackVerbNicheId,
				display_name: "Sneak Attack",
				description:
					`Once per turn, strike with a Finesse or Ranged weapon for weapon damage plus ` +
					`Nd6 when you have Advantage on the attack roll, or when a non-Incapacitated ally ` +
					`sharing a srd.faction.* tag is within 5 ft of the target and you do not have ` +
					`Disadvantage (${ANCHOR}). Uses K-A facts core/resolution_roll_modifier and ` +
					`peers_near_target. Dice count from ${SNEAK_ATTACK_CAPABILITY_ID}'s ` +
					`srd/rogue/sneak-attack-dice resource. Once-per-turn: ${SNEAK_ATTACK_ONCE_PER_TURN_RESET}.`,
				resolution_scope: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
				predicate_source: sneakAttackOfferPredicate(),
				resolution_mode: "Stochastic",
				resolution_predicate_source: sneakAttackResolutionExpr(),
				on_failure: `${BUNDLE_ID}/${SNEAK_ATTACK_ACTION_LOCAL_ID}/miss`,
				// Outer bound covers both melee reach and longest ranged normal range.
				range_m: Math.max(MELEE_ATTACK_RANGE_METERS, RANGED_ATTACK_RANGE_METERS),
				accepts_global_storm: true,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				non_steering: true, // Round 3: concurrent party attacks; canon review required.
				consequence: {
					description:
						"Sneak Attack hit: weapon + conditional Nd6 (K-A trigger); mark expended until turn_start.",
					frame_writes: [
						{
							// Ordinal 0: ordinary weapon damage (shared ladder, no SA nest).
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: meleeDamageDeltaExpr(),
							},
						},
						{
							// Ordinal 1: conditional SA Nd6 only — separate write keeps DSL shallow.
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: sneakAttackBonusDeltaExpr(),
							},
						},
						{
							// Always mark expended on a successful SA action hit (choosing the
							// dedicated action is the once-per-turn commitment). Bonus dice still
							// require the K-A trigger inside delta_source.
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: SNEAK_ATTACK_EXPENDED_ID,
								expires_at_boundary: {
									boundary_id: TURN_START_BOUNDARY_ID,
									owner_actor: "Actor",
								},
							},
						},
						monsterDeathFrameWrite(`${BUNDLE_ID}/${HP_ID}`, DEAD_CONDITION_ID),
					],
				},
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "sneak-attack-outcome-observation",
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: `${SNEAK_ATTACK_ACTION_ID}/outcome`,
						bundle_id: BUNDLE_ID,
						display_name: "Sneak Attack",
						outcome_bool: true,
						manipulation_action_id: SNEAK_ATTACK_ACTION_ID,
						description: "You strike {target_name} with a Sneak Attack.",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "sneak-attack-ranged-affordance",
			params: {
				bundle: BUNDLE_ID,
				kind: "affordance_templates",
				rows: [
					{
						template_id: `${SNEAK_ATTACK_ACTION_ID}/affordance-ranged`,
						bundle_id: BUNDLE_ID,
						display_name: "Sneak Attack (Ranged)",
						capability_id: `${BUNDLE_ID}/action/attack`,
						niche_id: attackVerbNicheId,
						outcome_template_id: `${SNEAK_ATTACK_ACTION_ID}/outcome`,
						predicate_source: sneakAttackRangedOfferPredicate(),
						range_m: RANGED_ATTACK_RANGE_METERS,
						accepts_global_storm: true,
					},
				],
			},
		},
	];

	const body = await driveUnitScene(BUNDLE_ID, calls, target, {
		omitRowKinds: ["capability_definitions", "capability_definition_tag"],
	});
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/sneak-attack.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: mastery-gated-attack-variant",
		"# → packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md",
		`# ${ANCHOR}`,
		"# K-A Fact 1: actor.stat('core/resolution_roll_modifier') == 1 (Advantage on this resolution)",
		"# K-A Fact 2: peers_near_target('srd.faction.', 1524, 'srd/condition/incapacitated') >= 1",
		`# Once-per-turn reset: ${SNEAK_ATTACK_ONCE_PER_TURN_RESET}`,
		"# sk-jay0.1.8.63.40: the /miss consequence Inscribes srd/attack-miss",
		"# (defined once in fragments/attacks.ts) at the target's place.",
		"",
		"",
	].join("\n");

	const units: ChapterUnitSummary[] = [
		{
			kind: "condition_definitions",
			id: SNEAK_ATTACK_EXPENDED_ID,
			sourcePk: ANCHOR,
		},
		{
			kind: "action_definitions",
			id: SNEAK_ATTACK_ACTION_ID,
			sourcePk: ANCHOR,
		},
	];
	return { toml: header + body, units };
}
