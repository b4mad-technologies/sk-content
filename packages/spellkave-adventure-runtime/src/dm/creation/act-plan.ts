/** Pure creation plans: bodies are runtime IDs and vocabulary is authored once. */

import { classCreationDataBySlug } from "../data/index.ts";
import { dialogMenuAct } from "../dialog/prompt-offer.ts";
import type { ActStep } from "../lib/act-port.ts";
import { advancementAct } from "../lib/dm-act-plan.ts";

export function creationClassActs(targetId: string, classSlug: string): ActStep[] {
	classCreationDataBySlug(classSlug);
	return [
		{
			targetId,
			actionId: "srd/dm/identify/class",
			args: { definition_ref: `srd.class.${classSlug}` },
		},
		advancementAct(targetId, classSlug, 1),
	];
}

export const CREATION_PENDING_FIELDS = ["scores", "name", "appearance", "backstory"] as const;
export type CreationPendingField = (typeof CREATION_PENDING_FIELDS)[number];
export type CreationPendingFlags = Readonly<Record<CreationPendingField, boolean>>;

/** The vessel condition each pending open/close act applies or removes. */
export function creationPendingConditionId(field: CreationPendingField): string {
	return `dm/creation/pending/${field}`;
}

/**
 * Open or close each pending handle. With `observedOpen` (the vessel's
 * delivered pending conditions), a field already in its wanted state sends no
 * act: each act costs a reducer plus a claim release, and resending all four
 * on every answer was ~40% of creation seat time (sk-jay0.3.24.138).
 */
export function creationPendingActs(
	targetId: string,
	pending: CreationPendingFlags,
	confirmed: boolean,
	observedOpen?: CreationPendingFlags,
): ActStep[] {
	return CREATION_PENDING_FIELDS.flatMap((field) => {
		const open = !confirmed && pending[field];
		if (observedOpen !== undefined && observedOpen[field] === open) return [];
		return [
			{
				targetId,
				actionId: `dm/act/creation/pending/${field}/${open ? "open" : "close"}`,
				args: {},
			},
		];
	});
}

export function creationMenuAct(
	targetId: string,
	question: string,
	labels: readonly string[],
): ActStep {
	return dialogMenuAct(targetId, question, labels);
}
