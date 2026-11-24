// pattern: computed-literal
/**
 * `dm/host-act` — the shared builder behind every DM "host act": a self-only
 * runtime action the NPC host renders and dispatches on the DM's own body
 * (kill XP, quest XP, loot, the companion-bond latch).
 *
 * WHY ONE BUILDER: all four acts share the same envelope (a `define_action`
 * verb call, `self_eligible`/`self_only`, entity-provided creature niche,
 * zero cost) and differ only in capability, copy, optional predicate and the
 * consequence's frame writes. Keeping the envelope in one place stops the
 * four renderers drifting apart. Param key ORDER is part of the contract:
 * rendered TOML must stay byte-stable (MF-APPLY-012 digest dedup).
 *
 * Ids derive from the config's `bundle` (`${bundle}/dm/...`); only the
 * TypeScript symbol names are generic. DM seat elevation or privilege is
 * NEVER read from this config — it stays an operator-authored fixture row
 * (ADR-0103); `dmEntityKey` only names the holder of the may-do capability.
 */

import { DEFINE_ACTION_VERB_TOOL } from "@spellkave/tool-authoring";
import { CREATURE_NICHE_TAG } from "../../srd-ids.ts";
import { buildCapabilityGrant, type VerbCall } from "../lib/index.ts";

/** What every host-act renderer needs to know about the adventure and its DM. */
export interface HostActConfig {
	/** Adventure bundle id, e.g. `elven_mini`. Owns every rendered row. */
	readonly bundle: string;
	/** Manifest entity key of the DM seat that holds the may-do capabilities. */
	readonly dmEntityKey: string;
	/** The DM's name as it appears in authored descriptions (and, lowercased,
	 * in grant labels). Required: no neutral default would match any story. */
	readonly personaName: string;
	/** The adventure's bundle-header call, prepended to every runtime delta so
	 * a verb-layer scaffold cannot clobber `depends_on` (it is adventure
	 * authored: depends_on, tag prefixes, attribution). */
	readonly bundleHeader: () => VerbCall;
}

/** Lowercase, hyphenated form of the DM's name for grant labels. */
export function personaSlug(personaName: string): string {
	return personaName.toLowerCase().replace(/\s+/g, "-");
}

/** `spellkave_write_rows` capability definition for a may-do capability. */
export function dmCapabilityDefinition(spec: {
	bundle: string;
	label: string;
	capabilityId: string;
	displayName: string;
	description: string;
}): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: spec.label,
		params: {
			bundle: spec.bundle,
			kind: "capability_definitions",
			rows: [
				{
					actor_kind: "entity",
					bundle_id: spec.bundle,
					capability_id: spec.capabilityId,
					default_visibility: "Public",
					description: spec.description,
					display_name: spec.displayName,
				},
			],
		},
	};
}

/** The grant of one may-do capability to the DM seat (source = the bundle). */
export function dmCapabilityGrant(
	cfg: HostActConfig,
	spec: { capabilityId: string; label: string },
): VerbCall {
	return {
		...buildCapabilityGrant({
			bundle: cfg.bundle,
			actorEntityKey: cfg.dmEntityKey,
			capabilityId: spec.capabilityId,
			source: cfg.bundle,
		}),
		label: spec.label,
	};
}

/** The consequence of a host act: a description plus literal frame writes. */
export interface HostActConsequence {
	readonly description: string;
	// biome-ignore lint/suspicious/noExplicitAny: frame writes are opaque authored rows
	readonly frame_writes: readonly any[];
}

/**
 * The shared host-act action verb call: self-eligible, self-only, creature
 * niche, zero cost. `predicateSource` (when set) lands between `self_only`
 * and `cost_time_ms`, matching the original quest-xp key order.
 */
export function dmHostActAction(
	cfg: Pick<HostActConfig, "bundle">,
	spec: {
		actionLocalId: string;
		requiredCapability: string;
		displayName: string;
		description: string;
		predicateSource?: string;
		consequence: HostActConsequence;
	},
): VerbCall {
	return {
		toolName: DEFINE_ACTION_VERB_TOOL,
		label: `action:${spec.actionLocalId}`,
		params: {
			bundle: cfg.bundle,
			id: spec.actionLocalId,
			required_capability: spec.requiredCapability,
			niche_id: CREATURE_NICHE_TAG,
			display_name: spec.displayName,
			description: spec.description,
			self_eligible: true,
			self_only: true,
			...(spec.predicateSource === undefined ? {} : { predicate_source: spec.predicateSource }),
			cost_time_ms: 0,
			consequence: spec.consequence,
		},
	};
}
