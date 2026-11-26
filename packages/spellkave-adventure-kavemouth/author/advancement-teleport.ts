// pattern: proactive-level-up
/**
 * Advancement teleport (sk-0m4.19) - kavemouth binding. The mechanism (the
 * two DM-owned sibling actions that carry a level-1+ hero INTO the advancement
 * limbo and, after the wizard, back to a fixed return place) lives in
 * `@spellkave/adventure-runtime/dm/watches`; this file only names the story:
 * Aldwin, the limbo node and the inn hearth return.
 *
 * Return destination is FIXED for v1 (the inn hearth / common_room). The
 * action ids are `TELEPORT_INTO_LIMBO_ACTION_ID` / `RETURN_FROM_LIMBO_ACTION_ID`
 * in `./lib/entity-keys.ts`.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	type AdvancementTeleportConfig,
	advancementTeleport as dmAdvancementTeleport,
} from "@spellkave/adventure-runtime/dm/watches";
import { ADVANCEMENT_LIMBO_NODE_ID } from "./advancement-limbo.ts";
import { ALDWIN_ENTITY_KEY, ALDWIN_PLACE_NODE_ID } from "./dm-npc.ts";
import { BUNDLE } from "./lib/ids.ts";

/** Fixed v1 return destination - the inn hearth Aldwin already keeps. */
export const ADVANCEMENT_RETURN_NODE_ID = ALDWIN_PLACE_NODE_ID;

export const ADVANCEMENT_TELEPORT_CONFIG: AdvancementTeleportConfig = {
	bundle: BUNDLE,
	dmEntityKey: ALDWIN_ENTITY_KEY,
	personaName: "Aldwin",
	limboNodeId: ADVANCEMENT_LIMBO_NODE_ID,
	returnNodeId: ADVANCEMENT_RETURN_NODE_ID,
	returnPlaceName: "the inn hearth",
};

export function advancementTeleport(): VerbCall[] {
	return dmAdvancementTeleport(ADVANCEMENT_TELEPORT_CONFIG);
}
