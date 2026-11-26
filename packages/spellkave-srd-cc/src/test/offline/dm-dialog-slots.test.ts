import {
	INITIAL_DRAFT_STATE,
	pickFromWizardSlot,
	recognizePick,
	wizardListStep,
} from "@spellkave/adventure-runtime/dm/creation/draft-state";
import { CREATION_CLASS_ALLOWLIST } from "@spellkave/adventure-runtime/dm/creation/ids";
import {
	DIALOG_OPEN_RESOURCE_ID,
	DIALOG_SLOT_COUNT,
	dialogChoiceActionId,
	dialogNpcProvidedChoiceWrites,
	dialogOpenGatePredicateSource,
	parseDialogChoiceSlot,
	renderNpcProvidedDialogDefinitions,
} from "@spellkave/adventure-runtime/dm/dialog";
import { describe, expect, it } from "vitest";

describe("dialog choice slots (sk-0m4.52)", () => {
	it("parses 1..N and rejects out of range", () => {
		expect(parseDialogChoiceSlot(dialogChoiceActionId(1))).toBe(1);
		expect(parseDialogChoiceSlot(dialogChoiceActionId(DIALOG_SLOT_COUNT))).toBe(DIALOG_SLOT_COUNT);
		expect(parseDialogChoiceSlot("dm/dialog/choice/0")).toBeNull();
		expect(parseDialogChoiceSlot("dm/creation/class/fighter")).toBeNull();
	});

	it("maps the current wizard step + slot onto a catalog slug", () => {
		expect(CREATION_CLASS_ALLOWLIST).toHaveLength(12);
		expect(CREATION_CLASS_ALLOWLIST).toContain("fighter");
		const first = CREATION_CLASS_ALLOWLIST[0] as string;
		expect(pickFromWizardSlot(1, "class")).toEqual({ kind: "class", slug: first });
		expect(pickFromWizardSlot(99, "class")).toBeNull();
		expect(pickFromWizardSlot(1, null)).toBeNull();
	});

	it("recognizes a fired slot only against the open list, never from prose", () => {
		const first = CREATION_CLASS_ALLOWLIST[0] as string;
		expect(recognizePick(dialogChoiceActionId(1), "class")).toEqual({
			kind: "class",
			slug: first,
		});
		expect(recognizePick("I choose Ranger as my class.", "class")).toBeNull();
		expect(wizardListStep(INITIAL_DRAFT_STATE)).toBe("class");
		expect(
			wizardListStep({
				...INITIAL_DRAFT_STATE,
				classSlug: first,
			}),
		).toBe("background");
	});

	it("NPC-provided slot writes work without text and gate on target open count", () => {
		expect(dialogOpenGatePredicateSource(2)).toBe(`target.stat('${DIALOG_OPEN_RESOURCE_ID}') >= 2`);
		const writes = dialogNpcProvidedChoiceWrites(2, "srd/speech");
		const slot = writes[0];
		expect(writes).toHaveLength(1);
		expect(slot && "Inscribe" in slot && slot.Inscribe.carry_dispatch_text).toBe(true);
		expect(slot && "Inscribe" in slot && JSON.parse(slot.Inscribe.payload_json)).toEqual({
			text: "",
			action_id: dialogChoiceActionId(2),
		});
		expect(writes.some((write) => "ModifyResource" in write)).toBe(false);
	});

	it("does not put the slot id in spoken text (sk-0m4.64)", () => {
		const writes = dialogNpcProvidedChoiceWrites(2, "srd/speech");
		const spoken = writes.flatMap((write) => {
			if (!("Inscribe" in write)) return [];
			const payload = JSON.parse(write.Inscribe.payload_json) as { text?: unknown };
			return typeof payload.text === "string" ? [payload.text] : [];
		});
		expect(spoken).not.toContain(dialogChoiceActionId(2));
		expect(spoken.every((text) => !text.startsWith("dm/"))).toBe(true);
	});

	it("set-open is a self-only manipulate, not a communicate", () => {
		const setOpen = renderNpcProvidedDialogDefinitions().find(
			(call) =>
				call &&
				typeof call === "object" &&
				"params" in call &&
				(call as { params?: { id?: string } }).params?.id === "dialog/open/set/3",
		) as { params?: { self_only?: boolean; communication_speech_act_id?: string } } | undefined;
		expect(setOpen?.params?.self_only).toBe(true);
		expect(setOpen?.params?.communication_speech_act_id).toBeUndefined();
		const dialogNiche = renderNpcProvidedDialogDefinitions().find(
			(call) =>
				call &&
				typeof call === "object" &&
				"label" in call &&
				(call as { label?: string }).label === "niche:dialog",
		) as { params?: { rows?: Array<{ predicate_source?: string }> } } | undefined;
		expect(dialogNiche?.params?.rows?.[0]?.predicate_source).toBe(
			"target.has_niche('srd.dm_npc.talker')",
		);
	});
});
