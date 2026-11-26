/**
 * Hesper's telepathy stone, gift and authored bond activation. The command
 * capability reaches Hesper through kavemouth.companion.bond while the
 * condition applied by author/dm-acts.ts is admitted. Stone possession and
 * the hero/companion recorded markers independently gate commands.
 * Hesper keeps her placed body and identity. The hero starts without this
 * reach. Aldwin records it through acts and receipts, without a runtime delta.
 * Legacy grant/latch exports remain build-time test-scene composition helpers.
 */

import {
	type CompanionBondConfig,
	companionBondActions,
	companionBondDefinitions,
	companionBondIds,
	renderCompanionBondGrant as genericBondGrant,
	renderCompanionBondLatch as genericBondLatch,
} from "@spellkave/adventure-runtime/dm/companion-bond";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { KAVEMOUTH_HOST_ACT } from "./host-act-config.ts";
import { ADVENTURE_CANDIDATE_ENTITY_KEY } from "./lib/entity-keys.ts";
import { STORYLINE_NPC_KEYS } from "./quests.ts";

/** The kavemouth bond config: host-act values + Hesper, the stone and its copy. */
export const KAVEMOUTH_BOND: CompanionBondConfig = {
	...KAVEMOUTH_HOST_ACT,
	companionEntityKey: STORYLINE_NPC_KEYS.hesper,
	companionName: "Hesper",
	heroEntityKey: ADVENTURE_CANDIDATE_ENTITY_KEY,
	stoneName: "telepathy stone",
	ledgerName: "hearth-ledger",
	stoneEntityTypeLocalId: "adventure/item/telepathy_stone",
	copy: {
		stoneItemDescription:
			"A smooth river-stone strung on a leather cord, faintly warm. Hesper pressed " +
			"it into your hand: keep it on you, and she can hear you across any " +
			"distance — Aldwin keeps the bond in his hearth-ledger.",
		giftActionDescription:
			"Hesper hands the hero her telepathy stone — one smooth river-stone that " +
			"carries a voice across any distance once Aldwin records the bond.",
	},
};

const IDS = companionBondIds(KAVEMOUTH_BOND);

/** Fully-qualified entity_def id of the telepathy stone. */
export const STONE_DEF_ID = IDS.stoneDefId;
/** Possession as a DSL affordance predicate (KEY A is retired, sk-vjh.7). */
export const STONE_POSSESSION_PREDICATE = IDS.stonePossessionPredicate;
/** Key B — reach (Aldwin's bonded party extent). */
export const COMMAND_BOND_CAPABILITY_ID = IDS.commandBondCapabilityId;
/** Hesper's may-do for the gift dispatch. */
export const STONE_GIVER_CAPABILITY_ID = IDS.stoneGiverCapabilityId;
/** Aldwin's may-do for the bond latch write. */
export const RECORD_BOND_CAPABILITY_ID = IDS.recordBondCapabilityId;
/** Hero-side marker: Hesper's gift landed (gift consequence writes 1). */
export const STONE_CARRIED_RESOURCE = IDS.stoneCarriedResource;
/** Hero-side marker: Aldwin recorded the bond (latch consequence writes 1). */
export const BOND_RECORDED_RESOURCE = IDS.bondRecordedResource;
/** COMPANION-side marker: the same latch, on the companion's own body
 * (sk-jay0.1.23.12) — a seat always perceives its own state. */
export const COMPANION_BONDED_RESOURCE = IDS.companionBondedResource;
/** The gift action id (dispatched by Hesper toward the hero at her join). */
export const GIFT_STONE_ACTION_ID = IDS.giftStoneActionId;
/** The membership tag B's party extent resolves (bond-private on purpose). */
export const COMPANION_BOND_TAG = IDS.companionBondTag;

/** Seed-time definitions: capabilities, markers, the stone item, grants. */
export function companionStoneDefinitions(): VerbCall[] {
	return companionBondDefinitions(KAVEMOUTH_BOND);
}

/** Seed-time actions: the gift verb and Hesper's bond tag. */
export function companionStoneActions(): VerbCall[] {
	return companionBondActions(KAVEMOUTH_BOND, { seedHeroMarkers: false });
}

/**
 * Publisher-time condition extent rule: the hero derives command reach
 * over `kavemouth.companion.bond` while the authored bond condition is active.
 * Aldwin activates that condition through the bond act; no runtime apply.
 */
export function renderCompanionBondGrant(): VerbCall[] {
	return genericBondGrant(KAVEMOUTH_BOND);
}

/**
 * Publisher composition compatibility: a literal-reference latch action.
 * Production Aldwin instead dispatches fixed record-bond and mark-bonded acts
 * from author/dm-acts.ts. This helper retains caller-selected hero/companion
 * references for explicitly authored test scenes.
 */
export function renderCompanionBondLatch(args: {
	heroEntityId: string;
	/** The companion whose own body carries {@link COMPANION_BONDED_RESOURCE}. */
	companionEntityId: string;
	actionLocalId: string;
}): VerbCall[] {
	return genericBondLatch(KAVEMOUTH_BOND, args);
}
