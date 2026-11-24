/**
 * // pattern: draft-then-confirm-wizard
 *
 * Seed-time creation-owned handles (sk-0m4 slice 3). Confirm / Discard /
 * Say / array-adopt and the phase latch live in the `dm` bundle so Aldwin
 * does not rebind them. Parsed adoption uses fixed handles; dynamic menus
 * use the publisher-prepared numbered question vocabulary.
 */
import { DEFINE_CAPABILITY_TOOL, WRITE_ROWS_TOOL } from "@spellkave/tool-authoring";
import { SPEECH_TRACE_KIND_ID } from "../../srd-ids.ts";
import { classCreationData } from "../data";
import { DIALOG_CHOOSE_CAPABILITY_ID, DIALOG_NICHE_ID } from "../dialog/ids";
import {
	buildDialogueAction,
	buildMarkerResource,
	buildSelfOnlyManipulateAction,
	type FrameWrite,
	inscribeDialogSlotWrite,
	inscribeSpeechTraceWrite,
	modifyResourceWrite,
	setToExactValueDeltaSource,
} from "../lib";
import type { VerbCall } from "../lib/scene-driver.ts";
import {
	ADOPT_APPEARANCE_ACTION_ID,
	ADOPT_APPEARANCE_ACTION_LOCAL_ID,
	ADOPT_BACKSTORY_ACTION_ID,
	ADOPT_BACKSTORY_ACTION_LOCAL_ID,
	ADOPT_NAME_ACTION_ID,
	ADOPT_NAME_ACTION_LOCAL_ID,
	ADOPT_PROPOSED_SCORES_ACTION_ID,
	ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID,
	ARRAY_ADOPT_ACTION_ID,
	ARRAY_ADOPT_ACTION_LOCAL_ID,
	BACK_ACTION_ID,
	BACK_ACTION_LOCAL_ID,
	backgroundPickActionId,
	backgroundPickActionLocalId,
	CONFIRM_ACTION_ID,
	CONFIRM_ACTION_LOCAL_ID,
	CREATION_INPUT_FIELD_KEYS,
	CREATION_PHASE_BACKGROUND,
	CREATION_PHASE_CLASS,
	CREATION_PHASE_CONFIRMED,
	CREATION_PHASE_CONTRACTS,
	CREATION_PHASE_IDLE,
	CREATION_PHASE_LOCAL_ID,
	CREATION_PHASE_MAX,
	CREATION_PHASE_READY,
	CREATION_PHASE_RESOURCE_ID,
	CREATION_PHASE_SPECIES,
	CREATION_SET_PHASE_CAPABILITY_ID,
	CREATION_SET_PHASE_CAPABILITY_LOCAL_ID,
	CREATION_STATION_NICHE_ID,
	CREATION_STATION_TAG,
	classPickActionId,
	classPickActionLocalId,
	creationPhaseSetLocalId,
	DESCRIBE_APPEARANCE_ACTION_LOCAL_ID,
	DESCRIBE_BACKSTORY_ACTION_LOCAL_ID,
	DISCARD_ACTION_ID,
	DISCARD_ACTION_LOCAL_ID,
	DM_BUNDLE,
	ENTER_NAME_ACTION_LOCAL_ID,
	FORWARD_ACTION_ID,
	FORWARD_ACTION_LOCAL_ID,
	PROMPT_CREATION_BACKGROUND_ID,
	PROMPT_CREATION_CLASS_ID,
	PROMPT_CREATION_CONFIRM_ID,
	PROMPT_CREATION_SPECIES_ID,
	SET_ABILITY_SCORES_ACTION_LOCAL_ID,
	speciesPickActionId,
	speciesPickActionLocalId,
} from "./ids";
import { DEFAULT_CREATION_SPEECH_LINES } from "./lines";
import { backgroundCreationData, speciesCreationData } from "./origins";

/** Public authored input schema consumed by the PLAYER affordance projection.
 * This is deliberately attached to template identities, not a Play/creation
 * component: any world bundle can author the same `ui.affordance_input`
 * contract for its own actions. */
export const AFFORDANCE_INPUT_NAMESPACE = "ui.affordance_input";
const AFFORDANCE_REFERENCE_NAMESPACE = "ui.affordance_reference";

type CreationIdentityChoice = {
	actionLocalId: string;
	actionId: string;
	displayName: string;
	definitionRef: string;
	phase: number;
};

