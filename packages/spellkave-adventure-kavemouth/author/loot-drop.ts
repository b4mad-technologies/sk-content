// pattern: loot-table-drop
// pattern: computed-literal
/**
 * Boss / quest loot grants (sk-609b.13) — Aldwin places a catalog item at the
 * victim's (or hero's) node after a table draw, and stamps a party-visible
 * place_node trace. Same host-act class as kill-time XP: no kernel drop-on-
 * death arm; the NPC host owns the timing.
 *
 * The mechanism lives in `@spellkave/adventure-runtime/dm/loot`; this file is
 * the kavemouth loot DATA (table ids, draw-code catalog incl. the
 * healing-potion pair quantity, quest tables) plus the established exports.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	GRANT_LOOT_ACTION_LOCAL_ID as GENERIC_ACTION_LOCAL_ID,
	grantLootActionLocalId as genericActionLocalId,
	grantLootCapability as genericCapability,
	decideBossLootDrop as genericDecideBoss,
	decideQuestLootGrant as genericDecideQuest,
	displayNameForLootEntityDef as genericDisplayName,
	renderGrantLootCalls as genericRender,
	grantLootCapabilityId,
	type LootDropConfig,
	type LootDropDecision,
	lootDropTraceKind,
	lootTableId,
} from "@spellkave/adventure-runtime/dm/loot";
import { KAVEMOUTH_HOST_ACT } from "./host-act-config.ts";

const LOOT_CODES = {
	longswordPlus1: 20,
	potionHealingPair: 30,
	potionHeroism: 40,
} as const;

export const GRANT_LOOT_ACTION_LOCAL_ID = GENERIC_ACTION_LOCAL_ID;
export const GRANT_LOOT_CAPABILITY_ID = grantLootCapabilityId(KAVEMOUTH_HOST_ACT);
export const LOOT_DROP_TRACE_KIND = lootDropTraceKind(KAVEMOUTH_HOST_ACT);

/** Q4 fanatic boss table id in the srd bundle. */
export const Q4_FANATIC_LOOT_TABLE_ID = lootTableId("loot/boss/q4-fanatic");
export const Q3_REWARD_LOOT_TABLE_ID = lootTableId("loot/quest/q3-reward");
export const Q10_REWARD_LOOT_TABLE_ID = lootTableId("loot/quest/q10-reward");

/** Deterministic representative draw for offline/live proofs (longsword +1). */
export const Q4_FANATIC_PROOF_LOOT_CODE = LOOT_CODES.longswordPlus1;
export const Q4_FANATIC_PROOF_ENTITY_DEF = "srd/magic_item/longsword-plus-1";

/** Quest id → loot table id for host-side terminal draws (Q3/Q10). */
export const QUEST_LOOT_TABLE_BY_ID: Readonly<Record<string, string>> = {
	Q3: Q3_REWARD_LOOT_TABLE_ID,
	Q10: Q10_REWARD_LOOT_TABLE_ID,
};

/** Deterministic representative codes for offline/host proof (not a die roll). */
export const QUEST_LOOT_PROOF_CODE_BY_ID: Readonly<Record<string, number>> = {
	Q3: LOOT_CODES.potionHealingPair,
	Q10: LOOT_CODES.potionHeroism,
};

/** The kavemouth loot config: host-act values + draw-code catalog. */
export const KAVEMOUTH_LOOT: LootDropConfig = {
	...KAVEMOUTH_HOST_ACT,
	catalog: {
		[LOOT_CODES.longswordPlus1]: { entityDefId: Q4_FANATIC_PROOF_ENTITY_DEF },
		[LOOT_CODES.potionHealingPair]: { entityDefId: "srd/item/potion-of-healing", quantity: 2 },
		[LOOT_CODES.potionHeroism]: { entityDefId: "srd/magic_item/potion-of-heroism" },
	},
	questLootTableById: QUEST_LOOT_TABLE_BY_ID,
	questLootProofCodeById: QUEST_LOOT_PROOF_CODE_BY_ID,
};

export function grantLootCapability(): VerbCall[] {
	return genericCapability(KAVEMOUTH_HOST_ACT);
}

export const grantLootActionLocalId = genericActionLocalId;

/** Runtime delta: place the item and inscribe the loot notice (see `dm/loot`). */
export function renderGrantLootCalls(args: {
	eventId: string;
	entityDefId: string;
	atNodeId: string;
	itemEntityKey: string;
	displayName: string;
	quantity?: number;
}): VerbCall[] {
	return genericRender(KAVEMOUTH_HOST_ACT, args);
}

export type { LootDropDecision };

/** Offline decision helper — proof path uses the deterministic Q4 code. */
export function decideBossLootDrop(args: {
	tableId: string;
	/** When set, force this code (live/offline representative). */
	forcedCode?: number;
	drawnCode?: number;
}): LootDropDecision {
	return genericDecideBoss(KAVEMOUTH_LOOT, args);
}

export const displayNameForLootEntityDef = genericDisplayName;

/**
 * Quest-terminal loot decision (same accept+terminal latch as quest XP).
 * Host draws a table code (or uses the proof forced code) and places the item.
 */
export function decideQuestLootGrant(args: {
	questId: string;
	/** True when accept + terminal satisfied and loot not yet granted. */
	terminalReady: boolean;
	alreadyGranted: boolean;
	/** Override for deterministic offline/live proof. */
	forcedCode?: number;
	drawnCode?: number;
}): LootDropDecision {
	return genericDecideQuest(KAVEMOUTH_LOOT, args);
}
