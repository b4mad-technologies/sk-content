// pattern: quest-xp-grant
// pattern: computed-literal
// pattern: party-extent-grant
/**
 * Publisher composition compatibility for literal quest-XP actions.
 * Production uses author/dm-acts.ts and finite per-recipient award markers,
 * followed by giver settlement. It does not call this renderer per terminal.
 * Caller-selected recipients here are literal entity references; membership
 * and co-location are the caller's policy, not enforced by this helper.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	GRANT_QUEST_XP_ACTION_LOCAL_ID as GENERIC_ACTION_LOCAL_ID,
	QUEST_XP_STATE_ID as GENERIC_QUEST_XP_STATE_ID,
	grantQuestXpActionId as genericActionId,
	grantQuestXpCapability as genericCapability,
	grantQuestXpActionLocalId as genericLocalId,
	renderGrantQuestXp as genericRender,
	grantQuestXpActionFamilyId,
	grantQuestXpCapabilityId,
	type QuestXpConfig,
} from "@spellkave/adventure-runtime/dm/xp";
import { KAVEMOUTH_HOST_ACT } from "./host-act-config.ts";
import { questAcceptedState, questRewardedState } from "./quest-progress.ts";

export const GRANT_QUEST_XP_ACTION_LOCAL_ID = GENERIC_ACTION_LOCAL_ID;
export const GRANT_QUEST_XP_ACTION_ID = grantQuestXpActionFamilyId(KAVEMOUTH_HOST_ACT);
export const GRANT_QUEST_XP_CAPABILITY_ID = grantQuestXpCapabilityId(KAVEMOUTH_HOST_ACT);

export const QUEST_XP_STATE_ID = GENERIC_QUEST_XP_STATE_ID;

/** The kavemouth quest-XP config: host-act values + per-quest progress states. */
export const KAVEMOUTH_QUEST_XP: QuestXpConfig = {
	...KAVEMOUTH_HOST_ACT,
	questAcceptedState,
	questRewardedState,
};

export function grantQuestXpCapability(): VerbCall[] {
	return genericCapability(KAVEMOUTH_HOST_ACT);
}

export const grantQuestXpActionLocalId = genericLocalId;

export function grantQuestXpActionId(actionLocalId: string): string {
	return genericActionId(KAVEMOUTH_HOST_ACT, actionLocalId);
}

/**
 * Publisher-composed self-action: grant `amount` XP to each recipient.
 * `recipients` is a non-empty list of entity ids or `entity:<id>` refs
 * (hero + co-located companions). `actionLocalId` must be unique per grant.
 */
export function renderGrantQuestXp(args: {
	/** Party members present at the terminal (entity ids or entity: refs). */
	recipients: readonly string[];
	amount: number;
	questId: string;
	actionLocalId: string;
	/** Seeded reward latch on Aldwin; enabled when the caller wants a persistent latch. */
	persistent?: boolean;
	giverEntityId?: string;
}): VerbCall[] {
	return genericRender(KAVEMOUTH_QUEST_XP, args);
}
