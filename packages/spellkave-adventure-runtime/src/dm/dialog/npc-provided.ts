/**
 * Seed-time NPC-provided dialog slots (sk-0m4.57).
 *
 * Talking NPCs never apply a manifest. Answer k is an entity-provided
 * communicate affordance on anyone tagged `srd.dm_npc.talker`, gated by
 * `target.stat('dm/dialog/open') >= k`. The NPC opens/closes answers with a
 * self-only set-open verb granted by the same tag.
 */
import { DEFINE_CAPABILITY_TOOL, WRITE_ROWS_TOOL } from "@spellkave/tool-authoring";
import { DM_NPC_TALKER_TAG, SPEECH_TRACE_KIND_ID, VOCAL_COMMUNICATION_TAG } from "../../srd-ids.ts";
import {
	buildDialogueAction,
	buildMarkerResource,
	buildSelfOnlyManipulateAction,
	modifyResourceWrite,
	setToExactValueDeltaSource,
} from "../lib";
import type { VerbCall } from "../lib/scene-driver.ts";
import {
	DIALOG_CHOOSE_CAPABILITY_ID,
	DIALOG_CHOOSE_CAPABILITY_LOCAL_ID,
	DIALOG_NICHE_ID,
	DIALOG_OPEN_LOCAL_ID,
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_PROMPT_LOCAL_ID,
	DIALOG_PROMPT_RESOURCE_ID,
	DIALOG_SET_OPEN_CAPABILITY_ID,
	DIALOG_SET_OPEN_CAPABILITY_LOCAL_ID,
	DIALOG_SET_PROMPT_CAPABILITY_ID,
	DIALOG_SET_PROMPT_CAPABILITY_LOCAL_ID,
	DIALOG_SLOT_COUNT,
	DM_BUNDLE,
	dialogChoiceLocalId,
	dialogOpenSetLocalId,
	dialogPromptSetLocalId,
	NO_DIALOG_CHOICE,
	NO_DIALOG_PROMPT,
} from "./ids";
import { dialogNpcProvidedChoiceWrites } from "./render";

export function dialogOpenGatePredicateSource(slot: number): string {
	return `target.stat('${DIALOG_OPEN_RESOURCE_ID}') >= ${slot}`;
}

