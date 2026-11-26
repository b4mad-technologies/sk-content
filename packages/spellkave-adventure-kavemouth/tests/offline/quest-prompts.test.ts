/**
 * ADR-0142 D-1: `author/quest-prompts.ts` row shape. Not wired into
 * `buildAdventure()` yet (see `author/adventure.ts`'s own comment on the
 * VALIDATION_AUGMENT_KINDS blocker) — these are pure-function proofs of the
 * rows themselves, independent of that wiring.
 */

import { describe, expect, it } from "vitest";
import {
	questPromptDefId,
	questPromptDefinitions,
	questPromptLabels,
} from "../../author/quest-prompts.ts";
import { QUESTS } from "../../author/quests.ts";

describe("quest prompt definitions (ADR-0142 D-1)", () => {
	it("every quest has a unique promptId in the dm/dialog/prompt bounded range (0..16)", () => {
		const ids = QUESTS.map((quest) => quest.promptId);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) {
			expect(id).toBeGreaterThan(0);
			expect(id).toBeLessThanOrEqual(16);
		}
	});

	it("one prompt_definitions row per quest, keyed by questPromptDefId, gated on open+prompt", () => {
		const calls = questPromptDefinitions();
		expect(calls).toHaveLength(QUESTS.length);
		for (const quest of QUESTS) {
			const call = calls.find((c) => c.label === `quest-${quest.id}-prompt`);
			expect(call).toBeDefined();
			const row = (call?.params as { rows: Record<string, unknown>[] }).rows[0] as Record<
				string,
				unknown
			>;
			expect(row.prompt_def_id).toBe(questPromptDefId(quest.id));
			expect(row.source_selector).toBe("srd.dm_npc.talker");
			expect(row.open_predicate_source).toBe(
				`actor.stat('dm/dialog/open') >= 1 && actor.stat('dm/dialog/prompt') == ${quest.promptId}`,
			);
			expect(row.response_action_ids).toEqual(["dm/dialog/choice/1", "dm/dialog/choice/2"]);
			expect(row.audience_kind_ref).toBe("core/audience/directed_trace");
		}
	});

	it("accept/decline text moves to dialogue.prompt metadata, keyed by prompt_def_id", () => {
		const [attachmentCall] = questPromptLabels();
		expect(questPromptLabels()).toHaveLength(1);
		const rows = (attachmentCall?.params as { rows: Record<string, unknown>[] }).rows;
		expect(rows).toHaveLength(QUESTS.length);
		for (const quest of QUESTS) {
			const row = rows.find((r) => r.target_ref === questPromptDefId(quest.id));
			expect(row).toBeDefined();
			expect(row?.target_kind).toBe("prompt_definition");
			expect(row?.namespace).toBe("dialogue.prompt");
			const payload = JSON.parse(row?.payload_json as string) as {
				responses: Record<string, string>;
			};
			expect(payload.responses["dm/dialog/choice/1"]).toBe(quest.slotAcceptText);
			expect(payload.responses["dm/dialog/choice/2"]).toBe(quest.slotDeclineText);
		}
	});
});
