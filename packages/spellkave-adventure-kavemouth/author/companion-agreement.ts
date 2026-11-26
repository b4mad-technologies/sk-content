// pattern: dialog-choice-slots
// pattern: companion-combat
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { CREATURE_NICHE_TAG } from "@spellkave/adventure-runtime/srd-ids";
import { ALDWIN_ENTITY_KEY } from "./lib/entity-keys.ts";
import { BUNDLE } from "./lib/ids.ts";

/** A party invitation commitment, not a persisted dialogue phase. */
export const COMPANION_AGREEMENT_STATE = `${BUNDLE}/companion/rogue/agreement`;
export const COMPANION_SPAWNED_STATE = `${BUNDLE}/companion/rogue/spawned`;
export const companionAgreementAction = (choice: "accept" | "decline" | "reopen") =>
	`${BUNDLE}/companion/rogue/${choice}`;

export function companionAgreementDefinitions(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_resource",
			label: "rogue-spawn-commitment",
			params: {
				bundle: BUNDLE,
				id: "companion/rogue/spawned",
				display_name: "Companion spawned",
				description: "The accepted invitation has spawned its one companion.",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "rogue-companion-agreement-definition",
			params: {
				bundle: BUNDLE,
				id: "companion/rogue/agreement",
				display_name: "Rogue companion agreement",
				description: "Invitation undecided (0), accepted (1), or declined (2).",
				min_value: 0,
				max_value: 2,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
	];
}

export function companionAgreementActions(): VerbCall[] {
	const capability = `${BUNDLE}/companion/rogue/record-agreement`;
	return [
		{
			toolName: "spellkave_define_capability",
			label: "rogue-companion-agreement-capability",
			params: {
				bundle: BUNDLE,
				id: "companion/rogue/record-agreement",
				actor_kind: "entity",
				display_name: "Record companion agreement",
				description: "Aldwin records a directed answer to his offered invitation.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "rogue-companion-agreement-seed",
			params: {
				bundle: BUNDLE,
				kind: "object_state",
				rows: [
					{
						bundle_id: BUNDLE,
						entity_key: ALDWIN_ENTITY_KEY,
						state_id: COMPANION_SPAWNED_STATE,
						value_int: 0,
						value_bool: true,
						expires_at_tick: 0,
						source_template_id: "manifest",
					},
					{
						bundle_id: BUNDLE,
						entity_key: ALDWIN_ENTITY_KEY,
						state_id: COMPANION_AGREEMENT_STATE,
						value_int: 0,
						value_bool: true,
						expires_at_tick: 0,
						source_template_id: "manifest",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "rogue-companion-agreement-grant",
			params: {
				bundle: BUNDLE,
				kind: "actor_capabilities",
				rows: [
					{
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: capability,
						source: BUNDLE,
						source_args_hash: "",
						elevation_class: "",
						extent_kind_ref: "",
						extent_ref: "",
					},
				],
			},
		},
		...(["accept", "decline", "reopen"] as const).map(
			(choice): VerbCall => ({
				toolName: "spellkave_define_action_verb",
				label: `rogue-companion-${choice}`,
				params: {
					bundle: BUNDLE,
					id: `companion/rogue/${choice}`,
					required_capability: capability,
					niche_id: CREATURE_NICHE_TAG,
					display_name: `Companion invitation: ${choice}`,
					description:
						"Record the invitation outcome; reopening proposes a fresh choice, never acceptance.",
					predicate_source: `actor.stat('${COMPANION_AGREEMENT_STATE}') == ${choice === "reopen" ? 2 : 0}`,
					self_eligible: true,
					self_only: true,
					cost_time_ms: 0,
					consequence: {
						frame_writes: [
							{
								ModifyResource: {
									actor: "Actor",
									resource: COMPANION_AGREEMENT_STATE,
									delta_source: String(choice === "accept" ? 1 : choice === "decline" ? 2 : -2),
								},
							},
						],
					},
				},
			}),
		),
	];
}
