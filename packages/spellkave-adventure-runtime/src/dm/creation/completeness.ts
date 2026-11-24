/** Pure identity vocabulary shared by runtime creation and build-time fixtures. */
import {
	BACKGROUND_TAG_PREFIX,
	CLASS_TAG_PREFIX,
	PARTY_HEROES_TAG,
	SPECIES_TAG_PREFIX,
} from "../../srd-ids.ts";
import type { VerbCall } from "../lib/scene-driver.ts";
export const PARTY_FACTION_TAG = "srd.faction.party";
export const PARTY_TAG = PARTY_HEROES_TAG;
export const PARTY_ID = PARTY_TAG;
export interface CreationStarterKit {
	bundleId: string;
	bundleHeaderCall: () => VerbCall;
	starterKitDefinitions: () => VerbCall[];
	heroWeaponDefId: string;
	heroWeaponSlotId: string;
	fieldKitDefId: string;
	torchDefId: string;
	rationsDefId: string;
}

export function classIdentityTag(slug: string): string {
	return `${CLASS_TAG_PREFIX}.${slug}`;
}
export function speciesIdentityTag(slug: string): string {
	return `${SPECIES_TAG_PREFIX}.${slug}`;
}
export function backgroundIdentityTag(slug: string): string {
	return `${BACKGROUND_TAG_PREFIX}.${slug}`;
}
export function partySightCapabilityId(bundleId: string): string {
	return `${bundleId}/party/sight`;
}
