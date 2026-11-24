/**
 * Generic NPC dialog slot protocol (sk-0m4.52 / sk-0m4.57 / sk-0m4.59).
 *
 * Numbered choice slots + one `say`. NPC-provided answers (Mira, and
 * creation after slice 3) gate on the talker's `dm/dialog/open`. Creation
 * drafts live in the NPC's memory, not world last-choice/step resources.
 */
import { BUNDLE as DM_BUNDLE } from "../../author/dm/lib/ids.ts";

export { DM_BUNDLE };

/** Palette ceiling. Extra slots stay gated closed. */
export const DIALOG_SLOT_COUNT = 16;

/** Fixed selector shared by the authored creation menus. */
export const RUNTIME_PROMPT_SELECTOR_ID = DIALOG_SLOT_COUNT;

export const DIALOG_SAY_LOCAL_ID = "dialog/say";

export const DIALOG_SAY_ACTION_ID = `${DM_BUNDLE}/${DIALOG_SAY_LOCAL_ID}`;
export const DIALOG_SAY_CAPABILITY_ID = `${DM_BUNDLE}/action/${DIALOG_SAY_LOCAL_ID}`;

/** How many answers a talker currently offers. Seeded 0; the NPC sets it. */
export const DIALOG_OPEN_LOCAL_ID = "dialog/open";
export const DIALOG_OPEN_RESOURCE_ID = `${DM_BUNDLE}/${DIALOG_OPEN_LOCAL_ID}`;

/** Entity-provided niche: a body tagged as a talker offers Answer k. */
export const DIALOG_NICHE_LOCAL_ID = "niche/dialog";
export const DIALOG_NICHE_ID = `${DM_BUNDLE}/${DIALOG_NICHE_LOCAL_ID}`;

/** Actor-carried niche for the self-only set-open verb. */
export const DIALOG_SET_OPEN_CAPABILITY_LOCAL_ID = "action/dialog/set-open";
export const DIALOG_SET_OPEN_CAPABILITY_ID = `${DM_BUNDLE}/${DIALOG_SET_OPEN_CAPABILITY_LOCAL_ID}`;

/**
 * Which authored offer is currently open on this talker (ADR-0142 D-1). Same
 * shape as `dm/dialog/open`: a bounded int the NPC sets on itself. The
 * prompt id is local to the talker's own body, never globally unique — two
 * different givers may reuse the same small id for two different
 * `prompt_definition`s without collision, because each reads its own
 * `target.stat('dm/dialog/prompt')`.
 */
export const DIALOG_PROMPT_LOCAL_ID = "dialog/prompt";
export const DIALOG_PROMPT_RESOURCE_ID = `${DM_BUNDLE}/${DIALOG_PROMPT_LOCAL_ID}`;

/** Actor-carried niche for the self-only set-prompt verb. */
export const DIALOG_SET_PROMPT_CAPABILITY_LOCAL_ID = "action/dialog/set-prompt";
export const DIALOG_SET_PROMPT_CAPABILITY_ID = `${DM_BUNDLE}/${DIALOG_SET_PROMPT_CAPABILITY_LOCAL_ID}`;

/** Shared actor-side capability to fire a numbered answer (granted by vocal). */
export const DIALOG_CHOOSE_CAPABILITY_LOCAL_ID = "action/dialog/choose";
export const DIALOG_CHOOSE_CAPABILITY_ID = `${DM_BUNDLE}/${DIALOG_CHOOSE_CAPABILITY_LOCAL_ID}`;

export function dialogOpenSetLocalId(count: number): string {
	return `dialog/open/set/${count}`;
}

export function dialogOpenSetActionId(count: number): string {
	return `${DM_BUNDLE}/${dialogOpenSetLocalId(count)}`;
}

/** 0..N from a set-open action id, or null. */
export function parseDialogOpenSetCount(actionId: string): number | null {
	const prefix = `${DM_BUNDLE}/dialog/open/set/`;
	if (!actionId.startsWith(prefix)) return null;
	const count = Number(actionId.slice(prefix.length));
	if (!Number.isInteger(count) || count < 0 || count > DIALOG_SLOT_COUNT) return null;
	return count;
}

/** No slot fired yet / no answers open. */
export const NO_DIALOG_CHOICE = 0;

/** No offer currently bound. */
export const NO_DIALOG_PROMPT = 0;

export function dialogPromptSetLocalId(id: number): string {
	return `dialog/prompt/set/${id}`;
}

export function dialogPromptSetActionId(id: number): string {
	return `${DM_BUNDLE}/${dialogPromptSetLocalId(id)}`;
}

/** 0..DIALOG_SLOT_COUNT from a set-prompt action id, or null. */
export function parseDialogPromptSetId(actionId: string): number | null {
	const prefix = `${DM_BUNDLE}/dialog/prompt/set/`;
	if (!actionId.startsWith(prefix)) return null;
	const id = Number(actionId.slice(prefix.length));
	if (!Number.isInteger(id) || id < 0 || id > DIALOG_SLOT_COUNT) return null;
	return id;
}

export const WIZARD_STEP_CLASS = 1;
export const WIZARD_STEP_SPECIES = 2;
export const WIZARD_STEP_BACKGROUND = 3;

export function dialogChoiceLocalId(slot: number): string {
	return `dialog/choice/${slot}`;
}

export function dialogChoiceActionId(slot: number): string {
	return `${DM_BUNDLE}/${dialogChoiceLocalId(slot)}`;
}

export function dialogChoiceCapabilityId(slot: number): string {
	return `${DM_BUNDLE}/action/${dialogChoiceLocalId(slot)}`;
}

/** 1-based slot index from an acted action id, or null. */
export function parseDialogChoiceSlot(actionId: string): number | null {
	const prefix = `${DM_BUNDLE}/dialog/choice/`;
	if (!actionId.startsWith(prefix)) return null;
	const slot = Number(actionId.slice(prefix.length));
	if (!Number.isInteger(slot) || slot < 1 || slot > DIALOG_SLOT_COUNT) return null;
	return slot;
}

export function isDialogChoiceActionId(actionId: string): boolean {
	return parseDialogChoiceSlot(actionId) !== null;
}
