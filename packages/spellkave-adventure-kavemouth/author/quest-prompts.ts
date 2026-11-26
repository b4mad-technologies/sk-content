// pattern: quest-composition
// pattern: dialog-choice-slots
// pattern: prompt-occurrence
/**
 * ADR-0142 D-1: one `prompt_definition` per quest offer, reusing the shared
 * `dm/dialog/choice/1`/`2` accept/decline slots every giver already fires
 * (the reused-slot/ABA problem that ADR exists to fix). Disambiguated by the
 * giver's own `dm/dialog/prompt` id (`quest.promptId`), a bounded self-only
 * resource the `dm` bundle seeds generically (`packages/spellkave-adventure-
 * runtime/src/dm/dialog/npc-provided.ts`) — this file never mints its own
 * set action.
 *
 * Presentation stays out of the contract: the spoken menu line
 * (`@spellkave/adventure-runtime` `dm/talk/quest-giver-engine.ts`'s `speak/greet-and-offer`) still says
 * `slotAcceptText`/`slotDeclineText` aloud, but a client that wants the
 * accept/decline label WITHOUT parsing prose reads it from the
 * shared DM `dialogue.prompt` metadata namespace, keyed by the
 * prompt's own `prompt_def_id` (ADR-0073 D-1: a label is presentation, not a
 * fact the kernel admits or rejects on).
 */
import {
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_PROMPT_RESOURCE_ID,
	dialogChoiceActionId,
} from "@spellkave/adventure-runtime/dm/dialog";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { DM_NPC_TALKER_TAG } from "@spellkave/adventure-runtime/srd-ids";
import { BUNDLE } from "./lib/ids.ts";
// `linesForQuest` is the ONE place the actually-spoken greeting line lives
// (per-quest overrides from the authored TOML, the default in `./quest-lines.ts`),
// and a `dialogue.prompt` label must not reinvent that prose. Pure data read,
// no world-writing call, no cycle back to this file.
import { linesForQuest } from "./quest-lines.ts";
import { QUESTS } from "./quests.ts";

const DIRECTED_TRACE_AUDIENCE = "core/audience/directed_trace";

/**
 * Same reasoning as the creation prompts' own trace-window constant
 * (`@spellkave/adventure-runtime` `src/dm/creation/seed.ts`): a giver speaks
 * the offer first (the directed trace), then sets `dm/dialog/open` and
 * `dm/dialog/prompt` a cycle or two later — the window only has to outlast
 * that short setup gap, not how long the hero takes to actually answer (the
 * occurrence, once open, stays open regardless).
 */
const QUEST_PROMPT_TRACE_WINDOW_TICKS = 20;

export function questPromptDefId(questId: string): string {
	return `${BUNDLE}/prompt/quest/${questId.toLowerCase()}`;
}

const ACCEPT_DECLINE_RESPONSE_IDS = [dialogChoiceActionId(1), dialogChoiceActionId(2)] as const;

const DIALOGUE_PROMPT_NAMESPACE = "dialogue.prompt";

/** One `prompt_definition` per quest offer. `source_selector` is the shared
 * talker tag (every quest giver wears it), the SAME "definition matches the
 * class, `dm/dialog/prompt` narrows to the one body actually asking" shape
 * `dm/niche/dialog` already uses for the generic Answer k slots. */
export function questPromptDefinitions(): VerbCall[] {
	return QUESTS.map((quest) => ({
		toolName: "spellkave_write_rows",
		label: `quest-${quest.id}-prompt`,
		params: {
			bundle: BUNDLE,
			kind: "prompt_definitions",
			rows: [
				{
					prompt_def_id: questPromptDefId(quest.id),
					bundle_id: BUNDLE,
					source_selector: DM_NPC_TALKER_TAG,
					open_predicate_source:
						`actor.stat('${DIALOG_OPEN_RESOURCE_ID}') >= 1 && ` +
						`actor.stat('${DIALOG_PROMPT_RESOURCE_ID}') == ${quest.promptId}`,
					response_action_ids: [...ACCEPT_DECLINE_RESPONSE_IDS],
					audience_kind_ref: DIRECTED_TRACE_AUDIENCE,
					trace_window_ticks: QUEST_PROMPT_TRACE_WINDOW_TICKS,
					contract_version: 1,
				},
			],
		},
	}));
}

/** `dialogue.prompt` presentation labels: one row per quest, payload carries
 * the giver's own greeting (`linesForQuest(quest).greeting` — the SAME line
 * `dm/talk/quest-giver-engine.ts`'s `speak/greet-and-offer` dispatches, never reinvented
 * here) as `question`, plus a `responses` map from each response action id
 * to the spoken accept/decline text (ADR-0073 D-1 — this changes what a
 * client RENDERS, never what the server admits). Same `ui.affordance_group`
 * audience shape (public presentation metadata). */
export function questPromptLabels(): VerbCall[] {
	const attachmentCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "dialogue-prompt-labels",
		params: {
			bundle: BUNDLE,
			kind: "metadata_attachments",
			rows: QUESTS.map((quest) => ({
				target_kind: "prompt_definition",
				target_ref: questPromptDefId(quest.id),
				namespace: DIALOGUE_PROMPT_NAMESPACE,
				payload_json: JSON.stringify({
					question: linesForQuest(quest).greeting,
					responses: {
						[dialogChoiceActionId(1)]: quest.slotAcceptText,
						[dialogChoiceActionId(2)]: quest.slotDeclineText,
					},
				}),
				bundle_id: BUNDLE,
				source: "manifest",
			})),
		},
	};
	return [attachmentCall];
}
