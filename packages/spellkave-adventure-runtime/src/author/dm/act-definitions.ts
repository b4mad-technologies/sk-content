// pattern: condition-grant-and-suppression
// pattern: dialog-choice-slots
// ADR-0155: phase handles are conditions; menus bind labels to one speech trace.

import {
	ADOPT_APPEARANCE_CAPABILITY_ID,
	ADOPT_BACKSTORY_CAPABILITY_ID,
	ADOPT_NAME_CAPABILITY_ID,
	ADOPT_PROPOSED_SCORES_CAPABILITY_ID,
	BACK_CAPABILITY_ID,
	CREATION_STATION_TAG,
	DESCRIBE_APPEARANCE_CAPABILITY_ID,
	DESCRIBE_BACKSTORY_CAPABILITY_ID,
	DISCARD_CAPABILITY_ID,
	ENTER_NAME_CAPABILITY_ID,
	FORWARD_CAPABILITY_ID,
	SET_ABILITY_SCORES_CAPABILITY_ID,
} from "../../dm/creation/ids.ts";
import {
	DIALOG_SAY_CAPABILITY_ID,
	DIALOG_SET_OPEN_CAPABILITY_ID,
	dialogChoiceActionId,
} from "../../dm/dialog/ids.ts";
import {
	ACCEPT_LEVEL_UP_OFFER_CAPABILITY_ID,
	DARING_ADVANCE_CAPABILITY_ID,
	DECLINE_LEVEL_UP_OFFER_CAPABILITY_ID,
	LEVEL_UP_CONFIRM_CAPABILITY_ID,
	LEVEL_UP_DISCARD_CAPABILITY_ID,
	STEADY_ADVANCE_CAPABILITY_ID,
} from "../../dm/level-up/ids.ts";
import type { VerbCall } from "../../dm/lib/scene-driver.ts";
import { SPEECH_TRACE_KIND_ID } from "../../srd-ids.ts";
import { type AuthoredAct, authoredActCalls } from "./authored-act.ts";

