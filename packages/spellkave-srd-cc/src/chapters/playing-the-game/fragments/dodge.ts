import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { PRIMARY_CHANNEL_ID, TURN_START_BOUNDARY_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../cover-units";
import {
	DEX_SAVE_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG, ROLL_BIAS_DISADVANTAGE_TAG } from "../tag-value-vocabulary";

export const DODGE_ACTION_ID = `${BUNDLE_ID}/dodge`;
export const DODGE_CAPABILITY_ID = `${BUNDLE_ID}/action/dodge`;
export const DODGE_NICHE_ID = `capability:${DODGE_CAPABILITY_ID}`;
export const DODGE_CONDITION_ID = `${BUNDLE_ID}/condition/dodging`;
export const DODGE_ATTACK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/dodging/attack_disadvantage`;
export const DODGE_DEX_SAVE_CONDITION_ID = `${BUNDLE_ID}/condition/dodging/dex-save`;
export const DODGE_DEX_SAVE_ADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/dodging/dex-save/advantage`;

/**
 * Ship both roll-bias halves of Dodge and its full SRD lifetime.
 *
 * The target-keyed ResolutionCheck bias makes attacks against the dodger roll
 * with Disadvantage. A second internal condition carries actor-keyed
 * Advantage on the authored `srd/dex_save` resolution scope; attacks authored
 * on `srd/attack_roll` do not match it. Both benefits share the owner-relative
 * lifetime: until the start of the dodger's next turn
 * (`cache/markdown/rules-glossary.md:752-754`).
 */
export async function buildDodgeFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		// actor-carried-verbs D1/D7 amendment (canon-warden verdict, ruling bead
		// sk-rd0, V1): Dodge's own `capability:srd/action/dodge` synthetic niche
		// had NO niche_definitions row until now, so it fell back to Gate B's
		// PLACE default (requires a spatial_niche_attachment nobody ever
		// authored) — a live read-back on a freshly staged kavemouth world
		// confirmed Dodge is dead content today (the hero's `affordance` table
		// holds exactly one row, `srd/sense/look/affordance`). This niche row's
		// `provider: "actor"` revives it as a universal self-verb: the acting
		// creature's own Dodge capability now carries it everywhere, no
		// attachment required.
		{
			toolName: "spellkave_write_rows",
			label: "niche:dodge",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: DODGE_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Dodge (self)",
						description:
							"actor-carried-verbs D1/D7 (ruling bead sk-rd0): revives Dodge as a universal " +
							"self-verb — the acting creature's own capability carries this niche everywhere, " +
							"no spatial_niche_attachment required (V1: Dodge was dead content without it).",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
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
			label: "condition:dodging-dex-save",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/dodging/dex-save",
				display_name: "Dodging: Dexterity Save Advantage",
				observable: false,
				gate_predicate_source: "1 == 1",
				description:
					"Internal actor-side half of Dodge: while Dodging, Dexterity saving throws " +
					"made by this creature have Advantage.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/dodging/dex-save/advantage",
						display_name: "Dodge: Advantage on Dexterity saving throws",
						applies_to: DEX_SAVE_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Advantage",
						tags: [ROLL_BIAS_ADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:dodging",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/dodging",
				display_name: "Dodging",
				gate_predicate_source: "1 == 1",
				description:
					"Dodge: attacks against this creature have Disadvantage, and its Dexterity " +
					"saving throws have Advantage, until the start of its next turn.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/dodging/attack_disadvantage",
						display_name: "Dodge: Disadvantage on attacks against the dodger",
						applies_to: "ResolutionCheck",
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:dodge",
			params: {
				bundle: BUNDLE_ID,
				id: "dodge",
				required_capability: DODGE_CAPABILITY_ID,
				niche_id: DODGE_NICHE_ID,
				display_name: "Dodge",
				description:
					"Take the Dodge action; the resulting condition lasts until this actor's " +
					"next turn_start boundary.",
				self_eligible: true,
				self_only: true,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Apply the owner-relative Dodging condition to the acting creature.",
					frame_writes: [
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
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: DODGE_NICHE_ID, sourcePk: "" },
		{
			kind: "modifier_target_definitions",
			id: DEX_SAVE_RESOLUTION_SCOPE_ID,
			sourcePk: "",
		},
		{ kind: "condition_definitions", id: DODGE_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: DODGE_DEX_SAVE_CONDITION_ID, sourcePk: "" },
		{
			kind: "modifier_templates",
			id: DODGE_ATTACK_DISADVANTAGE_MODIFIER_ID,
			sourcePk: "",
		},
		{
			kind: "modifier_templates",
			id: DODGE_DEX_SAVE_ADVANTAGE_MODIFIER_ID,
			sourcePk: "",
		},
		{ kind: "action_definitions", id: DODGE_ACTION_ID, sourcePk: "" },
		{
			kind: "consequence_templates",
			id: `${DODGE_ACTION_ID}/success`,
			sourcePk: "",
		},
		{ kind: "outcome_templates", id: `${DODGE_ACTION_ID}/outcome`, sourcePk: "" },
		{
			kind: "affordance_templates",
			id: `${DODGE_ACTION_ID}/affordance`,
			sourcePk: "",
		},
	];
	// pattern: condition-grant-and-suppression
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/dodge.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: condition-grant-and-suppression",
		"#",
		"# Dodge [Action], cache/markdown/rules-glossary.md:752-754.",
		"# Both halves ship: attacks-against-you Disadvantage plus actor-side",
		"# Dexterity-save Advantage, sharing owner-relative turn_start expiry.",
		'# actor-carried-verbs D1/D7 (sk-rd0): niche/dodge\'s provider="actor"',
		"# niche_definitions row revives this as a universal self-verb (V1: dead",
		"# content before this change, no attachment ever authored for it).",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
