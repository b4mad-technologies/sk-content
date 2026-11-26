// pattern: kill-xp-grant
// pattern: computed-literal
/**
 * Publisher composition compatibility for literal kill-XP actions.
 * Production Aldwin uses the finite srd/dm/spend-xp-value and srd/dm/award-xp
 * acts in the initiative watch; it does not call this renderer per kill.
 * These exports retain the kavemouth binding of the generic literal builder
 * for explicitly authored scenes and compatibility tests.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	GRANT_KILL_XP_ACTION_LOCAL_ID as GENERIC_ACTION_LOCAL_ID,
	grantKillXpActionId as genericActionId,
	grantKillXpCapability as genericCapability,
	grantKillXpActionLocalId as genericLocalId,
	renderGrantKillXp as genericRender,
	grantKillXpActionFamilyId,
	grantKillXpCapabilityId,
	KILL_XP_STATE_ID,
	KILL_XP_VALUE_STATE_ID,
} from "@spellkave/adventure-runtime/dm/xp";
import { KAVEMOUTH_HOST_ACT } from "./host-act-config.ts";

export const GRANT_KILL_XP_ACTION_LOCAL_ID = GENERIC_ACTION_LOCAL_ID;
export const GRANT_KILL_XP_ACTION_ID = grantKillXpActionFamilyId(KAVEMOUTH_HOST_ACT);
export const GRANT_KILL_XP_CAPABILITY_ID = grantKillXpCapabilityId(KAVEMOUTH_HOST_ACT);

export const XP_STATE_ID = KILL_XP_STATE_ID;
export const XP_VALUE_STATE_ID = KILL_XP_VALUE_STATE_ID;

/** Seed-time capability definition + grant. The compatibility ACTION is composed
 * for a caller-selected event (`renderGrantKillXp`). */
export function grantKillXpCapability(): VerbCall[] {
	return genericCapability(KAVEMOUTH_HOST_ACT);
}

export const grantKillXpActionLocalId = genericLocalId;

export function grantKillXpActionId(actionLocalId: string): string {
	return genericActionId(KAVEMOUTH_HOST_ACT, actionLocalId);
}

/** Publisher-composed self-action: see `dm/xp` `renderGrantKillXp`. */
export function renderGrantKillXp(args: {
	killerEntityId: string;
	victimEntityId: string;
	amount: number;
	actionLocalId: string;
}): VerbCall[] {
	return genericRender(KAVEMOUTH_HOST_ACT, args);
}
