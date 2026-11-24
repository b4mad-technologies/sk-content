/**
 * Generic NPC dialog slot renderer (sk-0m4.52 / sk-0m4.57 / sk-0m4.59).
 *
 * Definitions once: N choice actions + one say. A slot is a communicate
 * affordance whose comment is optional; drafts do not live in world
 * last-choice/step resources.
 */

import {
	buildCapabilityGrants,
	buildDialogueAction,
	type FrameWrite,
	inscribeDialogSlotWrite,
	inscribeSpeechTraceWrite,
} from "../lib";
import type { VerbCall } from "../lib/scene-driver.ts";
import {
	DIALOG_SAY_CAPABILITY_ID,
	DIALOG_SAY_LOCAL_ID,
	DIALOG_SLOT_COUNT,
	DM_BUNDLE,
	dialogChoiceActionId,
	dialogChoiceCapabilityId,
	dialogChoiceLocalId,
} from "./ids";

export interface DialogSlotBinding {
	readonly slot: number;
	readonly displayName: string;
	readonly description: string;
	readonly gatePredicateSource: string;
	readonly frameWrites: readonly FrameWrite[];
}

/**
 * Unified slot consequence: optional player comment as spoken `text`,
 * acted slot id in `action_id` (not spoken). Firing without text succeeds.
 */
export function dialogActedChoiceWrites(slot: number, speechTraceKindId: string): FrameWrite[] {
	return [
		inscribeDialogSlotWrite({
			speechTraceKindId,
			actionId: dialogChoiceActionId(slot),
		}),
	];
}

/** Alias kept for Mira seed-time callers; same shape as {@link dialogActedChoiceWrites}. */
export const dialogNpcProvidedChoiceWrites = dialogActedChoiceWrites;

function closedSlotGate(): string {
	return "1 == 0";
}

export function renderDialogChoiceSlot(nicheId: string, binding: DialogSlotBinding): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: dialogChoiceLocalId(binding.slot),
		nicheId,
		displayName: binding.displayName,
		description: binding.description,
		tags: [`ui.response-slot=${binding.slot}`],
		capabilityTags: ["srd.action", `ui.response-slot=${binding.slot}`],
		gatePredicateSource: binding.gatePredicateSource,
		frameWrites: [...binding.frameWrites],
	}).calls;
}

export function renderClosedDialogChoiceSlot(nicheId: string, slot: number): VerbCall[] {
	return renderDialogChoiceSlot(nicheId, {
		slot,
		displayName: `Choice ${slot}`,
		description: "No option is bound to this slot in the current dialog step.",
		gatePredicateSource: closedSlotGate(),
		frameWrites: [],
	});
}

export function renderDialogSay(args: {
	nicheId: string;
	description: string;
	gatePredicateSource: string;
	speechTraceKindId: string;
}): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: DIALOG_SAY_LOCAL_ID,
		nicheId: args.nicheId,
		displayName: "Say",
		description: args.description,
		gatePredicateSource: args.gatePredicateSource,
		frameWrites: [inscribeSpeechTraceWrite({ speechTraceKindId: args.speechTraceKindId })],
	}).calls;
}

export function renderDialogDefinitions(args: {
	nicheId: string;
	actorEntityKey: string;
	sayDescription: string;
	sayGatePredicateSource: string;
	speechTraceKindId: string;
}): VerbCall[] {
	const grants = [
		{
			actorEntityKey: args.actorEntityKey,
			capabilityId: DIALOG_SAY_CAPABILITY_ID,
			source: DM_BUNDLE,
		},
	];
	return [
		...renderDialogSay({
			nicheId: args.nicheId,
			description: args.sayDescription,
			gatePredicateSource: args.sayGatePredicateSource,
			speechTraceKindId: args.speechTraceKindId,
		}),
		buildCapabilityGrants({ bundle: DM_BUNDLE, grants }),
	];
}

export function renderDialogStepBindings(
	nicheId: string,
	open: readonly DialogSlotBinding[],
	closeThrough: number = DIALOG_SLOT_COUNT,
	actorEntityKey?: string,
): VerbCall[] {
	const used = new Set(open.map((binding) => binding.slot));
	const calls: VerbCall[] = [];
	for (const binding of open) {
		calls.push(...renderDialogChoiceSlot(nicheId, binding));
	}
	const last = Math.max(closeThrough, ...used, 0);
	for (let slot = 1; slot <= last; slot += 1) {
		if (!used.has(slot)) {
			calls.push(...renderClosedDialogChoiceSlot(nicheId, slot));
		}
	}
	if (actorEntityKey !== undefined && open.length > 0) {
		calls.push(
			buildCapabilityGrants({
				bundle: DM_BUNDLE,
				grants: open.map((binding) => ({
					actorEntityKey,
					capabilityId: dialogChoiceCapabilityId(binding.slot),
					source: DM_BUNDLE,
				})),
			}),
		);
	}
	return calls;
}