export function dmActDefinitions(): VerbCall[] {
	const conditions = [
		{
			id: "dm/creation/drafting",
			capabilities: [
				DIALOG_SAY_CAPABILITY_ID,
				DISCARD_CAPABILITY_ID,
				BACK_CAPABILITY_ID,
				FORWARD_CAPABILITY_ID,
				ENTER_NAME_CAPABILITY_ID,
				DESCRIBE_APPEARANCE_CAPABILITY_ID,
				DESCRIBE_BACKSTORY_CAPABILITY_ID,
				SET_ABILITY_SCORES_CAPABILITY_ID,
			],
		},
		{
			id: "dm/level-up/drafting",
			capabilities: [
				ACCEPT_LEVEL_UP_OFFER_CAPABILITY_ID,
				DECLINE_LEVEL_UP_OFFER_CAPABILITY_ID,
				STEADY_ADVANCE_CAPABILITY_ID,
				DARING_ADVANCE_CAPABILITY_ID,
				LEVEL_UP_CONFIRM_CAPABILITY_ID,
				LEVEL_UP_DISCARD_CAPABILITY_ID,
			],
		},
		...Object.entries({
			scores: ADOPT_PROPOSED_SCORES_CAPABILITY_ID,
			name: ADOPT_NAME_CAPABILITY_ID,
			appearance: ADOPT_APPEARANCE_CAPABILITY_ID,
			backstory: ADOPT_BACKSTORY_CAPABILITY_ID,
		}).map(([field, capability]) => ({
			id: `dm/creation/pending/${field}`,
			capabilities: [capability],
		})),
	];
	const acts: AuthoredAct[] = conditions.flatMap((condition) => [
		{
			id:
				condition.id === "dm/creation/drafting"
					? "dm/act/creation/open"
					: `dm/act/${condition.id.slice(3)}/open`,
			capability: "frontier.afflict",
			writes: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "TargetActor",
						condition_definition_id: condition.id,
					},
				},
			],
		},
		{
			id:
				condition.id === "dm/creation/drafting"
					? "dm/act/creation/finish"
					: condition.id === "dm/level-up/drafting"
						? "dm/act/level-up/close"
						: `dm/act/${condition.id.slice(3)}/close`,
			capability: "frontier.afflict",
			writes: [
				{
					RemoveCondition: {
						target_kind: "entity",
						target_ref: "TargetActor",
						condition_definition_id: condition.id,
						source_match: "Any",
					},
				},
			],
		},
	]);
	// The drafting condition's public open action has no redundant /drafting segment.
	const levelOpen = acts.find((act) => act.id === "dm/act/level-up/drafting/open");
	if (levelOpen !== undefined) levelOpen.id = "dm/act/level-up/open";
	const menus: AuthoredAct[] = Array.from({ length: 16 }, (_, index) => {
		const n = index + 1;
		return {
			id: `dm/dialog/ask-menu/${n}`,
			capability: DIALOG_SET_OPEN_CAPABILITY_ID,
			speechAct: true,
			writes: [
				{
					Inscribe: {
						kind: SPEECH_TRACE_KIND_ID,
						location_kind: "binding",
						location_ref: "TargetSpatialRef",
						payload_json: "{}",
						carry_dispatch_text: true,
						carry_addressee: true,
						carry_dispatch_options: true,
						// The asker's machine side of the question (step, outline,
						// draft so far) rides the same trace as its labels.
						carry_dispatch_context: true,
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: "dm/dialog/prompt",
						delta_source: "16 - actor.stat('dm/dialog/prompt')",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: "dm/dialog/open",
						delta_source: `${n} - actor.stat('dm/dialog/open')`,
					},
				},
			],
		};
	});
	return [
		{
			toolName: "spellkave_write_rows",
			label: "dialogue-prompt-namespace",
			params: {
				bundle: "dm",
				kind: "metadata_namespaces",
				rows: [
					{
						namespace: "dialogue.prompt",
						audience: "public",
						bundle_id: "dm",
						description:
							"Prompt presentation: authored question and response labels, or the audience_trace marker for occurrence-bound speech labels. Display only; typed prompt contracts govern admission.",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "dm-phase-conditions",
			params: {
				bundle: "dm",
				kind: "condition_definitions",
				rows: conditions.map((condition) => ({
					bundle_id: "dm",
					condition_definition_id: condition.id,
					display_name: condition.id,
					gate_predicate_source: "",
					grants_capability_while_active: condition.capabilities,
					stacking_rule: "srd/stacking/single",
					remove_time_policy: "srd/remove_policy/independent_lifetime",
					observable: false,
				})),
			},
		},
		...authoredActCalls("dm", [...acts, ...menus]),
		{
			toolName: "spellkave_write_rows",
			label: "creation-trace-menu-prompts",
			params: {
				bundle: "dm",
				kind: "prompt_definitions",
				rows: Array.from({ length: 16 }, (_, index) => ({
					prompt_def_id: `dm/prompt/creation-menu/${index + 1}`,
					bundle_id: "dm",
					source_selector: CREATION_STATION_TAG,
					open_predicate_source: `actor.stat('dm/dialog/open') == ${index + 1} && actor.stat('dm/dialog/prompt') == 16`,
					response_action_ids: Array.from({ length: index + 1 }, (_, slot) =>
						dialogChoiceActionId(slot + 1),
					),
					audience_kind_ref: "core/audience/directed_trace",
					trace_window_ticks: 20,
					contract_version: 1,
				})),
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "creation-trace-menu-presentation",
			params: {
				bundle: "dm",
				kind: "metadata_attachments",
				rows: Array.from({ length: 16 }, (_, index) => ({
					target_kind: "prompt_definition",
					target_ref: `dm/prompt/creation-menu/${index + 1}`,
					namespace: "dialogue.prompt",
					payload_json: JSON.stringify({ presentation: "audience_trace" }),
					bundle_id: "dm",
				})),
			},
		},
	];
}