/** Stable identity choices own their canonical definition reference. The
 * presentation metadata never participates in gating or action dispatch. */
function identityChoices(): CreationIdentityChoice[] {
	return [
		...classCreationData().map((choice) => ({
			actionLocalId: classPickActionLocalId(choice.slug),
			actionId: classPickActionId(choice.slug),
			displayName: choice.displayName,
			definitionRef: `srd/class/${choice.slug}`,
			phase: CREATION_PHASE_CLASS,
		})),
		// The declared creation flow is class → background → species. The phase
		// constants retain their older names for compatibility with saved worlds.
		...backgroundCreationData().map((choice) => ({
			actionLocalId: backgroundPickActionLocalId(choice.slug),
			actionId: backgroundPickActionId(choice.slug),
			displayName: choice.displayName,
			definitionRef: `srd/background/${choice.slug}`,
			phase: CREATION_PHASE_SPECIES,
		})),
		...speciesCreationData().map((choice) => ({
			actionLocalId: speciesPickActionLocalId(choice.slug),
			actionId: speciesPickActionId(choice.slug),
			displayName: choice.displayName,
			definitionRef: `srd/species/${choice.slug}`,
			phase: CREATION_PHASE_BACKGROUND,
		})),
	];
}

function renderIdentityChoiceHandles(): VerbCall[] {
	const choices = identityChoices();
	return [
		...choices.flatMap(
			(choice) =>
				buildDialogueAction({
					bundle: DM_BUNDLE,
					actionLocalId: choice.actionLocalId,
					nicheId: DIALOG_NICHE_ID,
					displayName: choice.displayName,
					description: `Choose ${choice.displayName} for this character draft.`,
					// Historical decode only. Runtime occurrence offers now bind all
					// bounded creation answers through dm/dialog/choice/N, so this
					// seed-time handle must never compete for admission.
					gatePredicateSource: "1 == 0",
					frameWrites: actedMenuFrameWrites(choice.actionId),
					requiredCapability: DIALOG_CHOOSE_CAPABILITY_ID,
				}).calls,
		),
		{
			toolName: WRITE_ROWS_TOOL,
			label: "creation-affordance-reference-namespace",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_namespaces",
				rows: [
					{
						namespace: AFFORDANCE_REFERENCE_NAMESPACE,
						audience: "public",
						bundle_id: DM_BUNDLE,
						description: "Canonical definition reference for a player-selectable affordance.",
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "creation-affordance-references",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_attachments",
				rows: choices.map((choice) => ({
					target_kind: "affordance_template",
					target_ref: `${DM_BUNDLE}/${choice.actionLocalId}/affordance`,
					namespace: AFFORDANCE_REFERENCE_NAMESPACE,
					payload_json: JSON.stringify({ definition_ref: choice.definitionRef }),
					bundle_id: DM_BUNDLE,
					source: "manifest",
				})),
			},
		},
	];
}

/**
 * ADR-0142 D-1/D-4: `core/audience/directed_trace` resolves without an
 * authored row (server-seeded, verified against
 * `crates/spellkave-validate/src/lib.rs`'s `prompt_definition_audience_and_
 * response_action_refs_are_checked` test) — Aldwin's creation lines already
 * carry addressees (speak-to, `carry_addressee = true`), so every creation
 * prompt binds its audience the same way every other prompt does.
 */
const DIRECTED_TRACE_AUDIENCE = "core/audience/directed_trace";

/**
 * How far back (ticks) the binding directed-speech trace may lie, for a
 * `DirectedTrace` audience. `packages/spellkave-adventure-elven-mini/fixtures/
 * story/agent-run-events.jsonl` records Aldwin's spoken question landing 1-2
 * steps after the phase flips true and the candidate's accepted answer
 * landing 2-4 steps after that (e.g. line 7 phase→1, line 9 the spoken
 * question, line 11 the accepted answer). This value is a generous multiple
 * of that scripted cadence, not a byte-exact tick count (the fixture's steps
 * are not 1:1 with server ticks) — sized for slower interactive play.
 */
const CREATION_PROMPT_TRACE_WINDOW_TICKS = 20;

/** Shared with the Confirm `buildDialogueAction` call below, so the
 * `dialogue.prompt` label and the actual spoken/rendered display name can
 * never drift apart. */
const CONFIRM_DISPLAY_NAME = "Confirm character creation";

function creationPromptDefinitionRow(
	promptDefId: string,
	responseActionIds: readonly string[],
	phase: number,
): Record<string, unknown> {
	return {
		prompt_def_id: promptDefId,
		bundle_id: DM_BUNDLE,
		source_selector: CREATION_STATION_TAG,
		// Retired static occurrence contract. Kept as an inert row so saved
		// traces can be read by old tooling; a runtime offer owns all live
		// creation prompt openings.
		open_predicate_source: "1 == 0",
		response_action_ids: [...responseActionIds],
		audience_kind_ref: DIRECTED_TRACE_AUDIENCE,
		trace_window_ticks: CREATION_PROMPT_TRACE_WINDOW_TICKS,
		contract_version: 1,
	};
}

// pattern: prompt-occurrence
/** One `prompt_definition` per single-question creation phase (see the
 * module doc on the `PROMPT_CREATION_*` ids for the phase-4 exclusion). */
function renderCreationPromptDefinitions(): VerbCall[] {
	const choices = identityChoices();
	const responsesForPhase = (phase: number): string[] =>
		choices.filter((choice) => choice.phase === phase).map((choice) => choice.actionId);
	return [
		{
			toolName: WRITE_ROWS_TOOL,
			label: "prompt:creation-class",
			params: {
				bundle: DM_BUNDLE,
				kind: "prompt_definitions",
				rows: [
					creationPromptDefinitionRow(
						PROMPT_CREATION_CLASS_ID,
						responsesForPhase(CREATION_PHASE_CLASS),
						CREATION_PHASE_CLASS,
					),
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "prompt:creation-background",
			params: {
				bundle: DM_BUNDLE,
				kind: "prompt_definitions",
				rows: [
					// CREATION_PHASE_SPECIES is the phase NUMBER 2; the responses at
					// that phase are the background picks (`seed.ts`'s
					// `identityChoices()` module doc: "the phase constants retain
					// their older names for compatibility with saved worlds").
					creationPromptDefinitionRow(
						PROMPT_CREATION_BACKGROUND_ID,
						responsesForPhase(CREATION_PHASE_SPECIES),
						CREATION_PHASE_SPECIES,
					),
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "prompt:creation-species",
			params: {
				bundle: DM_BUNDLE,
				kind: "prompt_definitions",
				rows: [
					// Same naming quirk in reverse: CREATION_PHASE_BACKGROUND (3) is
					// where the SPECIES picks are offered.
					creationPromptDefinitionRow(
						PROMPT_CREATION_SPECIES_ID,
						responsesForPhase(CREATION_PHASE_BACKGROUND),
						CREATION_PHASE_BACKGROUND,
					),
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "prompt:creation-confirm",
			params: {
				bundle: DM_BUNDLE,
				kind: "prompt_definitions",
				rows: [
					// Discard is deliberately NOT a response here: its predicate spans
					// every active phase (1..5), so it is a standing escape hatch, not
					// an answer to "confirm?" — it stays a plain, non-prompt-bound
					// action needing no semantic_context.
					creationPromptDefinitionRow(
						PROMPT_CREATION_CONFIRM_ID,
						[CONFIRM_ACTION_ID],
						CREATION_PHASE_READY,
					),
				],
			},
		},
	];
}

const DIALOGUE_PROMPT_NAMESPACE = "dialogue.prompt";

/**
 * ADR-0142 D-1/D-4 (Play seam): `dialogue.prompt` presentation labels — the
 * question Aldwin actually speaks for each phase, plus each response
 * action's own display name, so a client can render the question WITHOUT
 * parsing spoken prose. Never consulted by the kernel (ADR-0073 D-1): the
 * prompt's selector and response set stay the world data; this is display
 * only. Same audience shape as `ui.affordance_group`
 * (`packages/spellkave-srd-cc/src/ui/affordance-groups.ts`) — `public`.
 *
 * The question text is NOT reinvented here — it is the SAME
 * `DEFAULT_CREATION_SPEECH_LINES` call `OfferClassMenu`/`OfferSpeciesMenu`/
 * `OfferBackgroundMenu` (`./engine.ts`) actually dispatches as the spoken
 * utterance, so the label can never drift from what Aldwin says. Confirm has
 * no numbered-menu offer line (it is a single action, not "which one of
 * N?") — its label reuses `progressGuidance([])`'s ready branch
 * ("Your draft is ready. Choose Confirm character creation..."), the
 * existing authored line for "confirm is the thing to do now" (`./lines.ts`).
 */
function renderCreationPromptLabels(): VerbCall[] {
	const choices = identityChoices();
	const labelsForPhase = (phase: number): Record<string, string> =>
		Object.fromEntries(
			choices
				.filter((choice) => choice.phase === phase)
				.map((choice) => [choice.actionId, choice.displayName]),
		);
	const attachment = (
		promptDefId: string,
		question: string,
		responses: Record<string, string>,
	) => ({
		target_kind: "prompt_definition",
		target_ref: promptDefId,
		namespace: DIALOGUE_PROMPT_NAMESPACE,
		payload_json: JSON.stringify({ question, responses }),
		bundle_id: DM_BUNDLE,
		source: "manifest",
	});
	return [
		{
			toolName: WRITE_ROWS_TOOL,
			label: "dialogue-prompt-namespace",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_namespaces",
				rows: [
					{
						namespace: DIALOGUE_PROMPT_NAMESPACE,
						audience: "public",
						bundle_id: DM_BUNDLE,
						description:
							"Presentation labels for a prompt_definition: the question the speaker " +
							"actually asks and each response action's display name. Never consulted by " +
							"the kernel — the prompt's selector and response set are the world data " +
							"(ADR-0073 D-1); this is display only.",
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "dialogue-prompt-labels-creation",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_attachments",
				rows: [
					attachment(
						PROMPT_CREATION_CLASS_ID,
						DEFAULT_CREATION_SPEECH_LINES.slotMenuOffer(
							"class",
							choices
								.filter((choice) => choice.phase === CREATION_PHASE_CLASS)
								.map((choice) => choice.displayName),
						),
						labelsForPhase(CREATION_PHASE_CLASS),
					),
					attachment(
						PROMPT_CREATION_BACKGROUND_ID,
						DEFAULT_CREATION_SPEECH_LINES.slotMenuOffer(
							"background",
							choices
								.filter((choice) => choice.phase === CREATION_PHASE_SPECIES)
								.map((choice) => choice.displayName),
						),
						labelsForPhase(CREATION_PHASE_SPECIES),
					),
					attachment(
						PROMPT_CREATION_SPECIES_ID,
						DEFAULT_CREATION_SPEECH_LINES.slotMenuOffer(
							"species",
							choices
								.filter((choice) => choice.phase === CREATION_PHASE_BACKGROUND)
								.map((choice) => choice.displayName),
						),
						labelsForPhase(CREATION_PHASE_BACKGROUND),
					),
					attachment(
						PROMPT_CREATION_CONFIRM_ID,
						DEFAULT_CREATION_SPEECH_LINES.progressGuidance([]),
						{ [CONFIRM_ACTION_ID]: CONFIRM_DISPLAY_NAME },
					),
				],
			},
		},
	];
}

function inputMetadataCalls(): VerbCall[] {
	const noInputActionLocalIds = [
		DISCARD_ACTION_LOCAL_ID,
		BACK_ACTION_LOCAL_ID,
		FORWARD_ACTION_LOCAL_ID,
		ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID,
		ADOPT_NAME_ACTION_LOCAL_ID,
		ADOPT_APPEARANCE_ACTION_LOCAL_ID,
		ADOPT_BACKSTORY_ACTION_LOCAL_ID,
	] as const;
	const textInputs = [
		{
			localId: ENTER_NAME_ACTION_LOCAL_ID,
			fields: [
				{
					name: CREATION_INPUT_FIELD_KEYS.name,
					label: "Name",
					control: "text",
					placeholder: "Your character's name",
					required: true,
					channel: "utterance",
				},
			],
			submitLabel: "Propose name",
		},
		{
			localId: DESCRIBE_APPEARANCE_ACTION_LOCAL_ID,
			fields: [
				{
					name: CREATION_INPUT_FIELD_KEYS.appearance,
					label: "Appearance",
					control: "textarea",
					placeholder: "What can others see?",
					channel: "utterance",
				},
			],
			submitLabel: "Propose appearance",
		},
		{
			localId: DESCRIBE_BACKSTORY_ACTION_LOCAL_ID,
			fields: [
				{
					name: CREATION_INPUT_FIELD_KEYS.backstory,
					label: "Backstory",
					control: "textarea",
					placeholder: "What does the guide know?",
					channel: "utterance",
				},
			],
			submitLabel: "Propose backstory",
		},
		{
			localId: SET_ABILITY_SCORES_ACTION_LOCAL_ID,
			fields: [
				{
					name: "str",
					label: "Strength",
					control: "number",
					min: 8,
					max: 15,
					channel: "utterance",
				},
				{
					name: "dex",
					label: "Dexterity",
					control: "number",
					min: 8,
					max: 15,
					channel: "utterance",
				},
				{
					name: "con",
					label: "Constitution",
					control: "number",
					min: 8,
					max: 15,
					channel: "utterance",
				},
				{
					name: "int",
					label: "Intelligence",
					control: "number",
					min: 8,
					max: 15,
					channel: "utterance",
				},
				{ name: "wis", label: "Wisdom", control: "number", min: 8, max: 15, channel: "utterance" },
				{
					name: "cha",
					label: "Charisma",
					control: "number",
					min: 8,
					max: 15,
					channel: "utterance",
				},
			],
			submitLabel: "Propose ability scores",
		},
	] as const;
	return [
		{
			toolName: WRITE_ROWS_TOOL,
			label: "metadata-namespace:affordance-input",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_namespaces",
				rows: [
					{
						namespace: AFFORDANCE_INPUT_NAMESPACE,
						audience: "public",
						bundle_id: DM_BUNDLE,
						description:
							"World-authored player input fields for an affordance template. The player " +
							"renders the declared fields but does not infer action semantics.",
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "metadata:creation-affordance-inputs",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_attachments",
				rows: [
					{
						target_kind: "affordance_template",
						target_ref: `${DM_BUNDLE}/dialog/say/affordance`,
						namespace: AFFORDANCE_INPUT_NAMESPACE,
						payload_json: JSON.stringify({
							fields: [
								{
									name: "text",
									label: "Say",
									control: "text",
									placeholder: "Say something to the guide",
									required: true,
									channel: "utterance",
								},
							],
							submit_label: "Send",
						}),
						bundle_id: DM_BUNDLE,
						source: "manifest",
					},
					...noInputActionLocalIds.map((localId) => ({
						target_kind: "affordance_template",
						target_ref: `${DM_BUNDLE}/${localId}/affordance`,
						namespace: AFFORDANCE_INPUT_NAMESPACE,
						payload_json: JSON.stringify({ fields: [] }),
						bundle_id: DM_BUNDLE,
						source: "manifest",
					})),
					...textInputs.map(({ localId, fields, submitLabel }) => ({
						target_kind: "affordance_template",
						target_ref: `${DM_BUNDLE}/${localId}/affordance`,
						namespace: AFFORDANCE_INPUT_NAMESPACE,
						payload_json: JSON.stringify({ fields, submit_label: submitLabel }),
						bundle_id: DM_BUNDLE,
						source: "manifest",
					})),
				],
			},
		},
	];
}

/** Runtime-rendered menu actions have data-dependent template identities, so
 * their complete-invocation contract cannot live in the seed manifest. The
 * namespace itself is seeded above; this only attaches `{ fields: [] }` once
 * the matching template is being rendered. */
export function renderNoInputAffordanceMetadata(actionLocalIds: readonly string[]): VerbCall[] {
	if (actionLocalIds.length === 0) return [];
	return [
		{
			toolName: WRITE_ROWS_TOOL,
			label: "metadata:runtime-creation-no-input",
			params: {
				bundle: DM_BUNDLE,
				kind: "metadata_attachments",
				rows: actionLocalIds.map((localId) => ({
					target_kind: "affordance_template",
					target_ref: `${DM_BUNDLE}/${localId}/affordance`,
					namespace: AFFORDANCE_INPUT_NAMESPACE,
					payload_json: JSON.stringify({ fields: [] }),
					bundle_id: DM_BUNDLE,
					source: "manifest",
				})),
			},
		},
	];
}

function actedMenuFrameWrites(actionId: string): FrameWrite[] {
	return [
		inscribeDialogSlotWrite({
			speechTraceKindId: SPEECH_TRACE_KIND_ID,
			actionId,
		}),
	];
}

export function renderCreationOwnedHandles(): VerbCall[] {
	const calls: VerbCall[] = [
		buildMarkerResource({
			bundle: DM_BUNDLE,
			localId: CREATION_PHASE_LOCAL_ID,
			displayName: "Creation wizard phase",
			description:
				"Aldwin-owned gate for Confirm/Say/Discard/array-adopt. 0 idle, 1 class, 2 species, " +
				"3 background, 4 contracts, 5 ready, 6 confirmed.",
			minValue: CREATION_PHASE_IDLE,
			maxValue: CREATION_PHASE_MAX,
			initialValue: CREATION_PHASE_IDLE,
		}).call,
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:creation-set-phase",
			params: {
				bundle: DM_BUNDLE,
				id: CREATION_SET_PHASE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Set creation phase",
				description: "A creation-station NPC sets its own wizard phase.",
				tags: [],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "niche:creation-set-phase",
			params: {
				bundle: DM_BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: `capability:${CREATION_SET_PHASE_CAPABILITY_ID}`,
						bundle_id: DM_BUNDLE,
						display_name: "Set creation phase (actor-carried)",
						description: "Self-only phase write for the creation wizard.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "grant-creation-set-phase",
			params: {
				bundle: DM_BUNDLE,
				kind: "tag_capability_grant",
				rows: [
					{
						bundle_id: DM_BUNDLE,
						tag: CREATION_STATION_TAG,
						capability_id: CREATION_SET_PHASE_CAPABILITY_ID,
					},
				],
			},
		},
		{
			toolName: WRITE_ROWS_TOOL,
			label: "niche:creation-station",
			params: {
				bundle: DM_BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: CREATION_STATION_NICHE_ID,
						bundle_id: DM_BUNDLE,
						display_name: "Creation station",
						description:
							"Entity-provided creation wizard target. Any actor tagged srd.dm_npc.creation.",
						predicate_source: `target.has_niche('${CREATION_STATION_TAG}')`,
						provider: "entity",
					},
				],
			},
		},
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: "dialog/say",
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Say",
			description:
				"Speak freely to the guide. Use the named form actions to propose ability scores, a name, " +
				"an appearance, or a backstory. Nothing commits until you fire the adopt option I offer.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= ${CREATION_PHASE_CONTRACTS}` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: [inscribeSpeechTraceWrite({ speechTraceKindId: SPEECH_TRACE_KIND_ID })],
		}).calls,
		...[
			{
				localId: ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID,
				actionId: ADOPT_PROPOSED_SCORES_ACTION_ID,
				displayName: "Adopt the proposed scores",
				description: "Adopt the current proposed ability scores.",
			},
			{
				localId: ADOPT_NAME_ACTION_LOCAL_ID,
				actionId: ADOPT_NAME_ACTION_ID,
				displayName: "Adopt the proposed name",
				description: "Adopt the current proposed name.",
			},
			{
				localId: ADOPT_APPEARANCE_ACTION_LOCAL_ID,
				actionId: ADOPT_APPEARANCE_ACTION_ID,
				displayName: "Adopt the described appearance",
				description: "Adopt the current described appearance.",
			},
			{
				localId: ADOPT_BACKSTORY_ACTION_LOCAL_ID,
				actionId: ADOPT_BACKSTORY_ACTION_ID,
				displayName: "Adopt the described backstory",
				description: "Adopt the current described backstory.",
			},
		].flatMap(
			({ localId, actionId, displayName, description }) =>
				buildDialogueAction({
					bundle: DM_BUNDLE,
					actionLocalId: localId,
					nicheId: CREATION_STATION_NICHE_ID,
					displayName,
					description,
					gatePredicateSource: "1 == 1",
					frameWrites: actedMenuFrameWrites(actionId),
				}).calls,
		),
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: ENTER_NAME_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Name your character",
			description: "Propose a name for your character. Nothing changes until you adopt it.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= ${CREATION_PHASE_CONTRACTS}` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: [
				inscribeDialogSlotWrite({
					speechTraceKindId: SPEECH_TRACE_KIND_ID,
					actionId: `${DM_BUNDLE}/${ENTER_NAME_ACTION_LOCAL_ID}`,
				}),
			],
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: DESCRIBE_APPEARANCE_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Describe appearance",
			description: "Propose a public appearance. Nothing changes until you adopt it.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= ${CREATION_PHASE_CONTRACTS}` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: [
				inscribeDialogSlotWrite({
					speechTraceKindId: SPEECH_TRACE_KIND_ID,
					actionId: `${DM_BUNDLE}/${DESCRIBE_APPEARANCE_ACTION_LOCAL_ID}`,
				}),
			],
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: DESCRIBE_BACKSTORY_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Describe backstory",
			description: "Propose a private backstory. Nothing changes until you adopt it.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= ${CREATION_PHASE_CONTRACTS}` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: [
				inscribeDialogSlotWrite({
					speechTraceKindId: SPEECH_TRACE_KIND_ID,
					actionId: `${DM_BUNDLE}/${DESCRIBE_BACKSTORY_ACTION_LOCAL_ID}`,
				}),
			],
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: SET_ABILITY_SCORES_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Set ability scores",
			description: "Propose ability scores. Nothing changes until you adopt them.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= ${CREATION_PHASE_CONTRACTS}` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: [
				inscribeDialogSlotWrite({
					speechTraceKindId: SPEECH_TRACE_KIND_ID,
					actionId: `${DM_BUNDLE}/${SET_ABILITY_SCORES_ACTION_LOCAL_ID}`,
				}),
			],
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: CONFIRM_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: CONFIRM_DISPLAY_NAME,
			description: "Confirm the drafted character.",
			// Confirm is now a one-slot runtime offer. Keep the historic action
			// definition permanently closed for recorded trace decoding only.
			gatePredicateSource: "1 == 0",
			frameWrites: actedMenuFrameWrites(CONFIRM_ACTION_ID),
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: DISCARD_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Discard the drafted character",
			description: "Clear every drafted choice and start over.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= 1` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: actedMenuFrameWrites(DISCARD_ACTION_ID),
		}).calls,
		// Back and forward walk the answered questions. They share Discard's
		// gate: open while a draft is being made.
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: BACK_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Go back one question",
			description: "Show the question before this one again. Nothing is cleared.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= 1` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: actedMenuFrameWrites(BACK_ACTION_ID),
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: FORWARD_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Go forward one question",
			description: "Leave the reopened question as it was answered.",
			gatePredicateSource:
				`target.stat('${CREATION_PHASE_RESOURCE_ID}') >= 1` +
				` && target.stat('${CREATION_PHASE_RESOURCE_ID}') < ${CREATION_PHASE_CONFIRMED}`,
			frameWrites: actedMenuFrameWrites(FORWARD_ACTION_ID),
		}).calls,
		...buildDialogueAction({
			bundle: DM_BUNDLE,
			actionLocalId: ARRAY_ADOPT_ACTION_LOCAL_ID,
			nicheId: CREATION_STATION_NICHE_ID,
			displayName: "Adopt the recommended array",
			description: "Adopt the drafted class's recommended ability array.",
			// The bounded recommended-array adoption is occurrence-bound like
			// every other menu answer; free score text remains on Say.
			gatePredicateSource: "1 == 0",
			frameWrites: actedMenuFrameWrites(ARRAY_ADOPT_ACTION_ID),
		}).calls,
	];

	for (let phase = CREATION_PHASE_IDLE; phase <= CREATION_PHASE_MAX; phase += 1) {
		calls.push(
			buildSelfOnlyManipulateAction({
				bundle: DM_BUNDLE,
				actionLocalId: creationPhaseSetLocalId(phase),
				requiredCapability: CREATION_SET_PHASE_CAPABILITY_ID,
				nicheId: `capability:${CREATION_SET_PHASE_CAPABILITY_ID}`,
				displayName: `Set creation phase (${phase})`,
				description: `Set Aldwin's dm/creation/phase to ${phase}.`,
				frameWrites: [
					modifyResourceWrite({
						actor: "Actor",
						resourceId: CREATION_PHASE_RESOURCE_ID,
						deltaSource: setToExactValueDeltaSource(CREATION_PHASE_RESOURCE_ID, phase),
					}),
				],
			}),
		);
	}
	calls.push(...inputMetadataCalls());

	// The former per-identity, Confirm, and recommended-array definitions are
	// intentionally absent from fresh worlds. `draft-state.ts` still decodes
	// their historical trace ids, but no live affordance or static prompt can
	// compete with an occurrence-bound dm/dialog/choice/N offer.
	const retiredLabels = new Set([
		"capability:creation/confirm",
		"action:creation/confirm",
		"communication-speech-act:creation/confirm",
		"capability:creation/array/adopt",
		"action:creation/array/adopt",
		"communication-speech-act:creation/array/adopt",
	]);
	return calls.filter((call) => !retiredLabels.has(call.label));
}
