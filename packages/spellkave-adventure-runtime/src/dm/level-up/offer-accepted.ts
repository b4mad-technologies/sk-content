/** Seed-time definition of dm/level-up/offer-accepted. The shared DM author
 * consumes this leaf; runtime grants and state updates reference its seeded id.
 */

import { buildMarkerResource } from "../lib";
import type { VerbCall } from "../lib/scene-driver.ts";
import {
	DM_BUNDLE,
	LEVEL_UP_OFFER_ACCEPTED_NONE,
	LEVEL_UP_OFFER_ACCEPTED_RESOURCE_LOCAL_ID,
	LEVEL_UP_OFFER_ACCEPTED_YES,
} from "./ids";

export function offerAcceptedResourceCall(): VerbCall {
	return buildMarkerResource({
		bundle: DM_BUNDLE,
		localId: LEVEL_UP_OFFER_ACCEPTED_RESOURCE_LOCAL_ID,
		displayName: "Level-Up Offer Accepted",
		description:
			"sk-0m4.19 consent latch: 0 = not accepted (also the decline write), 1 = the hero accepted " +
			"Aldwin's proactive offer. TARGET-carried on the trainee. Seeded in the dm bundle so the " +
			"kavemouth hearth-return action can ModifyResource it; level-up/enroll still materialises " +
			"the object_state row; the into-limbo teleport gates on 1; the hearth return clears it.",
		minValue: LEVEL_UP_OFFER_ACCEPTED_NONE,
		maxValue: LEVEL_UP_OFFER_ACCEPTED_YES,
		initialValue: LEVEL_UP_OFFER_ACCEPTED_NONE,
	}).call;
}
