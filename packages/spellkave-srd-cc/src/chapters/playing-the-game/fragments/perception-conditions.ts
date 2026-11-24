// pattern: cross-party-capability-gate
// pattern: condition-grant-and-suppression
//
// sk-609b.16 K-C — perception roll-bias conditions that read the OTHER
// party's capability facts from the roll-bias gate pool
// (`manipulation_spatial_gate_facts` → `subject_capability_facts`).
// Design: docs/substrate-verdicts/perception-kernel-design.md
import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { PRIMARY_CHANNEL_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../cover-units";
import {
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../resolution-scope-units";
import { ROLL_BIAS_ADVANTAGE_TAG, ROLL_BIAS_DISADVANTAGE_TAG } from "../tag-value-vocabulary";

/** Existing species/trait darkvision capability (character-origins traits). */
export const DARKVISION_CAPABILITY_ID = `${BUNDLE_ID}/capability/darkvision`;
/** Counter-capability granted by See Invisibility (and later Truesight). */
export const SEE_INVISIBILITY_CAPABILITY_ID = `${BUNDLE_ID}/capability/see_invisibility`;

export const IN_DARKNESS_CONDITION_ID = `${BUNDLE_ID}/condition/in_darkness`;
export const IN_DARKNESS_MODIFIER_ID = `${BUNDLE_ID}/condition/in_darkness/disadvantage`;
export const IN_DARKNESS_ENTRY_ACTION_ID = `${BUNDLE_ID}/apply-in-darkness`;
export const IN_DARKNESS_ENTRY_CAPABILITY_ID = `${BUNDLE_ID}/action/apply-in-darkness`;
export const IN_DARKNESS_NICHE_ID = `${BUNDLE_ID}/niche/dark-area`;

export const INVISIBLE_CONDITION_ID = `${BUNDLE_ID}/condition/invisible`;
export const INVISIBLE_ATTACK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/invisible/attack_disadvantage`;
export const INVISIBLE_ATTACK_ADVANTAGE_CONDITION_ID = `${BUNDLE_ID}/condition/invisible/attack-advantage`;
export const INVISIBLE_ATTACK_ADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/invisible/attack_advantage`;

export const SEE_INVISIBILITY_CONDITION_ID = `${BUNDLE_ID}/condition/spell/see-invisibility`;
export const SEE_INVISIBILITY_ACTION_ID = `${BUNDLE_ID}/spell/see-invisibility/cast`;
/** Dedicated cast capability — do NOT re-emit srd/action/magic (MF-VAL-266). */
export const SEE_INVISIBILITY_CAST_CAPABILITY_ID = `${BUNDLE_ID}/action/see-invisibility`;
const SEE_INVISIBILITY_NICHE_ID = `capability:${SEE_INVISIBILITY_CAST_CAPABILITY_ID}`;

// DSL has no unary `!` — use `== false` (authored-dark-cave / OA leave-reach idiom).
const DARKVISION_GATE = `actor.has_capability('${DARKVISION_CAPABILITY_ID}') == false`;
const SEE_INVIS_GATE = `actor.has_capability('${SEE_INVISIBILITY_CAPABILITY_ID}') == false`;

/**
 * Ship In Darkness + Invisible roll-bias conditions and the See Invisibility
 * capability-grant carrier. Relies on sk-609b.16 populating capability facts
 * into the roll-bias gate pool — without that wiring both gates silently
 * evaluate `has_capability` as false forever.
 */
export async function buildPerceptionConditionsFragment(
	_target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: "capability:see-invisibility",
			params: {
				bundle: BUNDLE_ID,
				kind: "capability_definitions",
				rows: [
					{
						capability_id: SEE_INVISIBILITY_CAPABILITY_ID,
						bundle_id: BUNDLE_ID,
						actor_kind: "entity",
						display_name: "See Invisibility",
						description:
							"Sensory counter-capability: the bearer treats Invisible creatures as " +
							"visible for attack-roll bias (sk-609b.16). Granted while " +
							`'${SEE_INVISIBILITY_CONDITION_ID}' is active.`,
						default_visibility: "Public",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "capability:apply-in-darkness",
			params: {
				bundle: BUNDLE_ID,
				kind: "capability_definitions",
				rows: [
					{
						capability_id: IN_DARKNESS_ENTRY_CAPABILITY_ID,
						bundle_id: BUNDLE_ID,
						actor_kind: "entity",
						display_name: "Apply In Darkness",
						description:
							"Internal capability for the dark-area on-entry action that applies " +
							`'${IN_DARKNESS_CONDITION_ID}' (spatial_niche_attachment.on_entry_action_id).`,
						default_visibility: "Hidden",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "niche:dark-area",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: IN_DARKNESS_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Dark Area",
						description:
							"Place niche for heavily dark nodes. Attach with on_entry_action_id = " +
							`'${IN_DARKNESS_ENTRY_ACTION_ID}' so entrants receive In Darkness ` +
							"(pattern: cross-party-capability-gate; idiom authored-dark-cave).",
						predicate_source: "",
						provider: "place",
					},
				],
			},
		},
		// Modifier targets first — define_condition FK-checks applies_to.
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:attack-roll+resolution",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID),
					{
						target_id: "ResolutionCheck",
						bundle_id: BUNDLE_ID,
						display_name: "Resolution Check (against bearer)",
						shape: "Mode",
					},
				],
			},
		},
		// ── In Darkness (actor-carried attack-roll Disadvantage) ───────────
		{
			toolName: "spellkave_define_condition",
			label: "condition:in-darkness",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/in_darkness",
				display_name: "In Darkness",
				// pattern: cross-party-capability-gate
				gate_predicate_source: DARKVISION_GATE,
				description:
					"In Darkness (sk-609b.16 / perception-kernel-design.md C.1): while the " +
					"bearer is in a dark area and lacks Darkvision, resolution checks they " +
					"participate in as actor carry Disadvantage. Gate reads " +
					`actor.has_capability('${DARKVISION_CAPABILITY_ID}') via the roll-bias ` +
					"capability fact pool. Applied on node entry via " +
					`'${IN_DARKNESS_ENTRY_ACTION_ID}'.`,
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				// Actor-side axis: bearer is the one "in darkness" making rolls.
				modifiers: [
					{
						id: "condition/in_darkness/disadvantage",
						display_name: "In Darkness: Disadvantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		// Entry action: ApplyStatus In Darkness on the entering actor.
		{
			toolName: "spellkave_define_action_verb",
			label: IN_DARKNESS_ENTRY_ACTION_ID,
			params: {
				bundle: BUNDLE_ID,
				id: "apply-in-darkness",
				required_capability: IN_DARKNESS_ENTRY_CAPABILITY_ID,
				niche_id: IN_DARKNESS_NICHE_ID,
				display_name: "Enter Darkness",
				description:
					"Node-entry ApplyStatus for In Darkness (spatial_niche_attachment.on_entry_action_id). " +
					// pattern: cross-party-capability-gate
					"Idiom: packages/spellkave-world-author/docs/examples/authored-dark-cave.md.",
				predicate_source: "1 == 1",
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				spends_channel: "",
				consequence: {
					description: `Apply ${IN_DARKNESS_CONDITION_ID} to the entering actor.`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: IN_DARKNESS_CONDITION_ID,
							},
						},
					],
				},
			},
		},
		// ── Invisible (target ResolutionCheck Disadv + actor attack Adv) ────
		{
			toolName: "spellkave_define_condition",
			label: "condition:invisible-attack-advantage",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/invisible/attack-advantage",
				display_name: "Invisible: Attack Advantage",
				observable: false,
				gate_predicate_source: "1 == 1",
				description:
					"Internal actor-side half of Invisible: while Invisible, attack rolls " +
					"made by this creature have Advantage (Unseen Attackers).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/invisible/attack_advantage",
						display_name: "Invisible: Advantage on attack rolls",
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
			label: "condition:invisible",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/invisible",
				display_name: "Invisible",
				// pattern: cross-party-capability-gate
				// Gate reads the ATTACKER's capability (Actor subject in roll-bias
				// evaluation against this target-carried condition).
				gate_predicate_source: SEE_INVIS_GATE,
				description:
					"Invisible (sk-609b.16 / perception-kernel-design.md C.2): attacks against " +
					"this creature have Disadvantage unless the attacker has See Invisibility " +
					`('${SEE_INVISIBILITY_CAPABILITY_ID}'). Twin actor-side Advantage lives on ` +
					`'${INVISIBLE_ATTACK_ADVANTAGE_CONDITION_ID}'. Pattern: cross-party-capability-gate.`,
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/invisible/attack_disadvantage",
						display_name: "Invisible: Disadvantage on attacks against bearer",
						applies_to: "ResolutionCheck",
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		// ── See Invisibility: timed condition granting the counter-capability ─
		{
			toolName: "spellkave_define_condition",
			label: "condition:see-invisibility",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/spell/see-invisibility",
				display_name: "See Invisibility",
				gate_predicate_source: "1 == 1",
				// pattern: condition-grant-and-suppression
				grants_capability_while_active: [SEE_INVISIBILITY_CAPABILITY_ID],
				description:
					"See Invisibility (L2, sk-609b.16 C.4): while active, grants " +
					`'${SEE_INVISIBILITY_CAPABILITY_ID}' so Invisible's ResolutionCheck ` +
					"Disadvantage gate fails closed for this attacker. " +
					"pattern: condition-grant-and-suppression.",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "capability+niche:see-invisibility-cast",
			params: {
				bundle: BUNDLE_ID,
				kind: "capability_definitions",
				rows: [
					{
						capability_id: SEE_INVISIBILITY_CAST_CAPABILITY_ID,
						bundle_id: BUNDLE_ID,
						actor_kind: "entity",
						display_name: "Cast See Invisibility",
						description:
							"Dedicated cast capability for See Invisibility (avoids re-emitting " +
							"srd/action/magic — MF-VAL-266).",
						default_visibility: "Public",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "niche:see-invisibility-cast",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: SEE_INVISIBILITY_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "See Invisibility (self)",
						description: "Actor-carried niche for Cast See Invisibility (provider=actor).",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: SEE_INVISIBILITY_ACTION_ID,
			params: {
				bundle: BUNDLE_ID,
				id: "spell/see-invisibility/cast",
				required_capability: SEE_INVISIBILITY_CAST_CAPABILITY_ID,
				niche_id: SEE_INVISIBILITY_NICHE_ID,
				display_name: "Cast See Invisibility",
				description: "See Invisibility — a spell action.",
				predicate_source: "1 == 1",
				self_eligible: true,
				self_only: true,
				range_m: 0,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description: `Apply ${SEE_INVISIBILITY_CONDITION_ID} to the caster.`,
					frame_writes: [
						{
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: SEE_INVISIBILITY_CONDITION_ID,
							},
						},
					],
				},
			},
		},
	];

	const body = await driveUnitScene(BUNDLE_ID, calls);
	const units: ChapterUnitSummary[] = [
		{ kind: "capability_definitions", id: SEE_INVISIBILITY_CAPABILITY_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: IN_DARKNESS_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: INVISIBLE_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: SEE_INVISIBILITY_CONDITION_ID, sourcePk: "" },
		{ kind: "action_definitions", id: IN_DARKNESS_ENTRY_ACTION_ID, sourcePk: "" },
		{
			kind: "action_definitions",
			id: SEE_INVISIBILITY_ACTION_ID,
			sourcePk: "srd-2024_see-invisibility",
		},
	];

	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/perception-conditions.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: cross-party-capability-gate",
		"# pattern: condition-grant-and-suppression",
		"#",
		"# sk-609b.16 K-C: In Darkness / Invisible / See Invisibility roll-bias",
		"# conditions. Design: docs/substrate-verdicts/perception-kernel-design.md.",
		"",
	].join("\n");

	return { toml: `${header}${body}`, units };
}
