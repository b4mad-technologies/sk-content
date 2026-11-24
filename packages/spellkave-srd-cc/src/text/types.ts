/** One extracted SRD 5.2.1 prose block with its cache/ pointer. */
export interface ExtractedSrdText {
	/** Verbatim source wording after whitespace-only normalisation. */
	text: string;
	/** `cache/markdown/<file>.md:<start>-<end>` or `cache/open5e/<file>.json pk=<pk>`. */
	source: string;
}

export const SRD_TEXT_NAMESPACE = "srd.text";
export const SRD_TEXT_LICENSE = "CC-BY-4.0";
export const SRD_TEXT_AUDIENCE = "public";
export const SRD_TEXT_BUNDLE_ID = "srd";

export type SrdTextTargetKind =
	| "entity_definition"
	| "item_definition"
	| "resource_definition"
	| "affordance_template"
	| "entity"
	| "place_graph"
	| "place_node"
	| "place_edge";
