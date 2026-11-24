/** Pure advancement plans. Definitions and phase grants are authored at build time. */
import { classCreationDataBySlug } from "../data/index.ts";
import type { ActStep } from "../lib/act-port.ts";
import { advancementAct } from "../lib/dm-act-plan.ts";

/** Source bound shared by runtime checks and the offline carrier capture. */
export const LEVEL_UP_CLASS_GRANT_BOUNDS = { minimum: 1, maximum: 20 } as const;

export function levelUpDraftActs(targetId: string, open: boolean): ActStep[] {
	return [{ targetId, actionId: `dm/act/level-up/${open ? "open" : "close"}`, args: {} }];
}

/** Class grant act; the seat caller retains its existing ceremony-first ordering.
 * See create-dm-seat.ts:748-751 and ADR-0096 D-5 backlog;
 * ledger/designs/dm-advancement.md.
 */
export function levelUpClassActs(targetId: string, classSlug: string, level: number): ActStep[] {
	classCreationDataBySlug(classSlug);
	if (
		!Number.isInteger(level) ||
		level < LEVEL_UP_CLASS_GRANT_BOUNDS.minimum ||
		level > LEVEL_UP_CLASS_GRANT_BOUNDS.maximum
	)
		throw new Error(
			`An advancement level must belong to the authored ${LEVEL_UP_CLASS_GRANT_BOUNDS.minimum}..${LEVEL_UP_CLASS_GRANT_BOUNDS.maximum} ladder.`,
		);
	return [advancementAct(targetId, classSlug, level)];
}
