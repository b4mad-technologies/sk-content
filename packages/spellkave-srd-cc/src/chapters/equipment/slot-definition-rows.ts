import { BUNDLE_ID } from "../playing-the-game/constants";
import {
	CHEST_SLOT_LABEL,
	CHEST_SLOT_LOCAL_ID,
	MAIN_HAND_SLOT_LABEL,
	MAIN_HAND_SLOT_LOCAL_ID,
	OFF_HAND_SLOT_LABEL,
	OFF_HAND_SLOT_LOCAL_ID,
} from "./armor-units";

/** One catalog for emitted equipment definitions and isolated validation context. */
export function equipmentSlotDefinitionRows() {
	return [
		[CHEST_SLOT_LOCAL_ID, CHEST_SLOT_LABEL],
		[MAIN_HAND_SLOT_LOCAL_ID, MAIN_HAND_SLOT_LABEL],
		[OFF_HAND_SLOT_LOCAL_ID, OFF_HAND_SLOT_LABEL],
	].map(([id, label]) => ({
		slot_id: `${BUNDLE_ID}/${id}`,
		bundle_id: BUNDLE_ID,
		label,
		default_compatibility_predicate: "true",
	}));
}
