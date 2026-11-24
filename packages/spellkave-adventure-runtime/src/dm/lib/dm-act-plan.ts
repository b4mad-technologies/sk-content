/** Authored ADR-0155 act ids shared by runtime plans and build-time templates. */
import type { ActStep } from "./act-port.ts";

export function featureTag(capabilityId: string): string {
	return `srd.feature.${capabilityId.replaceAll("/", ".")}`;
}
export function setStateAct(targetId: string, stateId: string, value: number): ActStep {
	if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
		throw new Error(`DM state '${stateId}' cannot be represented by the quantity wire: ${value}`);
	}
	return {
		targetId,
		actionId: `srd/dm/${value === 0 ? "clear" : "set"}/${stateId.replaceAll("/", ".")}`,
		args: value === 0 ? {} : { quantity: value },
	};
}
export function trainAct(targetId: string, kind: string, capabilityId: string): ActStep {
	return {
		targetId,
		actionId: `srd/dm/train/${kind}`,
		args: { definition_ref: featureTag(capabilityId) },
	};
}
export function advancementAct(targetId: string, classSlug: string, level: number): ActStep {
	return {
		targetId,
		actionId: `srd/dm/advance/${classSlug}`,
		args: { definition_ref: `srd.advancement.${classSlug}.${level}` },
	};
}
