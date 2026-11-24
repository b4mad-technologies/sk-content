/**
 * The DM persona as a PARAMETER of the generic level-up shell. The persona
 * names the three things the shell used to hard-wire to Aldwin: the tag the
 * DM niche predicate reads, the DM niche id, and the DM-carried
 * level-up-applied latch resource. {@link ALDWIN_PERSONA} reproduces today's
 * persisted ids byte-for-byte and is the default everywhere a persona is
 * accepted; no second DM is authored anywhere (operator decision 2026-10-08).
 */

import { DM_NPC_ALDWIN_TAG } from "../../srd-ids.ts";
import {
	ALDWIN_LEVEL_UP_APPLIED_RESOURCE_ID,
	ALDWIN_LEVEL_UP_APPLIED_RESOURCE_LOCAL_ID,
	ALDWIN_NICHE_ID,
	ALDWIN_NICHE_LOCAL_ID,
	DM_BUNDLE,
} from "./ids.ts";

export interface DmPersona {
	/** Name as it appears in rendered display names and descriptions. */
	readonly name: string;
	/** Persona tag the DM niche predicate reads and the DM instance carries. */
	readonly tag: string;
	readonly nicheLocalId: string;
	/** Fully qualified DM niche id (`${DM_BUNDLE}/${nicheLocalId}`). */
	readonly nicheId: string;
	readonly levelUpAppliedResourceLocalId: string;
	/** Fully qualified id of the DM-carried last-applied-level latch. */
	readonly levelUpAppliedResourceId: string;
}

/** Derive a persona from a lower-case slug (`niche/<slug>`, `<slug>/level-up-applied`). */
export function defineDmPersona(params: {
	readonly name: string;
	readonly tag: string;
	readonly slug: string;
}): DmPersona {
	const nicheLocalId = `niche/${params.slug}`;
	const levelUpAppliedResourceLocalId = `${params.slug}/level-up-applied`;
	return {
		name: params.name,
		tag: params.tag,
		nicheLocalId,
		nicheId: `${DM_BUNDLE}/${nicheLocalId}`,
		levelUpAppliedResourceLocalId,
		levelUpAppliedResourceId: `${DM_BUNDLE}/${levelUpAppliedResourceLocalId}`,
	};
}

/** The default persona: today's ids, taken from the legacy constants. */
export const ALDWIN_PERSONA: DmPersona = {
	name: "Aldwin",
	tag: DM_NPC_ALDWIN_TAG,
	nicheLocalId: ALDWIN_NICHE_LOCAL_ID,
	nicheId: ALDWIN_NICHE_ID,
	levelUpAppliedResourceLocalId: ALDWIN_LEVEL_UP_APPLIED_RESOURCE_LOCAL_ID,
	levelUpAppliedResourceId: ALDWIN_LEVEL_UP_APPLIED_RESOURCE_ID,
};
