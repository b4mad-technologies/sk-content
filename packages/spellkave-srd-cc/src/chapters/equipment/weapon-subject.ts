import { BUNDLE_ID } from "../playing-the-game/constants";
import { MAIN_HAND_SLOT_LOCAL_ID } from "./armor-units";

// ADR-0126: shared weapon gates and consequences select the same authored slot.
// Slot vocabulary belongs to this ruleset, never to the kernel resolver.
export const WEAPON_SUBJECT = `actor.equipped_item('${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}')`;
