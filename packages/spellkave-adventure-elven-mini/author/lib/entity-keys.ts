/**
 * Adventure entity keys and node ids used at both seed and run time.
 * Leaf module: no srd-cc chapter imports (sk-jay0.7.21 / ADR-0115).
 */
import { asEntityRef } from "@spellkave/sdk";
import { STORYLINE_NPC_KEYS } from "../quests.ts";
import { BUNDLE, GRAPHS, nodeId } from "./ids.ts";

export const ALDWIN_KEY_PREFIX = "adventure/npc/aldwin";
export const ALDWIN_ENTITY_KEY = asEntityRef(`${BUNDLE}/${ALDWIN_KEY_PREFIX}_1`);
export const ALDWIN_PLACE_NODE_ID = nodeId(GRAPHS.inn, "common_room");
export const ALDWIN_DISPLAY_NAME = "Aldwin, keeper of the hearth-ledger";
export const ALDWIN_CREATION_DM_BINDING_ID = `${BUNDLE}/aldwin-creation-dm`;
export const ALDWIN_ADVANCEMENT_DM_BINDING_ID = `${BUNDLE}/aldwin-advancement-dm`;
export const ALDWIN_AUTHOR_BINDING_ID = `${BUNDLE}/aldwin-author`;
export const CALL_INITIATIVE_ACTION_LOCAL_ID = "dm/call-initiative";
export const CALL_INITIATIVE_ACTION_ID = `${BUNDLE}/${CALL_INITIATIVE_ACTION_LOCAL_ID}`;

export const ADVENTURE_HERO_KEY_PREFIX = "adventure/hero";
export const ADVENTURE_HERO_ENTITY_KEY = `${BUNDLE}/${ADVENTURE_HERO_KEY_PREFIX}_1`;
export const ADVENTURE_HERO_WAKE_NODE_ID = nodeId(GRAPHS.inn, "loft");

export const CREATION_LIMBO_NODE_ID = nodeId(GRAPHS.creation_limbo, "station");
export const ADVANCEMENT_LIMBO_NODE_ID = nodeId(GRAPHS.advancement_limbo, "station");

export const INNKEEPER_KEY_PREFIX = "adventure/innkeeper";
export const INNKEEPER_ENTITY_KEY = `${BUNDLE}/${INNKEEPER_KEY_PREFIX}_1`;

export const WARDEN_KEY_PREFIX = "adventure/npc/crypt_warden";
export const WARDEN_ENTITY_KEY = asEntityRef(`${BUNDLE}/${WARDEN_KEY_PREFIX}_1`);
export const CRYPT_FIGHT_SESSION_DEF_LOCAL_ID = "adventure/session/crypt-fight";
export const CRYPT_FIGHT_SESSION_DEF_ID = `${BUNDLE}/${CRYPT_FIGHT_SESSION_DEF_LOCAL_ID}`;

export const ROGUE_COMPANION_ENTITY_KEY = asEntityRef(`${BUNDLE}/adventure/npc/rogue_companion_1`);

export const COMPANION_ENTITY_KEYS = {
	rogue: ROGUE_COMPANION_ENTITY_KEY,
	hesper: STORYLINE_NPC_KEYS.hesper,
	caddoc: STORYLINE_NPC_KEYS.caddoc,
} as const;

export const INDUCT_ACTION_LOCAL_ID = "dm/induct-candidate";
export const INDUCT_ACTION_ID = `${BUNDLE}/${INDUCT_ACTION_LOCAL_ID}`;

export const TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID = "dm/teleport-into-advancement-limbo";
export const TELEPORT_INTO_LIMBO_ACTION_ID = `${BUNDLE}/${TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID}`;
export const RETURN_FROM_LIMBO_ACTION_LOCAL_ID = "dm/return-from-advancement-limbo";
export const RETURN_FROM_LIMBO_ACTION_ID = `${BUNDLE}/${RETURN_FROM_LIMBO_ACTION_LOCAL_ID}`;

/** Legacy authored candidate key for fixture/config callers; live heroes are world-owned. */
export const ADVENTURE_CANDIDATE_ENTITY_KEY = asEntityRef("elven_mini/adventure/candidate_1");
