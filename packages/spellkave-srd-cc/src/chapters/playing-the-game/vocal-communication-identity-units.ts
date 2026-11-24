// DOC-IMPL: capabilities-and-identity#speech-requires-a-communication-modality
// DOC-IMPL: speech-and-traces#who-may-speak
// DOC-IMPL: tags-and-ids#tags-can-be-live-identity-not-only-metadata
/**
 * The actor-side identity bridge for ordinary spoken communication.
 *
 * `srd.creature` deliberately stays the target niche used to answer “who may
 * be addressed?” It cannot answer “can this actor produce speech?”: SRD
 * creatures include silent beasts, understands-only monsters, and creatures
 * that communicate through a different modality. Language tags answer a
 * third question — which language the body knows — and therefore do not
 * grant speech either.
 *
 * A definition carries `srd.communication.vocal` only when its source or
 * scenario authorship establishes a usable vocal modality. The tag grants
 * the single shipped Speak capability; the speech verbs retain their own
 * target, place-attachment, and trace constraints.
 */
import { BUNDLE_ID } from "./constants";

export const VOCAL_COMMUNICATION_TAG = "srd.communication.vocal";
export const SPEAK_CAPABILITY_ID = `${BUNDLE_ID}/action/communicate/speak`;

export interface VocalCommunicationCapabilityGrantUnit {
	tag: string;
	capabilityId: string;
	rationale: string;
}

export function buildVocalCommunicationCapabilityGrantUnits(): VocalCommunicationCapabilityGrantUnit[] {
	return [
		{
			tag: VOCAL_COMMUNICATION_TAG,
			capabilityId: SPEAK_CAPABILITY_ID,
			rationale:
				"A sourced or authored vocal modality entitles the actor to attempt speech; creature identity and language competence alone do not.",
		},
	];
}

export function buildVocalCommunicationCapabilityGrantRows(): {
	tag: string;
	capability_id: string;
	bundle_id: string;
}[] {
	return buildVocalCommunicationCapabilityGrantUnits().map((unit) => ({
		tag: unit.tag,
		capability_id: unit.capabilityId,
		bundle_id: BUNDLE_ID,
	}));
}