export function renderNpcProvidedDialogDefinitions(): VerbCall[] {
	const calls: VerbCall[] = [
		buildMarkerResource({
			bundle: DM_BUNDLE,
			localId: DIALOG_OPEN_LOCAL_ID,
			displayName: "Open dialog answers",
			description:
				"How many numbered answers this talker currently offers (0 = none). The NPC sets this " +
				"on itself; players never write it.",
			minValue: NO_DIALOG_CHOICE,
			maxValue: DIALOG_SLOT_COUNT,
			initialValue: NO_DIALOG_CHOICE,
		}).call,
		// pattern: prompt-occurrence
		// ADR-0142 D-1: `dm/dialog/prompt` names which authored offer is open,
		// same shape as `dm/dialog/open` above — a bounded int the talker sets
		// on itself. `prompt_definition.open_predicate_source` reads it
		// alongside `dm/dialog/open` to disambiguate two offers that reuse the
		// same generic Answer k slots.
		buildMarkerResource({
			bundle: DM_BUNDLE,
			localId: DIALOG_PROMPT_LOCAL_ID,
			displayName: "Open dialog prompt id",
			description:
				"Which authored offer this talker currently has open (0 = none). Local to this body — " +
				"two different talkers may reuse the same id for two different prompt_definitions. The " +
				"NPC sets this on itself; players never write it.",
			minValue: NO_DIALOG_PROMPT,
			maxValue: DIALOG_SLOT_COUNT,
			initialValue: NO_DIALOG_PROMPT,
		}).call,
		{
			toolName: WRITE_ROWS_TOOL,
			label: "niche:dialog",
			params: {
				bundle: DM_BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: DIALOG_NICHE_ID,
						bundle_id: DM_BUNDLE,
						display_name: "Dialog talker (entity-provided)",
						description:
							"A body that offers numbered dialog answers. Entity-provided: the instance " +
							`${DM_NPC_TALKER_TAG} tag satisfies admission; no spatial_niche_attachment.`,
						predicate_source: `target.has_niche('${DM_NPC_TALKER_TAG}')`,
						provider: "entity",
					},
				],
			},
		},
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:dialog-choose",
			params: {
				bundle: DM_BUNDLE,
				id: DIALOG_CHOOSE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Choose a dialog answer",
				description: "Fire a numbered answer offered by a talker.",
				tags: [],
			},
		},
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:dialog-set-open",
			params: {
				bundle: DM_BUNDLE,
				id: DIALOG_SET_OPEN_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Set open dialog answers",
				description: "A talker sets how many numbered answers it currently offers.",
				tags: [],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "niche:dialog-set-open",
			params: {
				bundle: DM_BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: `capability:${DIALOG_SET_OPEN_CAPABILITY_ID}`,
						bundle_id: DM_BUNDLE,
						display_name: "Set dialog open (actor-carried)",
						description:
							"Self-only set-open: the talker's own set-open capability carries the verb.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:dialog-set-prompt",
			params: {
				bundle: DM_BUNDLE,
				id: DIALOG_SET_PROMPT_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Set open dialog prompt",
				description: "A talker sets which authored offer it currently has open.",
				tags: [],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "niche:dialog-set-prompt",
			params: {
				bundle: DM_BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: `capability:${DIALOG_SET_PROMPT_CAPABILITY_ID}`,
						bundle_id: DM_BUNDLE,
						display_name: "Set dialog prompt (actor-carried)",
						description:
							"Self-only set-prompt: the talker's own set-prompt capability carries the verb.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "grant-dialog-by-composition",
			params: {
				bundle: DM_BUNDLE,
				kind: "tag_capability_grant",
				rows: [
					{
						bundle_id: DM_BUNDLE,
						tag: VOCAL_COMMUNICATION_TAG,
						capability_id: DIALOG_CHOOSE_CAPABILITY_ID,
					},
					{
						bundle_id: DM_BUNDLE,
						tag: DM_NPC_TALKER_TAG,
						capability_id: DIALOG_SET_OPEN_CAPABILITY_ID,
					},
					{
						bundle_id: DM_BUNDLE,
						tag: DM_NPC_TALKER_TAG,
						capability_id: DIALOG_SET_PROMPT_CAPABILITY_ID,
					},
				],
			},
		},
	];

	for (let slot = 1; slot <= DIALOG_SLOT_COUNT; slot += 1) {
		calls.push(
			...buildDialogueAction({
				bundle: DM_BUNDLE,
				actionLocalId: dialogChoiceLocalId(slot),
				nicheId: DIALOG_NICHE_ID,
				displayName: `Answer ${slot}`,
				description: `Numbered dialog answer ${slot}. The NPC speaks the option text; this label stays generic.`,
				capabilityDescription: `Fire dialog answer ${slot} on a talker.`,
				tags: [`ui.response-slot=${slot}`],
				gatePredicateSource: dialogOpenGatePredicateSource(slot),
				frameWrites: dialogNpcProvidedChoiceWrites(slot, SPEECH_TRACE_KIND_ID),
				requiredCapability: DIALOG_CHOOSE_CAPABILITY_ID,
			}).calls,
		);
	}

	for (let count = 0; count <= DIALOG_SLOT_COUNT; count += 1) {
		calls.push(
			buildSelfOnlyManipulateAction({
				bundle: DM_BUNDLE,
				actionLocalId: dialogOpenSetLocalId(count),
				requiredCapability: DIALOG_SET_OPEN_CAPABILITY_ID,
				nicheId: `capability:${DIALOG_SET_OPEN_CAPABILITY_ID}`,
				displayName: `Set answers open (${count})`,
				description: `Set this talker's dm/dialog/open count to ${count}.`,
				frameWrites: [
					modifyResourceWrite({
						actor: "Actor",
						resourceId: DIALOG_OPEN_RESOURCE_ID,
						deltaSource: setToExactValueDeltaSource(DIALOG_OPEN_RESOURCE_ID, count),
					}),
				],
			}),
		);
	}

	// ADR-0142 D-1: generic, adventure-agnostic `dm/dialog/prompt/set/<id>`
	// family — one per bounded id, authored once here so content (elven-mini
	// quests, any future adventure) never authors a per-quest set action of
	// its own. A giver calls this alongside `dm/dialog/open/set/<count>` at
	// open time.
	for (let id = 0; id <= DIALOG_SLOT_COUNT; id += 1) {
		calls.push(
			buildSelfOnlyManipulateAction({
				bundle: DM_BUNDLE,
				actionLocalId: dialogPromptSetLocalId(id),
				requiredCapability: DIALOG_SET_PROMPT_CAPABILITY_ID,
				nicheId: `capability:${DIALOG_SET_PROMPT_CAPABILITY_ID}`,
				displayName: `Set open prompt (${id})`,
				description: `Set this talker's dm/dialog/prompt id to ${id}.`,
				frameWrites: [
					modifyResourceWrite({
						actor: "Actor",
						resourceId: DIALOG_PROMPT_RESOURCE_ID,
						deltaSource: setToExactValueDeltaSource(DIALOG_PROMPT_RESOURCE_ID, id),
					}),
				],
			}),
		);
	}

	return calls;
}
